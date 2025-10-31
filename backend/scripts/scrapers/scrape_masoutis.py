import requests
import scripts.scrapers.scraper_helpers as helper
import time
import random
from scripts.logging_config import get_logger


def scrape_masoutis(starting_page: int, max_page=250, logger=None):
    if logger is None:
        logger = get_logger("masoutis")

    # Masoutis requires authentication header
    get_cred_url = "https://www.masoutis.gr/api/eshop/GetCred"
    # Get authentication
    try:
        response = helper.fetch_with_retry(requests.get(url=get_cred_url))
    except RuntimeError as e:
        logger.error(f"Scraper failed for {__name__}: {e}")

    Uid = response.json()["Uid"]
    Usl = response.json()["Usl"]
    Key = response.json()["Key"]

    # fmt:off
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": "https://www.masoutis.gr/categories/index/prosfores?item=0",
        "Content-Type": "application/json",
        "Uid": Uid,
        "Usl": Usl,
        "Key": Key,
        "Origin": "https://www.masoutis.gr",
    }
    # fmt:on
    data = {
        "PassKey": "Sc@NnSh0p",
        "Itemcode": "0",
        "ItemDescr": "2",
        "IfWeight": "1",
        "ServiceResponse": "",
        "Token": "",
        "Zip": "",
    }

    url = "https://www.masoutis.gr/api/eshop/GetPromoItemWithListCouponsSubCategoriesAutoPromos"

    categories = {
        "paixnidia": "1785",
        "manabiko": "566",
        "kreopwleio": "565",
        "eidh-psugeiou": "568",
        "eidh-katapsukshs": "573",
        "kava": "574",
        "snack-kshroi-karpoi": "579",
        "prwina": "544",
        "artozaxaroplasteio": "575",
        "zaxarwdh-mpiskota": "571",
        "eidh-pantopwleiou": "562",
        "zumarika-ospria": "577",
        "dressing": "563",
        "konserboeidh": "578",
        "brefikh-frontida": "545",
        "proswpikh-peripoihsh": "570",
        "ugieinh-xartika": "576",
        "eidh-katharismou": "572",
        "eidh-oikiakhs": "727",
        "katoikidia": "567",
    }

    MAX_PAGE_LIMIT = max_page  # Hard limit for total pages across all categories
    all_products = []  # Master product list
    total_pages_scraped = 0

    for category_id in categories.values():
        print(category_id)
        category_products = []  # Separate list for this category
        page_number = starting_page

        while page_number:
            # Check if we've hit the total page limit
            if total_pages_scraped >= MAX_PAGE_LIMIT:
                logger.warning(f"Hit MAX_PAGE_LIMIT of {MAX_PAGE_LIMIT}. Stopping scraping.")
                break

            logger.info(f"Scraping page: {page_number}")

            # Delay to not overload the server and get us banned
            time.sleep(random.uniform(4, 8))

            # Set the category ID and page number
            data["Itemcode"] = category_id
            data["IfWeight"] = str(page_number)

            # Send it!
            try:
                response = helper.fetch_with_retry(requests.post(url, headers=headers, json=data))
            except RuntimeError as e:
                logger.error(f"Scraper failed for {__name__}: {e}")
                raise

            # Get Product json
            products_json = response.json()

            # If page is empty then finish scraping this category
            if not products_json:
                logger.info(f"page {page_number} empty, moving to next category...")
                break

            for product in products_json:
                # Remove infotext and handle None cases
                price_per_kg = (
                    helper.str_to_float(product["StartPrItemVolume"]) if product["StartPrItemVolume"] else None
                )
                discounted_price_per_kg = helper.str_to_float(product["ItemVolume"]) if product["ItemVolume"] else None
                if discounted_price_per_kg and not price_per_kg:
                    price_per_kg = discounted_price_per_kg
                    discounted_price_per_kg = None
                # Calculate discount
                discount_percentage = helper.calculate_discount(product["StartPrice"], product["PosPrice"])

                if product["StartPrice"] == product["PosPrice"]:
                    product["PosPrice"] = None

                if "+" in product.get("Discount"):
                    sale_tag = product["Discount"]
                else:
                    sale_tag = None
                # fmt:off
                # Product data
                product_data = {
                    "name":                     product["ItemDescr"],
                    "link":                     product["ItemDescrLink"],
                    "regular_price":            product["StartPrice"],
                    "discounted_price":         product["PosPrice"],
                    "img_full_src":             product["PhotoData"],
                    "img_thumbnail_src":        None,
                    "sale_tag":                 sale_tag,
                    "price_per_kg":             price_per_kg,
                    "discounted_price_per_kg":  discounted_price_per_kg,
                    "discount_percentage":      discount_percentage,
                }
                # fmt:on
                category_products.append(product_data)
            page_number += 1
            total_pages_scraped += 1

        # Extend the master list with this category's products
        all_products.extend(category_products)
        logger.info(f"Finished category")

    return all_products


if __name__ == "__main__":
    logger = get_logger("masoutis")
    products = scrape_masoutis(logger=logger, starting_page=1, max_page=5)
    shop_name = "masoutis"
    helper.write_to_json(products, shop_name)
    helper.upload_scraped_products(products, logger=logger, shop_name=shop_name)
