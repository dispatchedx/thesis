import requests
import time
import random
from scripts.logging_config import get_logger
import scripts.scrapers.scraper_helpers as helper
from bs4 import BeautifulSoup
from logging import Logger


def scrape_bazaar(logger: Logger, starting_page: int, max_page=30) -> list:
    """_summary_

    Args:
        starting_page (int): starting page to begin scrape
        max_page (int, optional): Max number of pages to scrape total across all categories. Defaults to 30.

    Returns:
        products: list of products
    """

    products = []
    base_url = "https://www.bazaar-online.gr/"
    categories = {
        "kreas-poylerika": "ΚΡΕΑΣ - ΠΟΥΛΕΡΙΚΑ",
        "allantika-delicatessen": "ΑΛΛΑΝΤΙΚΑ - DELICATESSEN",
        "artozacharoplasteio": "ΑΡΤΟΖΑΧΑΡΟΠΛΑΣΤΕΙΟ",
        "vrefika": "ΒΡΕΦΙΚΑ",
        "galaktokomika-eidi-rygeioy": "ΓΑΛΑΚΤΟΚΟΜΙΚΑ - ΕΙΔΗ ΨΥΓΕΙΟΥ",
        "glyka-almyra-snak-zacharodi": "ΓΛΥΚΑ - ΑΛΜΥΡΑ ΣΝΑΚ - ΖΑΧΑΡΩΔΗ",
        "kava": "ΚΑΒΑ",
        "kathariotita-oikiaka-eidi": "ΚΑΘΑΡΙΟΤΗΤΑ - ΟΙΚΙΑΚΑ ΕΙΔΗ",
        "kataryxi": "ΚΑΤΑΨΥΞΗ",
        "pantopoleio": "ΠΑΝΤΟΠΩΛΕΙΟ",
        "proino-kafes-rofimata": "ΠΡΩΪΝΟ - ΚΑΦΕΣ - ΡΟΦΗΜΑΤΑ",
        "tyria-tyrokomika": "ΤΥΡΙΑ - ΤΥΡΟΚΟΜΙΚΑ",
        "ygeia-and-omorfia": "ΥΓΕΙΑ & ΟΜΟΡΦΙΑ",
        "froyta-lachanika": "ΦΡΟΥΤΑ - ΛΑΧΑΝΙΚΑ",
        "fytika": "ΦΥΤΙΚΑ",
        "pet-shop": "PET SHOP",
    }

    MAX_PAGE_LIMIT = max_page  # Hard limit across all categories
    total_pages_scraped = 0

    for category_key in categories.keys():
        logger.info(f"Starting category")

        last_page = "last page url"
        next_page = starting_page  # Reset to starting page for each category

        while next_page:
            url = f"{base_url}{category_key}?limit=100&page={next_page}"

            # If we reach the final page of this category, stop scraping this category
            if url == last_page:
                logger.info(f"Finished category")
                break

            logger.info(f"Scraping page {next_page}..")

            # Delay to not overload the server and get us banned
            time.sleep(random.uniform(4, 8))

            next_page += 1
            total_pages_scraped += 1

            # Hard limit in case anything bad happens
            if total_pages_scraped >= MAX_PAGE_LIMIT:
                logger.warning(f"Hit MAX_PAGE_LIMIT of {MAX_PAGE_LIMIT}. Stopping scraper.")
                return products

            # Fetch url response!
            try:
                response = helper.fetch_with_retry(requests.get(url=url))
            except RuntimeError as e:
                logger.error(f"Scraper failed for {__name__}: {e}")
                raise RuntimeError
            soup = BeautifulSoup(response.content, "html.parser")

            # Find all product blocks in page
            product_soup = soup.find_all("div", class_="product-thumb")

            if not product_soup:
                logger.info(f"No products found. Moving to next category.")
                break
            for product in product_soup:
                image_data = product.find("div", class_="image")

                product_link = image_data.find("a")["href"]
                img_full_src = image_data.find("img")["src"]
                product_name = image_data.find("img")["title"]

                # Find reular price
                rp = product.find("span", class_="price-old")
                if rp:
                    regular_price = rp.text
                    regular_price = helper.str_to_float(regular_price)
                else:
                    regular_price = product.find("div", class_="price_wrapper")
                    if regular_price:
                        regular_price = helper.str_to_float(regular_price.text)
                    else:
                        regular_price = None

                # Find discounted price price
                dp = product.find("span", class_="price-new")
                if dp:

                    discounted_price = helper.str_to_float(dp.text)
                else:
                    discounted_price = None
                # Find (discounted)? price per kilos
                unknown_per_kg = product.find("div", class_="priceperkg").text
                unknown_per_kg = helper.str_to_float(unknown_per_kg)
                price_per_kg = None
                discounted_price_per_kg = None
                if regular_price and discounted_price:
                    discounted_price_per_kg = unknown_per_kg
                else:
                    price_per_kg = unknown_per_kg

                # Check if regular price is actually per kilo
                item_price_text = product.find("div", class_="item_price_text")
                if item_price_text:
                    price_text = item_price_text.text
                    if "κιλό" in price_text.lower() or "κιλο" in price_text.lower():
                        # swap regular price with price_per kg
                        tmp = regular_price
                        regular_price = price_per_kg
                        price_per_kg = tmp
                        # swap discounted price with price_per kg
                        tmp = discounted_price
                        discounted_price = discounted_price_per_kg
                        discounted_price_per_kg = tmp

                # Calculate discount
                discount_percentage = helper.calculate_discount(regular_price, discounted_price)

                # fmt: off
                product = {
                    "name":                     product_name,
                    "link":                     product_link,
                    "regular_price":            regular_price,
                    "discounted_price":         discounted_price,
                    "img_full_src":             img_full_src,
                    "img_thumbnail_src":        None,
                    "price_per_kg":             price_per_kg,
                    "sale_tag":                 None,
                    "discounted_price_per_kg":  discounted_price_per_kg,
                    "discount_percentage":      discount_percentage,
                }
                # fmt: on
                products.append(product)

    logger.info(f"Scraping completed.")


if __name__ == "__main__":
    logger = get_logger("bazaar")
    products = scrape_bazaar(logger=logger, starting_page=1, max_page=5)

    shop_name = "bazaar"
    helper.write_to_json(products, shop_name=shop_name)
    helper.upload_scraped_products(products, shop_name=shop_name, logger=logger)
