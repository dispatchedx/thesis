from pydantic import BaseModel
from typing import List
from .product import ProductRead


class WatchlistRead(BaseModel):
    id: int
    user_id: int
    name: str
    products: List[ProductRead] | None = None

    class Config:
        from_attributes = True


class WatchlistCreateRequest(BaseModel):
    watchlist_name: str
