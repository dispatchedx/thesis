import json
import logging
import requests
import time
import random
from scripts.scrapers.scraper_helpers import (
    fetch_with_retry,
    str_to_float,
    calculate_discount,
    write_to_json,
    upload_scraped_products,
)
from scripts.logging_config import get_logger

logger = get_logger("ab")


def scrape_ab(logger=logger, starting_page=1, max_page=200, starting_category="001", ending_category="014") -> list:
    MAX_PAGE_LIMIT = max_page  # Max page limit per category
    all_products = []  # Products list that will eventually go into DB

    api_url = "https://www.ab.gr/api/v1/"
    base_url = "https://www.ab.gr"

    # cached/hardcoded hash
    current_hash = "c5bf48545cb429dfbcbdd337dc33dc4c3b82565ec95d29a88113cdb308ea560a"

    # Loop through categories 001-014
    start_cat_num = int(starting_category)
    end_cat_num = int(ending_category)

    for category_num in range(start_cat_num, end_cat_num + 1):
        category = f"{category_num:03d}"  # Format as 001, 002, etc.

        next_page = starting_page
        total_pages = 50  # Will be updated from API response
        category_products = []

        while next_page <= total_pages:
            # Define GraphQL variables and extensions
            variables = {
                "lang": "gr",
                "searchQuery": "",
                "category": category,
                "pageNumber": next_page,
                "pageSize": 20,
                "filterFlag": True,
                "fields": "PRODUCT_TILE",
                "plainChildCategories": True,
            }

            extensions = {
                "persistedQuery": {
                    "version": 1,
                    "sha256Hash": current_hash,
                }
            }

            # Build query parameters
            params = {
                "operationName": "GetCategoryProductSearch",
                "variables": json.dumps(variables),
                "extensions": json.dumps(extensions),
            }

            headers = {
                "Accept": "application/json",
                "Accept-Language": "en-US,en;q=0.9",
                "Content-Type": "application/json",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            }

            # Hard limit on # of pages scraped in case something bad happens
            if next_page > MAX_PAGE_LIMIT:
                logger.warning(f"Hit MAX_PAGE_LIMIT of {MAX_PAGE_LIMIT} Moving to next category.")
                break

            # Delay so that we dont overload the server and/or get banned
            time.sleep(random.uniform(5.8, 7.9))

            # Send it!
            try:
                response = fetch_with_retry(requests.get(api_url, params=params, headers=headers))
            except RuntimeError as e:
                logger.error(f"Scraper failed for {__name__}: {e}")
                raise

            # Load data batch
            response_data = json.loads(response.content)

            # Check for persisted query errors
            if "errors" in response_data.keys():
                error_messages = [error.get("message", "") for error in response_data["errors"]]

                # Check if it's a persisted query error
                if any("PersistedQueryNotFound" in msg or "persisted query" in msg.lower() for msg in error_messages):
                    logger.error("Persisted query not found. Please update hash ...")
                else:
                    # Other GraphQL errors
                    logger.error(f"GraphQL error: {response_data['errors']}")
                    raise RuntimeError(f"GraphQL request failed: {response_data['errors']}")

            # Extract products and pagination info
            search_results = response_data["data"]["categoryProductSearch"]
            products_data = search_results["products"]
            pagination = search_results["pagination"]
            total_pages = pagination["totalPages"]

            logger.info(f"Scraping page {next_page}..")

            # If no products found, break early
            if not products_data:
                logger.info(f"No products found. Moving to next category.")
                break

            # Load each product's data
            for data in products_data:
                if not data.get("price"):
                    logging.warning(
                        f'Skipping product due to invalid prices: {data["name"]}, {base_url + data["url"]} | full data: {data} '
                    )
                    continue
                # Convert prices to floats
                regular_price = str_to_float(data["price"]["unitPriceFormatted"])
                discounted_price = str_to_float(data["price"]["discountedPriceFormatted"])

                if regular_price is None or discounted_price is None:
                    logging.warning(
                        f'Skipping product due to invalid prices: {data["name"]}, {base_url + data["url"]} '
                    )
                    continue
                if discounted_price > regular_price:
                    discounted_price = str_to_float(str(data["price"]["unitPrice"]))

                price_per_kg = str_to_float(data["price"]["supplementaryPriceLabel1"])
                discounted_price_per_kg = str_to_float(data["price"]["discountedUnitPriceFormatted"])
                if discounted_price == regular_price:
                    discounted_price_per_kg = price_per_kg

                # Handle potential promotions (might not exist for all products)
                sale_tag = ""
                if data.get("potentialPromotions") and len(data["potentialPromotions"]) > 0:
                    sale_tag = data["potentialPromotions"][0]["title"]

                # Calculate discount %
                discount_percentage = calculate_discount(regular_price, discounted_price)

                # Handle images
                img_full_src = (
                    base_url + data["images"][1]["url"] if data["images"] and len(data["images"]) > 1 else None
                )
                img_thumbnail_src = base_url + data["images"][0]["url"] if data["images"] else None

                # fmt: off
                product = {
                    "name":                     data["manufacturerName"] + " " + data["name"],
                    "link":                     base_url + data["url"],
                    "sale_tag":                 sale_tag,
                    "regular_price":            regular_price,
                    "discounted_price":         discounted_price,
                    "img_full_src":             img_full_src,
                    "img_thumbnail_src":        img_thumbnail_src,
                    "price_per_kg":             price_per_kg,
                    "discounted_price_per_kg":  discounted_price_per_kg,
                    "discount_percentage":      discount_percentage,
                }
                # fmt: on
                category_products.append(product)

            # Update the pagination parameters
            next_page += 1

        logger.info(f"Finished scraping category.")
        all_products.extend(category_products)

    logger.info(f"Scraping complete! Total products found: {len(all_products)}")
    return all_products


if __name__ == "__main__":
    # Finally, inserts products to file & upload to db
    products = scrape_ab(logger=logger, starting_page=1, max_page=1, starting_category="001", ending_category="014")

    shop_name = "ab"
    write_to_json(products, shop_name)
    upload_scraped_products(
        products,
        shop_name,
        logger=logger,
    )
