import requests
import time
import random
import scripts.scrapers.scraper_helpers as helper
from bs4 import BeautifulSoup
from logging import Logger

from scripts.logging_config import get_logger


def scrape_marketin(logger: Logger, starting_page: int, max_page=30) -> list:
    products = []  # Product list that will be inserted to database
    MAX_PAGE_LIMIT = max_page  # Hard limit
    base_url = "https://www.market-in.gr"
    greek_url = "https://www.market-in.gr/el-gr/"
    categories = [
        "manabikh",
        "kreopoleio-1",
        "tyrokomika-allantika",
        "trofima",
        "kava",
        "vrefika",
        "galaktokomika-proionta-psugeiou",
        "katepsugmena",
        "prosopikh-frontida",
        "kathariothta",
        "ola-gia-to-spiti",
        "katoikidia",
    ]
    for category in categories:
        next_page = starting_page  # Declare starting page here
        while next_page:

            # Hard limit in case anything bad happens
            if next_page > MAX_PAGE_LIMIT:
                logger.warning(f"Hit MAX_PAGE_LIMIT of {MAX_PAGE_LIMIT}. Possible unprocessed data for MARKET IN.")
                break
            # Construct url
            url = f"{greek_url}{category}?pageno={next_page}"

            logger.info(f"Scraping page {next_page}..")
            # Delay to not overload the server and get us banned
            time.sleep(random.uniform(4, 8))

            # Fetch url response!
            try:
                response = helper.fetch_with_retry(requests.get(url=url))
            except RuntimeError as e:
                logger.error(f"Scraper failed for {__name__}: {e}")

            soup = BeautifulSoup(response.content, "html.parser")
            data_soup = soup.find_all("div", class_="product-item")

            pagination = soup.find("div", class_="pagination")

            # Last element will normally contain our next page unless we reached the last page
            last_element = pagination.find_all("a")[-1]["href"]

            # If there is no next page stop scraping
            if last_element == "#":
                logger.info(f"Stopping scraping.. at page: {next_page}")
                break

            next_page += 1

            for product_soup in data_soup:

                # Find name and link
                product_header = product_soup.find("a", class_="product-ttl")
                product_name = product_header.text
                product_link = product_header["href"]

                # Find thumbnail link
                product_thumbnail_header = product_soup.find("a", class_="product-thumb")
                img_thumbnail_src = base_url + product_thumbnail_header.find("img")["src"]

                # Find regular price
                span = product_soup.find("span", class_="old-price")
                regular_price = helper.str_to_float(span.text) if span else None

                # Find discounted price
                price_per_kg = None
                discounted_price = None
                span = product_soup.find("span", class_="new-price")

                if span:
                    if "κιλό" in span.text:
                        price_per_kg = helper.str_to_float(span.text)
                    else:
                        discounted_price = helper.str_to_float(span.text)

                # Find prices per kg
                kg_price_weight = product_soup.find("div", class_="kg-price-weight").text.split()

                # If they dont exist, set to None
                price_per_kg = helper.str_to_float(kg_price_weight[0]) if kg_price_weight else None
                discounted_price_per_kg = helper.str_to_float(kg_price_weight[1]) if len(kg_price_weight) == 2 else None

                # Calculate discount % from regular prices instead
                if regular_price and discounted_price:
                    discount_percentage = helper.calculate_discount(regular_price, discounted_price)
                else:
                    # Calculate discount % from prices per kg instead
                    discount_percentage = helper.calculate_discount(price_per_kg, discounted_price_per_kg)

                # fmt: off
                product = {
                    "name":                     product_name,
                    "link":                     product_link,
                    "regular_price":            regular_price,
                    "discounted_price":         discounted_price,
                    "img_full_src":             None,
                    "img_thumbnail_src":        img_thumbnail_src,
                    "price_per_kg":             price_per_kg,
                    "discounted_price_per_kg":  discounted_price_per_kg,
                    "discount_percentage":      discount_percentage,
                }
                # fmt: on
                products.append(product)

    return products


if __name__ == "__main__":
    logger = get_logger("marketin")
    products = scrape_marketin(logger=logger, starting_page=1, max_page=5)

    shop_name = "marketin"
    helper.write_to_json(products, shop_name=shop_name)
    helper.upload_scraped_products(products, shop_name=shop_name, logger=logger)
