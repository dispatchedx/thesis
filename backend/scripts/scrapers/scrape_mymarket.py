import requests
from bs4 import BeautifulSoup
import time
import random
import scripts.scrapers.scraper_helpers as helper
from logging import Logger
from scripts.logging_config import get_logger

logger = get_logger("mymarket")


def scrape_mymarket(logger: Logger, starting_page: int, max_page=50) -> list:
    base_url = "https://www.mymarket.gr/"
    categories = [
        "frouta-lachanika",
        "fresko-kreas-psari",
        "galaktokomika-eidi-psygeiou",
        "tyria-allantika-deli",
        "katepsygmena-trofima",
        "mpyres-anapsyktika-krasia-pota",
        "proino-rofimata-kafes",
        "artozacharoplasteio-snacks",
        "trofima",
        "frontida-gia-to-moro-sas",
        "prosopiki-frontida",
        "oikiaki-frontida-chartika",
        "kouzina-mikrosyskeves-spiti",
        "frontida-gia-to-katoikidio-sas",
        "epochiaka",
    ]

    all_products = []

    for category in categories:
        logger.info(f"Starting to scrape next category")
        page = 1
        next_page = "placeholder"  # Initialize to enter the loop

        while next_page:
            parameter_url = f"?perPage=100&sort=popularity&page={page}"
            url = base_url + category + parameter_url

            try:
                response = helper.fetch_with_retry(requests.get(url=url))
            except RuntimeError as e:
                logger.error(f"Scraper failed for {__name__}: {e}")
                raise

            logger.info(f"Scraping page {page}...")

            time.sleep(random.uniform(4, 8))

            soup = BeautifulSoup(response.content, "html.parser")
            data_soup = soup.find_all("article", class_="product--teaser bg-white h-full w-full")

            # If no products found, break out of page loop for this category
            if not data_soup:
                logger.info(f"No products found for category. Moving to next category..")
                break
            logger.info(f"Found {len(data_soup)} products.")
            for product_soup in data_soup:

                sale_tag_div = product_soup.find("div", class_="product-note-tag tag-properties")
                if sale_tag_div:
                    tag_text = sale_tag_div.text.strip()
                    sale_tag = tag_text if tag_text != "SUPER ΤΙΜΗ" else None
                else:
                    sale_tag = None

                tooltip = product_soup.find("div", class_="tooltip")
                product_name = tooltip.find("p", class_="line-clamp-2").text
                product_link = tooltip.find("a")["href"]

                img = product_soup.find("div", class_="teaser-image-container")
                if img.find("source"):
                    img_thumbnail_src = img.find("source")["srcset"]
                else:
                    logger.warning(f"Skipping product")
                    continue
                img_fullsize_src = img.find("img")["src"]

                footer = product_soup.find("footer")
                prices_infotext = footer.find_all("span", class_="text-[6px] leading-[6px] sm:text-[7px]")
                prices = footer.find_all("span", class_="font-semibold")

                price_mapping = {
                    "Αρχική τιμή λίτρου": "price_per_kg",
                    "Αρχική τιμή κιλού": "price_per_kg",
                    "Τιμή κιλού": "price_per_kg",
                    "Τιμή λίτρου": "price_per_kg",
                    "Tιμή τεμαχίου": "price_per_kg",
                    "Τελική τιμή λίτρου": "discounted_price_per_kg",
                    "Τελική τιμή κιλού": "discounted_price_per_kg",
                    "Αρχική τιμή": "price",
                    "Τελική τιμή": "discounted_price",
                    "Αρχική τιμή τεμαχίου": "price_per_kg",
                    "Τελική τιμή τεμαχίου": "discounted_price_per_kg",
                }
                infotext_mapping = {
                    "Αρχική τιμή λίτρου": "price_per_kg_infotext",
                    "Αρχική τιμή κιλού": "price_per_kg_infotext",
                    "Τελική τιμή λίτρου": "discounted_price_per_kg_infotext",
                    "Τελική τιμή κιλού": "discounted_price_per_kg_infotext",
                }
                product_data = {
                    "price_per_kg": None,
                    "discounted_price_per_kg": None,
                    "price": None,
                    "discounted_price": None,
                    "price_per_kg_infotext": None,
                    "discounted_price_per_kg_infotext": None,
                }

                for price, infotext in zip(prices, prices_infotext):
                    price = helper.str_to_float(price.text)
                    infotext = infotext.text.strip()
                    if infotext in price_mapping:
                        product_data[price_mapping[infotext]] = price
                    if infotext in infotext_mapping:
                        product_data[infotext_mapping[infotext]] = infotext

                if product_data["price"]:
                    discount = helper.calculate_discount(product_data["price"], product_data["discounted_price"])
                else:
                    discount = helper.calculate_discount(
                        product_data["price_per_kg"], product_data["discounted_price_per_kg"]
                    )

                    price = product_soup.find("span", class_="price")
                    product_data["price"] = (
                        helper.str_to_float(product_soup.find("span", class_="price").text) if price else None
                    )

                # fmt:off
                product = {
                    "name":                     product_name,
                    "link":                     product_link,
                    "sale_tag":                 sale_tag,
                    "regular_price":            product_data["price"],
                    "discounted_price":         product_data["discounted_price"],
                    "img_full_src":             img_fullsize_src,
                    "img_thumbnail_src":        img_thumbnail_src,
                    "price_per_kg":             product_data["price_per_kg"],
                    "discounted_price_per_kg":  product_data["discounted_price_per_kg"],
                    "discount_percentage":      discount,
                }
                # fmt:on
                all_products.append(product)

            # Check for next page
            next_page_element = soup.find("a", rel="next")
            if next_page_element and next_page_element.get("href"):
                next_page = next_page_element["href"]
                page += 1
            else:
                next_page = None
                logger.info(f"Moving to next category.")

    logger.info(f"Finished scraping all categories. Total products: {len(all_products)}")
    return all_products


if __name__ == "__main__":
    products = scrape_mymarket(starting_page=1, max_page=6, logger=logger)
    shop_name = "mymarket"
    helper.write_to_json(products, shop_name)
    helper.upload_scraped_products(products, shop_name, logger=logger)
