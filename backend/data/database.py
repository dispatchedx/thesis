from sqlalchemy import (
    Index,
    create_engine,
    Column,
    Integer,
    String,
    Numeric,
    ForeignKey,
    TIMESTAMP,
    UniqueConstraint,
    func,
    Table,
    desc,
)
from sqlalchemy.orm import relationship, sessionmaker, declarative_base
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")
if DATABASE_URL is None:
    raise ValueError("DATABASE_URL environment variable must be set")
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    first_name = Column(String(30), nullable=False)
    last_name = Column(String(50))
    password = Column(String(255), nullable=False)
    username = Column(String(20))
    email = Column(String(254), nullable=False, unique=True)
    created_at = Column(TIMESTAMP, server_default=func.now())  # func.now() calls CURRENT_TIMESTAMP on postesgre

    watchlists = relationship("Watchlist", back_populates="user", cascade="all, delete-orphan")


class Shop(Base):
    __tablename__ = "shops"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False, unique=True)
    website_url = Column(String(255), nullable=False)
    logo_url = Column(String(255))
    created_at = Column(TIMESTAMP, server_default=func.now())

    products = relationship("Product", back_populates="shop")


class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    name_normalized = Column(String(255))
    link = Column(String(255))
    img_full_src = Column(String(255))
    img_thumbnail_src = Column(String(255))
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    shop = relationship("Shop", back_populates="products")
    price_history = relationship("PriceHistory", back_populates="product", order_by="PriceHistory.created_at")
    watchlists = relationship("Watchlist", secondary="watchlist_products", back_populates="products")


class PriceHistory(Base):
    __tablename__ = "price_history"
    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    # Map Python attribute '_regular_price' to database column 'regular_price'
    _regular_price = Column("regular_price", Integer)
    _discounted_price = Column("discounted_price", Integer)
    _price_per_kg = Column("price_per_kg", Integer)
    _discounted_price_per_kg = Column("discounted_price_per_kg", Integer)
    discount_percentage = Column(Numeric(5, 2))
    sale_tag = Column(String(50))
    created_at = Column(TIMESTAMP, server_default=func.now())
    # association table. use products row for all queries
    product = relationship("Product", back_populates="price_history")

    __table_args__ = (Index("idx_price_history_latest", "product_id", desc("created_at")),)

    @property
    def regular_price(self):
        return self._regular_price / 100 if self._regular_price is not None else None

    @regular_price.setter
    def regular_price(self, value_in_decimal):
        if value_in_decimal is not None:
            # Round before converting to int to handle float precision gracefully
            self._regular_price = int(round(value_in_decimal * 100))
        else:
            self._regular_price = None

    @property
    def discounted_price(self):
        return self._discounted_price / 100 if self._discounted_price is not None else None

    @discounted_price.setter
    def discounted_price(self, value_in_decimal):
        if value_in_decimal is not None:
            self._discounted_price = int(round(value_in_decimal * 100))
        else:
            self._discounted_price = None

    @property
    def price_per_kg(self):
        return self._price_per_kg / 100 if self._price_per_kg is not None else None

    @price_per_kg.setter
    def price_per_kg(self, value_in_decimal):
        if value_in_decimal is not None:
            self._price_per_kg = int(round(value_in_decimal * 100))
        else:
            self._price_per_kg = None

    @property
    def discounted_price_per_kg(self):
        return self._discounted_price_per_kg / 100 if self._discounted_price_per_kg is not None else None

    @discounted_price_per_kg.setter
    def discounted_price_per_kg(self, value_in_decimal):
        if value_in_decimal is not None:
            self._discounted_price_per_kg = int(round(value_in_decimal * 100))
        else:
            self._discounted_price_per_kg = None


watchlist_products = Table(
    "watchlist_products",
    Base.metadata,
    Column("watchlist_id", Integer, ForeignKey("watchlists.id", ondelete="CASCADE")),
    Column("product_id", Integer, ForeignKey("products.id", ondelete="CASCADE")),
    UniqueConstraint("watchlist_id", "product_id", name="watchlist_product_uc"),
)


class Watchlist(Base):
    __tablename__ = "watchlists"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    user = relationship("User", back_populates="watchlists")
    products = relationship("Product", secondary="watchlist_products", back_populates="watchlists")


# port 5432

# Create the database engine and tables
engine = create_engine(DATABASE_URL)

# If the tables exist, dont recreate
Base.metadata.create_all(engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
