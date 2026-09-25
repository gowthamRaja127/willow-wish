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

  /**
   * @param itemIds Optional subset of item ids to scope the share to. Omit
   * (or pass an empty array) to share the whole wishlist. Passing itemIds
   * always writes/overwrites the stored selection on the existing link
   * (unlike the no-arg "whole wishlist" path, which reuses any existing
   * token as-is) — the caller made an explicit choice, so no stale narrower
   * selection should linger on it.
   */
  async getWishlistShareToken(itemIds?: string[]): Promise<{ token: string | null; error: any }> {
    const user = this.sb.currentUser;
    if (!user) return { token: null, error: new Error('Not authenticated') };

    if (itemIds && itemIds.length > 0) {
      return this.regenerateWishlistShareToken(itemIds);
    }

    const { data: existing } = await this.sb.client
      .from('wishlist_shares')
      .select('token, item_ids')
      .eq('user_id', user.id)
      .maybeSingle();

    // Reuse the existing link only if it's already scoped to the whole
    // wishlist — an existing link narrowed to a prior selection must be
    // regenerated (cleared to item_ids: null) so "Share Wishlist" reliably
    // means "everything", not "whatever was last selected."
    if (existing?.token && (!existing.item_ids || existing.item_ids.length === 0)) {
      return { token: existing.token, error: null };
    }
    return this.regenerateWishlistShareToken();
  }

  async regenerateWishlistShareToken(itemIds?: string[]): Promise<{ token: string | null; error: any }> {
    const user = this.sb.currentUser;
    if (!user) return { token: null, error: new Error('Not authenticated') };

    const token = crypto.randomUUID();
    const { error } = await this.sb.client
      .from('wishlist_shares')
      .upsert({ user_id: user.id, token, item_ids: itemIds && itemIds.length > 0 ? itemIds : null });
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
