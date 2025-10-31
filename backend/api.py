from fastapi import FastAPI, HTTPException, Depends, Query
from typing import Annotated, List, Optional

from sqlalchemy.orm import Session
from data.database import SessionLocal, engine, User, Watchlist, Shop, watchlist_products
from sqlalchemy.sql import select


from fastapi.middleware.cors import CORSMiddleware

from data.database import Base
from models.user import UserCreate, UserRead, LoginSchema
from models.watchlist import WatchlistCreateRequest
from models.product import SearchResponse
from models.shop import ShopRead

import scripts.helper as helper
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# To allow communication to front end url
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Just allow everything
    allow_methods=["*"],
    allow_headers=["*"],
)


# Connection to database
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()  # This ensures proper clean up and dont need to manually db.close() every query


db_dependency = Annotated[Session, Depends(get_db)]

Base.metadata.create_all(bind=engine)


@app.get("/")
def ello():
    return {"hello": " :) maybe try navigating /docs"}


@app.post("/users", response_model=UserRead)
async def create_user(user: UserCreate, db: db_dependency):
    try:
        existing_user = get_user_by_email(db, user.email)
        if existing_user:
            raise HTTPException(status_code=409, detail="Email already registered")
        user.password = helper.hash_password(user.password)
        db_user = User(**user.model_dump())
        db.add(db_user)
        db.flush()

        helper.create_watchlist_for_user(db_user.id, "Favourites", db)  # type: ignore
        db.refresh(db_user)
        return UserRead.model_validate(db_user)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@app.get("/users", response_model=list[UserRead])
async def read_user(db: db_dependency, skip: int = 0, limit: int = 100):
    users = db.query(User).offset(skip).limit(limit).all()
    return [UserRead.model_validate(user) for user in users]


@app.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: int, db: db_dependency):
    # search user by id
    user = db.query(User).filter(User.id == user_id).first()
    if not user:  # throw error if user not found in database
        raise HTTPException(status_code=404, detail=f"User with ID {user_id} not found.")
    db.delete(user)
    db.commit()
    return {"message": "User {user.user_id} deleted successfully"}


def get_user_by_email(db: Session, email: str) -> User | None:
    user = db.query(User).filter(User.email == email).first()
    return user


@app.get("/users/{email}", response_model=UserRead)
async def read_user_by_email(email: str, db: db_dependency):
    user = get_user_by_email(db=db, email=email)
    return user  # Return user if found, else return None


@app.get("/shops", response_model=list[ShopRead])
async def get_shops(db: db_dependency):
    shops = db.query(Shop).all()
    return shops


@app.get("/products/search", response_model=SearchResponse)
async def search_products(
    db: Session = Depends(get_db),
    user_input: Optional[str] = Query(None, description="Search term for product name"),
    shop_ids: Optional[List[int]] = Query(None),
    limit: int = Query(20, ge=1, le=40),
    offset: int = Query(0, ge=0),
):

    products, has_more = helper.search_for_product(db, user_input, shop_ids, limit, offset)
    return {
        "products": products,
        "has_more": has_more,
    }


@app.get("/users/{user_id}/watchlists")
async def get_watchlists(user_id: int, db: Session = Depends(get_db)):
    watchlists_list = helper.fetch_user_watchlists_with_prices(user_id, db)
    return {"user_id": user_id, "watchlists": watchlists_list}


@app.post("/users/{user_id}/watchlist")
async def create_watchlist(user_id: int, request: WatchlistCreateRequest, db: db_dependency):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    new_watchlist = helper.create_watchlist_for_user(user_id, request.watchlist_name, db)

    return {"watchlist": new_watchlist}


@app.get("/users/{user_id}/watchlists/summary")
async def get_user_watchlists_summary(user_id: int, db: Session = Depends(get_db)):
    """Get basic watchlist info + product membership mapping for search page"""
    watchlists_summary = helper.fetch_user_watchlists_summary(user_id, db)
    return {"user_id": user_id, "watchlists": watchlists_summary}


@app.get("/users/{user_id}/watchlist/{watchlist_id}")
async def get_user_watchlist_products(
    user_id: int,
    watchlist_id: int,
    db: db_dependency,
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
):
    """Get full product details for a specific watchlist (for watchlist details page)"""
    (watchlist, products, has_more) = helper.fetch_user_watchlist_products(user_id, watchlist_id, db, limit, offset)
    return {"id": watchlist.id, "name": watchlist.name, "products": products, "has_more": has_more}


@app.post("/users/{user_id}/watchlist/{watchlist_id}/product/{product_id}")
async def add_to_watchlist(user_id: int, watchlist_id: int, product_id: int, db: db_dependency):
    # Verify watchlist ownership
    watchlist = db.query(Watchlist).filter(Watchlist.id == watchlist_id, Watchlist.user_id == user_id).first()
    if not watchlist:
        raise HTTPException(status_code=404, detail="Watchlist not found")

    # Check if already exists
    existing = db.execute(
        select(watchlist_products).where(
            watchlist_products.c.watchlist_id == watchlist_id, watchlist_products.c.product_id == product_id
        )
    ).fetchone()

    if existing:
        raise HTTPException(status_code=400, detail="Product already in watchlist")

    # Add to watchlist
    db.execute(watchlist_products.insert().values(watchlist_id=watchlist_id, product_id=product_id))
    db.commit()

    return {"message": "Product added to watchlist", "watchlist_id": watchlist_id}


@app.delete("/users/{user_id}/watchlist/{watchlist_id}/product/{product_id}")
async def remove_from_watchlist(user_id: int, watchlist_id: int, product_id: int, db: db_dependency):
    from sqlalchemy import delete

    # Verify watchlist ownership
    watchlist = db.query(Watchlist).filter(Watchlist.id == watchlist_id, Watchlist.user_id == user_id).first()
    if not watchlist:
        raise HTTPException(status_code=404, detail="Watchlist not found")

    # Remove from watchlist
    result = db.execute(
        delete(watchlist_products).where(
            watchlist_products.c.watchlist_id == watchlist_id, watchlist_products.c.product_id == product_id
        )
    )

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Product not in watchlist")

    db.commit()
    return {"message": "Product removed from watchlist", "watchlist_id": watchlist_id}


@app.delete("/users/{user_id}/watchlist/{watchlist_id}")
async def delete_watchlist(user_id: int, watchlist_id: int, db: db_dependency):
    watchlist = db.query(Watchlist).filter(Watchlist.user_id == user_id, Watchlist.id == watchlist_id).first()
    if not watchlist:
        raise HTTPException(status_code=404, detail="Watchlist not found")

    db.delete(watchlist)
    db.commit()

    return {"message": "Watchlist deleted"}


@app.post("/login")
async def login(user: LoginSchema, db: db_dependency):
    # Check if the user exists and validate the password
    db_user = get_user_by_email(db, email=user.email)
    if db_user is None or not helper.verify_password(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user_data = {
        "id": db_user.id,
        "email": db_user.email,
        "first_name": db_user.first_name,
        "username": db_user.username,
        "last_name": db_user.last_name,
    }
    return {"message": f"Login successful, welcome {db_user.first_name}", "user": user_data}
