import requests
from bs4 import BeautifulSoup
import random
from time import sleep
import scripts.scrapers.scraper_helpers as helper
from scripts.logging_config import get_logger

logger = get_logger("sklavenitis")


def scrape_sklavenitis(logger=logger, starting_page=1, max_page=180) -> list:
    products = []
    next_page = starting_page
    MAX_PAGE_LIMIT = max_page

    base_url = "https://www.sklavenitis.gr"

    # Create one session for all requests (keeps cookies + TCP alive)

    headers = {
        "Host": "www.sklavenitis.gr",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "X-Requested-With": "XMLHttpRequest",
        "Connection": "keep-alive",
        "Referer": "https://www.sklavenitis.gr/sylloges/prosfores/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "DNT": "1",
        "Sec-GPC": "1",
        "TE": "trailers",
    }

    while next_page:

        if next_page > MAX_PAGE_LIMIT:
            logger.warning(f"Hit MAX_PAGE_LIMIT of {MAX_PAGE_LIMIT}. Possible unprocessed data for SKLAVENITIS.")
            break

        logger.info(f"Scraping sklavenitis.. page {next_page}")

        # Random human-like delay
        sleep(random.uniform(4, 8))

        url = f"{base_url}/sylloges/prosfores/?$component=Atcom.Sites.Yoda.Components.Collections.CollectionList&sortby=ByPopularity&pg={next_page}&endless=true"

        try:
            response = helper.fetch_with_retry(requests.get(url, headers=headers))
        except RuntimeError as e:
            logger.error(f"Scraper failed for {__name__}: {e}")
            break

        if response.status_code != 200:
            logger.error(f"HTTP {response.status_code} on page {next_page} — stopping.")
            break

        soup = BeautifulSoup(response.content, "html.parser")

        figures = soup.find_all("figure", class_="product__figure")
        prices = soup.find_all("div", class_="priceWrp")
        prices_per_kg = soup.find_all("div", class_="priceKil")

        pagination = soup.find("section", class_="pagination go-next")
        scrape_next_page = pagination["data-pg"] if pagination and pagination.has_attr("data-pg") else None

        if not scrape_next_page:
            logger.info(f"There is no next page, ending scraping.. at: {next_page}")
            break

        next_page += 1

        for figure, price, price_kg in zip(figures, prices, prices_per_kg):
            product_link = figure.find("a", href=True)["href"]
            product_img = figure.find("img", src=True)
            product_img_src = product_img["src"] if product_img else None
            product_name = product_img["alt"]

            regular_price = (
                price.find("span", class_="previousPrice__value").text.strip()
                if price.find("span", class_="previousPrice__value")
                else ""
            )
            discounted_price = (
                price.find("div", class_="price").text.strip() if price.find("div", class_="price") else ""
            )
            price_per_kg_val = (
                price_kg.find("div", class_="deleted__price").text.strip()
                if price_kg.find("div", class_="deleted__price")
                else ""
            )
            discounted_price_per_kg_val = (
                price_kg.find("div", class_="hightlight").text.strip()
                if price_kg.find("div", class_="hightlight")
                else ""
            )

            # Format it to float
            regular_price = helper.str_to_float(regular_price)
            discounted_price = helper.str_to_float(discounted_price)
            price_per_kg_val = helper.str_to_float(price_per_kg_val)
            discounted_price_per_kg_val = helper.str_to_float(discounted_price_per_kg_val)

            discount = helper.calculate_discount(regular_price, discounted_price)

            products.append(
                {
                    "name": product_name,
                    "link": base_url + product_link,
                    "regular_price": regular_price,
                    "discounted_price": discounted_price,
                    "img_full_src": product_img_src,
                    "img_thumbnail_src": None,
                    "price_per_kg": price_per_kg_val,
                    "discounted_price_per_kg": discounted_price_per_kg_val,
                    "discount_percentage": discount,
                }
            )

    return products


if __name__ == "__main__":
    products = scrape_sklavenitis(starting_page=1, max_page=5)
    shop_name = "sklavenitis"
    helper.write_to_json(products, shop_name)
    helper.upload_scraped_products(products, shop_name, logger=logger)
