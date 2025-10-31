from pydantic import BaseModel


class ShopRead(BaseModel):
    id: int
    name: str
    logo_url: str | None = None
