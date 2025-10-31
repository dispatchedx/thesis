from typing import List
from pydantic import BaseModel
from datetime import datetime


class PriceHistoryRead(BaseModel):
    sale_tag: str | None = None
    regular_price: float | None = None
    discounted_price: float | None = None
    price_per_kg: float | None = None
    discounted_price_per_kg: float | None = None
    discount_percentage: float | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class ProductRead(BaseModel):
    id: int
    name: str
    link: str | None = None
    img_thumbnail_src: str | None = None
    img_full_src: str | None = None
    shop_id: int
    price_history: PriceHistoryRead

    # from typing import Optional -> : Optional[str] = None --- for python versions < 3.10
    class Config:
        from_attributes = True


# prodactOut model for shop_name inclusion
class ProductOut(BaseModel):
    id: int
    name: str
    link: str | None = None
    img_thumbnail_src: str | None = None
    img_full_src: str | None = None
    shop_id: int
    shop_name: str
    price_history: PriceHistoryRead

    class Config:
        from_attributes = True


class ProductHistoryRead(BaseModel):  # for getting full price history of a product
    id: int
    name: str
    link: str | None = None
    img_thumbnail_src: str | None = None
    img_full_src: str | None = None
    shop_id: int
    price_history: List[PriceHistoryRead]  # list of price histories!

    # from typing import Optional -> : Optional[str] = None --- for python versions < 3.10
    class Config:
        from_attributes = True


class SearchResponse(BaseModel):
    products: List[ProductOut]
    has_more: bool
