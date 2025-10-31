from pydantic import BaseModel, EmailStr
from .watchlist import WatchlistRead


# Pydantic model for creating a new user
class UserCreate(BaseModel):
    first_name: str
    last_name: str | None = None
    username: str | None = None
    password: str
    email: EmailStr


# Pydantic model for reading user data (response model)
class UserRead(BaseModel):
    id: int
    first_name: str
    last_name: str | None = None
    username: str | None = None
    email: EmailStr

    class Config:
        from_attributes = True  # orm mode = true


class LoginSchema(BaseModel):
    email: str
    password: str


class UserWithWatchlist(UserRead):  # Full user with watchlist
    watchlist: list[WatchlistRead] = []
