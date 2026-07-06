export interface WishlistItem {
  id: string;
  user_id: string;
  product_url: string;
  product_name: string | null;
  description: string | null;
  image_url: string | null;
  target_price: number | null;
  initial_price: number | null;
  current_price: number | null;
  target_purchase_date: string | null;
  is_notified: boolean;
  created_at: string;
  last_scraped_at: string;
  tags?: string[];
  category?: string | null;
  priority?: 'low' | 'medium' | 'high';
  is_purchased?: boolean;
  purchased_at?: string | null;
  notes?: string | null;
  share_token?: string | null;
}

export interface PriceHistoryEntry {
  id: string;
  item_id: string;
  price: number;
  recorded_at: string;
}

export interface AddItemPayload {
  product_url: string;
  product_name?: string | null;
  description?: string | null;
  target_price?: number | null;
  target_purchase_date?: string | null;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  notes?: string | null;
}

export interface UpdateItemPayload {
  product_name?: string;
  description?: string;
  target_price?: number | null;
  target_purchase_date?: string | null;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  notes?: string | null;
  is_purchased?: boolean;
}

export type SortBy = 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'name' | 'savings';
export type FilterBy = 'all' | 'price_dropped' | 'target_reached' | 'purchased' | 'high_priority';

export interface WishlistStats {
  total: number;
  totalSavings: number;
  priceDrop: number;
  purchased: number;
  targetReached: number;
}
