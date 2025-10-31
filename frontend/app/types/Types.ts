export type Shop = {
  id: number;
  name: string;
  logo_url: string;
};
export type PriceHistory = {
  sale_tag?: string;
  regular_price?: number;
  discounted_price?: number;
  price_per_kg?: number;
  discounted_price_per_kg?: number;
  discount_percentage?: number;
  created_at?: string;
};
export type Product = {
  id: number;
  name: string;
  link: string | null;
  img_full_src: string | null;
  img_thumbnail_src: string | null;
  shop_id: number;
  shop_name: string | null;
  price: string;
  last_updated: string;
  price_history: PriceHistory;
};
export type Watchlist = {
    id: number;
    name: string;
    products?: Product[];
    // ...other fields
  };

export type User = {
    id: number;
    first_name: string;
    last_name: string | null;
    username: string | null;
    email: string;
  };

  