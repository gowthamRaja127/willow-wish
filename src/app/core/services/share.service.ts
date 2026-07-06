import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { environment } from '../../../environments/environment';
import { WishlistItem } from '../models/wishlist.model';

export type SharedItem = Pick<WishlistItem,
  'id' | 'product_name' | 'description' | 'image_url' |
  'target_price' | 'current_price' | 'initial_price' | 'target_purchase_date' |
  'tags' | 'priority' | 'notes' | 'is_purchased' | 'created_at'
>;

@Injectable({ providedIn: 'root' })
export class ShareService {
  constructor(private sb: SupabaseService) {}

  async getItemShareToken(item: WishlistItem): Promise<{ token: string | null; error: any }> {
    if (item.share_token) return { token: item.share_token, error: null };
    return this.regenerateItemShareToken(item.id);
  }

  async regenerateItemShareToken(itemId: string): Promise<{ token: string | null; error: any }> {
    const token = crypto.randomUUID();
    const { error } = await this.sb.client.from('items').update({ share_token: token }).eq('id', itemId);
    if (error) return { token: null, error };
    return { token, error: null };
  }

  async getWishlistShareToken(): Promise<{ token: string | null; error: any }> {
    const user = this.sb.currentUser;
    if (!user) return { token: null, error: new Error('Not authenticated') };

    const { data: existing } = await this.sb.client
      .from('wishlist_shares')
      .select('token')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing?.token) return { token: existing.token, error: null };
    return this.regenerateWishlistShareToken();
  }

  async regenerateWishlistShareToken(): Promise<{ token: string | null; error: any }> {
    const user = this.sb.currentUser;
    if (!user) return { token: null, error: new Error('Not authenticated') };

    const token = crypto.randomUUID();
    const { error } = await this.sb.client
      .from('wishlist_shares')
      .upsert({ user_id: user.id, token });
    if (error) return { token: null, error };
    return { token, error: null };
  }

  async fetchSharedItem(token: string): Promise<SharedItem | null> {
    try {
      const res = await fetch(`${environment.supabaseUrl}/functions/v1/get-shared`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': environment.supabaseKey },
        body: JSON.stringify({ token, type: 'item' }),
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.item ?? null;
    } catch {
      return null;
    }
  }

  async fetchSharedWishlist(token: string): Promise<SharedItem[]> {
    try {
      const res = await fetch(`${environment.supabaseUrl}/functions/v1/get-shared`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': environment.supabaseKey },
        body: JSON.stringify({ token, type: 'wishlist' }),
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.items ?? [];
    } catch {
      return [];
    }
  }
}
