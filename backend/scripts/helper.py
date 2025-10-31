from typing import List
import bcrypt

from sqlalchemy.orm import joinedload, Session
from unidecode import unidecode

from data.database import Product, User, Watchlist
from fastapi import HTTPException
from scripts.logging_config import get_logger

logger = get_logger("helper.py")


def hash_password(plain_password: str) -> str:
    """
    Returns:
        str: hashed password using bycrypt
    """
    # Generate a salt and hash the password
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(plain_password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password) -> bool:
    """
    Returns:
        bool: True if the passwords match, False otherwise.
    """
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_watchlist_for_user(user_id: int, watchlist_name: str, db: Session):
    new_watchlist = Watchlist(
        user_id=user_id,
        name=watchlist_name,
    )
    db.add(new_watchlist)
    db.commit()
    db.refresh(new_watchlist)
    return new_watchlist


def convert_to_decimal(cents_value):
    """Convert integer cents to decimal, handling None values."""
    return cents_value / 100 if cents_value is not None else None


def fetch_user_watchlists_with_prices(user_id: int, db: Session):
    """Fetch user watchlists with latest price data for each product"""
    from sqlalchemy.sql import text

    # First verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get all watchlists with products and their latest prices
    sql = """
        SELECT
            w.id as watchlist_id,
            w.name as watchlist_name,
            p.id as product_id,
            p.name as product_name,
            p.link,
            p.img_thumbnail_src,
            p.img_full_src,
            p.shop_id,
            s.name as shop_name,
            ph.regular_price,
            ph.discounted_price,
            ph.price_per_kg,
            ph.discounted_price_per_kg,
            ph.discount_percentage,
            ph.created_at as price_created_at
        FROM watchlists w
        LEFT JOIN watchlist_products wp ON w.id = wp.watchlist_id
        LEFT JOIN products p ON wp.product_id = p.id
        LEFT JOIN shops s ON p.shop_id = s.id
        LEFT JOIN LATERAL (
            SELECT
                regular_price,
                discounted_price,
                price_per_kg,
                discounted_price_per_kg,
                discount_percentage,
                created_at
            FROM price_history
            WHERE product_id = p.id
            ORDER BY created_at DESC
            LIMIT 1
        ) ph ON p.id IS NOT NULL
        WHERE w.user_id = :user_id
        ORDER BY w.id, p.name
    """

    rows = db.execute(text(sql), {"user_id": user_id}).fetchall()

    # Group by watchlist
    watchlists_dict = {}

    for row in rows:
        watchlist_id = row.watchlist_id

        if watchlist_id not in watchlists_dict:
            watchlists_dict[watchlist_id] = {"id": watchlist_id, "name": row.watchlist_name, "products": []}

        # Only add product if it exists (LEFT JOIN might return watchlists with no products)
        if row.product_id:
            product_data = {
                "id": row.product_id,
                "name": row.product_name,
                "link": row.link,
                "img_thumbnail_src": row.img_thumbnail_src,
                "img_full_src": row.img_full_src,
                "shop_id": row.shop_id,
                "shop_name": row.shop_name,
                "price_history": (
                    {
                        "regular_price": row.regular_price,
                        "discounted_price": row.discounted_price,
                        "price_per_kg": row.price_per_kg,
                        "discounted_price_per_kg": row.discounted_price_per_kg,
                        "discount_percentage": row.discount_percentage,
                        "created_at": row.price_created_at,
                    }
                    if row.regular_price is not None
                    else None
                ),
                "last_updated": row.price_created_at,
            }
            watchlists_dict[watchlist_id]["products"].append(product_data)

    return list(watchlists_dict.values())


def fetch_user_watchlists_summary(user_id: int, db: Session):
    """Lightweight fetch for search page - just IDs and names + product membership"""
    from sqlalchemy.sql import text

    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get all watchlists with product IDs (no price data)
    sql = """
        SELECT
            w.id as watchlist_id,
            w.name as watchlist_name,
            COALESCE(
                array_agg(wp.product_id) FILTER (WHERE wp.product_id IS NOT NULL),
                ARRAY[]::integer[]
            ) as product_ids
        FROM watchlists w
        LEFT JOIN watchlist_products wp ON w.id = wp.watchlist_id
        WHERE w.user_id = :user_id
        GROUP BY w.id, w.name
        ORDER BY w.id
    """

    rows = db.execute(text(sql), {"user_id": user_id}).fetchall()

    watchlists = []
    for row in rows:
        watchlists.append(
            {
                "id": row.watchlist_id,
                "name": row.watchlist_name,
                "product_ids": list(row.product_ids) if row.product_ids else [],
            }
        )

    return watchlists


def get_products_watchlist_status(user_id: int, product_ids: List[int], db: Session):
    """Get which watchlists contain specific products"""
    from sqlalchemy.sql import text

    if not product_ids:
        return {}

    # Convert product_ids to a format suitable for SQL IN clause
    product_ids_str = ",".join(map(str, product_ids))

    sql = f"""
        SELECT
            wp.product_id,
            array_agg(w.id) as watchlist_ids
        FROM watchlist_products wp
        JOIN watchlists w ON wp.watchlist_id = w.id
        WHERE w.user_id = :user_id
        AND wp.product_id IN ({product_ids_str})
        GROUP BY wp.product_id
    """

    rows = db.execute(text(sql), {"user_id": user_id}).fetchall()

    # Create mapping of product_id -> [watchlist_ids]
    result = {}
    for row in rows:
        result[row.product_id] = list(row.watchlist_ids)

    # Ensure all requested products are in result (even if empty)
    for product_id in product_ids:
        if product_id not in result:
            result[product_id] = []

    return result


def fetch_user_watchlist_products(
    user_id: int, watchlist_id: int, db: Session, limit: int = 20, offset: int = 0
) -> tuple[Watchlist, List[Product], bool]:
    """for detailed watchlist view"""
    from sqlalchemy.sql import text

    sql = """
        SELECT
            p.id,
            p.name,
            p.link,
            p.img_thumbnail_src,
            p.img_full_src,
            p.shop_id,
            s.name AS shop_name,
            ph.regular_price,
            ph.discounted_price,
            ph.price_per_kg,
            ph.sale_tag,
            ph.discounted_price_per_kg,
            ph.discount_percentage,
            ph.created_at AS price_created_at
        FROM watchlists w
        JOIN watchlist_products wp ON w.id = wp.watchlist_id
        JOIN products p ON wp.product_id = p.id
        JOIN shops s ON p.shop_id = s.id
        LEFT JOIN LATERAL (
            SELECT
                regular_price,
                discounted_price,
                price_per_kg,
                discounted_price_per_kg,
                discount_percentage,
                sale_tag,
                created_at
            FROM price_history
            WHERE product_id = p.id
            ORDER BY created_at DESC
            LIMIT 1
        ) ph ON true
        WHERE w.user_id = :user_id
        AND w.id = :watchlist_id
        ORDER BY ph.discounted_price DESC NULLS LAST
        LIMIT :limit OFFSET :offset
    """

    params = {
        "user_id": user_id,
        "watchlist_id": watchlist_id,
        "limit": limit + 1,
        "offset": offset,
    }

    watchlist = db.query(Watchlist).filter(Watchlist.id == watchlist_id, Watchlist.user_id == user_id).first()

    if not watchlist:
        raise HTTPException(status_code=404, detail="Watchlist not found")

    rows = db.execute(text(sql), params).fetchall()
    has_more = len(rows) > limit

    products = []
    for row in rows[:limit]:
        product = {
            "id": row.id,
            "name": row.name,
            "link": row.link,
            "img_thumbnail_src": row.img_thumbnail_src,
            "img_full_src": row.img_full_src,
            "shop_id": row.shop_id,
            "shop_name": row.shop_name,
            "price_history": {
                "regular_price": convert_to_decimal(row.regular_price),
                "discounted_price": convert_to_decimal(row.discounted_price),
                "price_per_kg": convert_to_decimal(row.price_per_kg),
                "discounted_price_per_kg": convert_to_decimal(row.discounted_price_per_kg),
                "sale_tag": row.sale_tag,
                "discount_percentage": row.discount_percentage,
                "created_at": row.price_created_at,
            },
            "last_updated": row.price_created_at,
        }
        products.append(product)

    return (watchlist, products, has_more)


def fetch_user_watchlists(user_id: int, db: Session):
    user = (
        db.query(User)
        .options(joinedload(User.watchlists).joinedload(Watchlist.products))
        .filter(User.id == user_id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    watchlists_list = []
    for watchlist in user.watchlists:
        watchlists_list.append(
            {
                "id": watchlist.id,
                "name": watchlist.name,
                "products": [
                    {
                        "id": product.id,
                        "name": product.name,
                        "shop_id": product.shop_id,
                        "img_thumbnail_src": product.img_thumbnail_src,
                        "img_full_src": product.img_full_src,
                        "link": product.link,
                    }
                    for product in watchlist.products
                ],
            }
        )
    return watchlists_list


def normalize_name(name: str) -> str:
    if not name or not isinstance(name, str):
        return ""
    normalized_name = unidecode(name).lower().strip()
    return normalized_name[:255]  # avoids exception for when >255 (our db max)


def search_for_product(
    db: Session, user_input: str | None, shop_ids: List[int] | None = [], limit: int = 20, offset: int = 0
):

    # need this: CREATE EXTENSION IF NOT EXISTS pg_trgm;
    from sqlalchemy.sql import text

    if not user_input:
        logger.info("No input provided — returning empty list")
        return [], False

    search_terms = normalize_name(user_input).split()
    sql = """SELECT
            p.id,
            p.name,
            p.link,
            p.img_thumbnail_src,
            p.img_full_src,
            p.shop_id,
            s.name AS shop_name,
            lp.regular_price,
            lp.discounted_price,
            lp.price_per_kg,
            lp.discounted_price_per_kg,
            lp.sale_tag,
            lp.discount_percentage,
            lp.created_at AS price_created_at
        FROM products p
        JOIN shops s ON p.shop_id = s.id
        LEFT JOIN LATERAL (
            SELECT ph.*
            FROM price_history ph
            WHERE ph.product_id = p.id
            ORDER BY ph.created_at DESC
            LIMIT 1
        ) lp ON true
        WHERE
            s.id = ANY(:shop_ids)"""

    # Dynamically add search term
    params = {
        "shop_ids": shop_ids or None,
        "limit": limit + 1,  # +1 for pagination, check if theres more
        "offset": offset,
    }
    for i, term in enumerate(search_terms):
        sql += f" AND p.name_normalized ILIKE :term{i} "
        params[f"term{i}"] = f"%{term}%"  # through parameter to avoid sql injection
    sql += """
    ORDER BY lp.created_at DESC NULLS LAST
        LIMIT :limit OFFSET :offset"""

    rows = db.execute(text(sql), params).fetchall()

    has_more = len(rows) > limit
    products = []
    for product in rows[:limit]:
        products.append(
            {
                "id": product.id,
                "name": product.name,
                "link": product.link,
                "img_thumbnail_src": product.img_thumbnail_src,
                "img_full_src": product.img_full_src,
                "shop_id": product.shop_id,
                "shop_name": product.shop_name,
                "price_history": {
                    "regular_price": convert_to_decimal(product.regular_price),
                    "discounted_price": convert_to_decimal(product.discounted_price),
                    "price_per_kg": convert_to_decimal(product.price_per_kg),
                    "discounted_price_per_kg": convert_to_decimal(product.discounted_price_per_kg),
                    "sale_tag": product.sale_tag,
                    "discount_percentage": product.discount_percentage,
                    "created_at": product.price_created_at,
                },
                "last_updated": product.price_created_at,
            }
        )
    return (products, has_more)
