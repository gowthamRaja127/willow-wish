import { Injectable, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { environment } from '../../../environments/environment';
import {
  WishlistItem, AddItemPayload, UpdateItemPayload,
  PriceHistoryEntry, WishlistStats, SortBy, FilterBy
} from '../models/wishlist.model';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private _items = signal<WishlistItem[]>([]);
  private _loading = signal(false);
  private _sortBy = signal<SortBy>('newest');
  private _filterBy = signal<FilterBy>('all');
  private _searchQuery = signal('');
  private _activeTag = signal<string | null>(null);

  items = this._items.asReadonly();
  loading = this._loading.asReadonly();
  sortBy = this._sortBy.asReadonly();
  filterBy = this._filterBy.asReadonly();
  searchQuery = this._searchQuery.asReadonly();
  activeTag = this._activeTag.asReadonly();

  filteredItems = computed(() => {
    let items = [...this._items()];
    const query = this._searchQuery().toLowerCase();

    // Search filter
    if (query) {
      items = items.filter(i =>
        i.product_name?.toLowerCase().includes(query) ||
        i.product_url.toLowerCase().includes(query) ||
        i.description?.toLowerCase().includes(query) ||
        i.tags?.some(t => t.toLowerCase().includes(query))
      );
    }

    // Active tag filter
    const activeTag = this._activeTag();
    if (activeTag) {
      items = items.filter(i => i.tags?.some(t => t.toLowerCase() === activeTag.toLowerCase()));
    }

    // Category filter
    switch (this._filterBy()) {
      case 'price_dropped':
        items = items.filter(i => i.current_price !== null && i.initial_price !== null && i.current_price < i.initial_price);
        break;
      case 'target_reached':
        items = items.filter(i => i.target_price !== null && i.current_price !== null && i.current_price <= i.target_price);
        break;
      case 'purchased':
        items = items.filter(i => i.is_purchased);
        break;
      case 'high_priority':
        items = items.filter(i => i.priority === 'high');
        break;
    }

    // Sorting
    switch (this._sortBy()) {
      case 'oldest':
        items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'newest':
        items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'price_asc':
        items.sort((a, b) => (a.current_price ?? 0) - (b.current_price ?? 0));
        break;
      case 'price_desc':
        items.sort((a, b) => (b.current_price ?? 0) - (a.current_price ?? 0));
        break;
      case 'name':
        items.sort((a, b) => (a.product_name ?? '').localeCompare(b.product_name ?? ''));
        break;
      case 'savings':
        items.sort((a, b) => {
          const savA = (a.initial_price ?? 0) - (a.current_price ?? 0);
          const savB = (b.initial_price ?? 0) - (b.current_price ?? 0);
          return savB - savA;
        });
        break;
    }

    return items;
  });

  stats = computed<WishlistStats>(() => {
    const items = this._items();
    return {
      total: items.length,
      totalSavings: items.reduce((sum, i) => {
        if (i.initial_price && i.current_price && i.current_price < i.initial_price) {
          return sum + (i.initial_price - i.current_price);
        }
        return sum;
      }, 0),
      priceDrop: items.filter(i => i.current_price !== null && i.initial_price !== null && i.current_price < i.initial_price).length,
      purchased: items.filter(i => i.is_purchased).length,
      targetReached: items.filter(i => i.target_price !== null && i.current_price !== null && i.current_price <= i.target_price).length,
    };
  });

  constructor(private sb: SupabaseService) {}

  async loadItems(): Promise<void> {
    const user = this.sb.currentUser;
    if (!user) return;

    this._loading.set(true);
    try {
      const { data, error } = await this.sb.client
        .from('items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      this._items.set(data ?? []);
    } finally {
      this._loading.set(false);
    }
  }

  async addItem(payload: AddItemPayload): Promise<{ data: WishlistItem | null; error: any }> {
    const user = this.sb.currentUser;
    if (!user) return { data: null, error: new Error('Not authenticated') };

    this._loading.set(true);
    try {
      const newItem: Partial<WishlistItem> = {
        user_id: user.id,
        product_url: payload.product_url,
        product_name: payload.product_name ?? null,
        description: payload.description ?? null,
        image_url: (payload as any).image_url ?? null,
        initial_price: (payload as any).initial_price ?? null,
        current_price: (payload as any).current_price ?? null,
        target_price: payload.target_price ?? null,
        target_purchase_date: payload.target_purchase_date ?? null,
        tags: payload.tags ?? [],
        priority: payload.priority ?? 'medium',
        notes: payload.notes ?? null,
        is_notified: false,
        is_purchased: false,
      };

      const { data, error } = await this.sb.client
        .from('items')
        .insert(newItem)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        this._items.update(items => [data, ...items]);
        // Fire-and-forget scrape: enriches image/price/title in background
        this.scrapeProduct(payload.product_url, data.id).then(enriched => {
          if (enriched) {
            this._items.update(items =>
              items.map(i => i.id === data.id ? { ...i, ...enriched } : i)
            );
          }
        });
      }
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Call the scrape-product Edge Function.
   * mode="preview": returns scraped data without writing to DB.
   * mode="enrich" (default): writes image/title/price into the item row.
   */
  async scrapeProduct(
    url: string,
    itemId?: string,
    mode: 'preview' | 'enrich' = 'enrich'
  ): Promise<{ image: string | null; title: string | null; desc: string | null; price: number } | null> {
    try {
      const fnUrl = `${environment.supabaseUrl}/functions/v1/scrape-product`;
      const session = this.sb.currentSession;
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
          'apikey': environment.supabaseKey,
        },
        body: JSON.stringify({ url, itemId, mode }),
      });
      const json = await res.json();
      if (!json.success) return null;
      return { image: json.image ?? null, title: json.title ?? null, desc: json.desc ?? null, price: json.price ?? 0 };
    } catch {
      return null;
    }
  }

  async updateItem(id: string, payload: UpdateItemPayload): Promise<{ error: any }> {
    try {
      const { error } = await this.sb.client
        .from('items')
        .update(payload)
        .eq('id', id);

      if (error) throw error;
      this._items.update(items =>
        items.map(item => item.id === id ? { ...item, ...payload } : item)
      );
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  async deleteItem(id: string): Promise<{ error: any }> {
    try {
      const { error } = await this.sb.client
        .from('items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      this._items.update(items => items.filter(item => item.id !== id));
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  async markPurchased(id: string): Promise<{ error: any }> {
    return this.updateItem(id, {
      is_purchased: true,
    });
  }

  async getPriceHistory(itemId: string): Promise<PriceHistoryEntry[]> {
    const { data, error } = await this.sb.client
      .from('price_history')
      .select('*')
      .eq('item_id', itemId)
      .order('recorded_at', { ascending: true });

    if (error) return [];
    return data ?? [];
  }

  setSortBy(sort: SortBy): void {
    this._sortBy.set(sort);
  }

  setFilterBy(filter: FilterBy): void {
    this._filterBy.set(filter);
  }

  setSearchQuery(query: string): void {
    this._searchQuery.set(query);
  }

  toggleTag(tag: string): void {
    this._activeTag.update(current => current === tag ? null : tag);
  }

  getPriceDrop(item: WishlistItem): number {
    if (!item.initial_price || !item.current_price) return 0;
    return item.initial_price - item.current_price;
  }

  getPriceDropPercent(item: WishlistItem): number {
    if (!item.initial_price || !item.current_price || item.initial_price === 0) return 0;
    return Math.round(((item.initial_price - item.current_price) / item.initial_price) * 100);
  }

  isTargetReached(item: WishlistItem): boolean {
    return !!(item.target_price && item.current_price && item.current_price <= item.target_price);
  }
}
