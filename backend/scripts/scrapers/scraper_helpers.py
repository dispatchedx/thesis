import sys
import re
from sqlalchemy.exc import IntegrityError
from data.database import SessionLocal, Shop, Product, PriceHistory
from unidecode import unidecode


def print_discount(old_price, new_price, discount: int, store_name: str):
    if discount is not None:
        print(f"{store_name} has offer: {discount}% off")
        print(f"€{old_price} -> €{new_price}\n")
    else:
        print(f"{store_name} has no offers\n")
        return None


def calculate_discount(old_price: str, new_price: str) -> int | None:
    if old_price and new_price:
        try:
            old_price = float(old_price)
            new_price = float(new_price)
            discount = (old_price - new_price) / old_price * 100
            if discount <= 5:
                return None
            else:
                return round(discount)
        except ValueError:
            return None
    return None


def str_to_float(price: str) -> float | None:
    """
    Removes non digit characters, removes thousand seperator, changes comma to dot for decimals.

    Args:
        price (str): A string of characters with a float in them.

    Returns:
        float: The converted float number.
    """

    # in case something terrible is going on
    cleaned_price = re.search(r"\d*[,.]?\d+[,.]?\d*", price)
    if cleaned_price is None:
        # print("bruh.. null price")
        return None

    cleaned_price = cleaned_price.group()
    cleaned_price = cleaned_price.replace(".", "").replace(",", ".")
    return float(cleaned_price)


def fetch_with_retry(request_func):
    # Simple request with error handling
    response = request_func
    if response.ok:
        return response
    raise RuntimeError(f"Request failed: {response.status_code}")


def write_to_json(products: list, shop_name: str):
    import json
    import os

    os.makedirs("output", exist_ok=True)  # ensure folder exists
    with open(f"output/scrape_{shop_name}.json", "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=4)
    print(f"Scraped {len(products)} products to output/scrape_{shop_name}.json")


def add_or_get_shop(db, shop_name: str, website_url: str = "") -> Shop:
    """
    Returns:
        Shop: Shop object
    """
    shop = db.query(Shop).filter_by(name=shop_name).first()
    if not shop:
        # IF SHOP DOESNT EXIST ADD IT TO DB
        shop = Shop(name=shop_name, website_url=website_url, logo_url=None)
        db.add(shop)
        try:
            db.flush()  # Get ID without commit
            print(f"shop: {shop_name} added to the database.")
            db.commit()
        except IntegrityError:
            db.rollback()
            shop = db.query(Shop).filter_by(name=shop_name).first()

    return shop


def normalize_name(name: str) -> str:
    return unidecode(name).lower().strip()


def add_new_offers(db, products: list, shop: Shop) -> tuple[int, int, int, int]:
    """
    Adds freshly scraped products (if they dont already exist) and adds latest offers to Database
    Only adds new price history entries if prices have changed from the previous entry.

    Args:
        db (_type_): database session
        products (list): the scraped products list
        shop (Shop): Shop object
    Returns:
        tuple(int, int, int, int): (new_products_counter, updated_products_counter, new_prices_counter, same_prices_counter)
    """
    new_products_counter = 0
    updated_prices_counter = 0
    updated_products_counter = 0
    same_prices_counter = 0

    # Get existing products for this shop
    shop_products = db.query(Product).filter_by(shop_id=shop.id).all()
    existing_products_by_link = {p.link: p for p in shop_products}
    existing_products_by_name = {p.name: p for p in shop_products}

    # Batch insert all price history entries and update products
    price_history_entries = []
    for product in products:
        # Try link first (only if link exists and is not None)
        if product.get("link") is not None:
            product_db = existing_products_by_link.get(product["link"])

        # Fall back to name if no link match found
        if not product_db:
            product_db = existing_products_by_name.get(product["name"])
        product["name_normalized"] = normalize_name(product["name"])  # normalize name for fast index searching in db

        if not product_db:
            # New product - create it
            product_db = Product(
                name=product["name"],
                name_normalized=product["name_normalized"],
                link=product["link"],
                img_full_src=product["img_full_src"],
                img_thumbnail_src=product["img_thumbnail_src"],
                shop_id=shop.id,
            )
            db.add(product_db)  # Add the product to the db
            db.flush()  # Ensure product ID is generated
            new_products_counter += 1

        price_history = PriceHistory(
            product_id=product_db.id,
            sale_tag=product.get("sale_tag"),  # .get() cause it can be None
            regular_price=product["regular_price"],
            discounted_price=product["discounted_price"],
            price_per_kg=product["price_per_kg"],
            discounted_price_per_kg=product["discounted_price_per_kg"],
            discount_percentage=product["discount_percentage"],
        )
        price_history_entries.append(price_history)

    # Add all price history entries in bulk
    if price_history_entries:
        db.add_all(price_history_entries)
        updated_prices_counter = len(price_history_entries)

    return (new_products_counter, updated_products_counter, updated_prices_counter, same_prices_counter)


def upload_scraped_products(products: list, shop_name: str, logger):

    db = SessionLocal()
    try:
        shop = add_or_get_shop(db, shop_name)
        logger.info("Starting upload process...")
        new_products_counter, updated_products_counter, updated_prices_counter, ignored_prices_counter = add_new_offers(
            db, products, shop
        )
        db.commit()
        logger.info(
            f"Updated products: {updated_products_counter}  New products added: {new_products_counter}  Updated prices: {updated_prices_counter} Ignored prices: {ignored_prices_counter}"
        )

    except IntegrityError as e:
        db.rollback()
        logger.exception(f"Integrity Error while uploading products for {shop_name}: {e}")
        sys.exit(1)

    except Exception as e:
        db.rollback()
        logger.exception(f"Unexpected Error while uploading products for {shop_name}: {e}")
        sys.exit(1)

    finally:
        logger.info("Finished upload process.")
        db.close()
