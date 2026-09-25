import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WishlistService } from '../../core/services/wishlist.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { ToastService } from '../../core/services/toast.service';
import { CookieService } from '../../core/services/cookie.service';
import { ItemCardComponent } from '../wishlist/item-card/item-card.component';
import { AddItemModalComponent } from '../wishlist/add-item-modal/add-item-modal.component';
import { PriceHistoryModalComponent } from '../wishlist/price-history-modal/price-history-modal.component';
import { GroupTileComponent } from '../wishlist/group-tile/group-tile.component';
import { GroupNameModalComponent } from '../wishlist/group-name-modal/group-name-modal.component';
import { ShareService } from '../../core/services/share.service';
import { ExtensionBridgeService } from '../../core/services/extension-bridge.service';
import { isBlockedPlatformUrl } from '../../core/utils/blocked-platforms';
import { WishlistItem, SortBy, FilterBy } from '../../core/models/wishlist.model';

// Sub-components
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { HeaderComponent } from './components/header/header.component';
import { StatsComponent } from './components/stats/stats.component';
import { QuickAddModalComponent } from '../wishlist/quick-add-modal/quick-add-modal.component';

// External Package Icons
import { LucideSearch, LucideLayoutGrid, LucideList, LucideX } from '@lucide/angular';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ItemCardComponent,
    AddItemModalComponent,
    PriceHistoryModalComponent,
    GroupTileComponent,
    GroupNameModalComponent,
    SidebarComponent,
    HeaderComponent,
    StatsComponent,
    QuickAddModalComponent,
    LucideSearch,
    LucideLayoutGrid,
    LucideList,
    LucideX
  ],
  template: `
    <div class="min-h-screen bg-background text-foreground pb-16 md:pb-0 md:pl-20 lg:pl-64 flex">
      <!-- Desktop/Mobile Sidebar Navigation -->
      <app-sidebar
        [filterBy]="filterBy()"
        [userInitial]="userInitial()"
        [sharingWishlist]="sharingWishlist()"
        (filterChanged)="setFilter($event)"
        (addModalOpened)="showAddModal.set(true)"
        (quickAddOpened)="showQuickAdd.set(true)"
        (shareWishlist)="onShareWishlist()"
        (regenerateShare)="onRegenerateWishlistShare()"
        (signOut)="signOut()"
      />

      <!-- Main Content -->
      <main class="flex-1 w-full min-h-screen bg-background">
        <!-- Header Section -->
        <app-header
          [userInitial]="userInitial()"
          [userDisplayName]="userDisplayName()"
          [isDark]="isDark()"
          [editingWhatsapp]="editingWhatsapp()"
          [whatsappNumber]="whatsappNumber"
          [savingWhatsapp]="savingWhatsapp()"
          [maskedWhatsapp]="maskedWhatsapp()"
          (toggleDark)="toggleDark()"
          (editWhatsapp)="editingWhatsapp.set($event)"
          (whatsappNumberChange)="whatsappNumber = $event"
          (saveWhatsapp)="saveWhatsappNumber()"
        />

        <!-- Stats Grid -->
        <app-stats [stats]="stats()" />

        <!-- Search & Sort Controls -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border-b border-border bg-background sticky top-0 z-10 gap-3">
          <div class="flex items-center gap-3 w-full sm:w-auto flex-1">
            @if (activeTag()) {
              <button
                (click)="wishlistSvc.toggleTag(activeTag()!)"
                class="inline-flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary border border-primary/20 rounded-lg px-3 py-1.5 shrink-0 hover:bg-primary/25 transition-all"
              >
                #{{ activeTag() }}
                <svg lucideX class="w-3 h-3"></svg>
              </button>
            }
            <div class="flex-1 relative max-w-sm w-full">
              <svg lucideSearch class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"></svg>
              <input
                type="text"
                [(ngModel)]="searchQuery"
                (input)="onSearch()"
                placeholder="Search wishlist..."
                class="input pl-9 h-9 rounded-lg w-full"
              />
            </div>
          </div>
          <div class="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t border-border/10 sm:border-t-0">
            <!-- Grid Layout Toggle -->
            <button
              (click)="setViewMode('grid')"
              [class]="
                viewMode() === 'grid'
                  ? 'p-2 rounded-full bg-primary/20 text-primary border border-primary/30'
                  : 'p-2 rounded-full hover:bg-muted text-muted-foreground'
              "
              title="Grid View"
            >
              <svg lucideLayoutGrid class="w-4 h-4"></svg>
            </button>
            <!-- List Layout Toggle -->
            <button
              (click)="setViewMode('list')"
              [class]="
                viewMode() === 'list'
                  ? 'p-2 rounded-full bg-primary/20 text-primary border border-primary/30'
                  : 'p-2 rounded-full hover:bg-muted text-muted-foreground'
              "
              title="List View"
            >
              <svg lucideList class="w-4 h-4"></svg>
            </button>

            <!-- Sort dropdown -->
            <div class="relative flex-1 sm:flex-initial">
              <select
                (change)="onSort($event)"
                class="input h-9 w-full sm:w-auto rounded-lg pl-3 pr-8 text-sm font-medium cursor-pointer appearance-none"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="price_asc">Price ↑</option>
                <option value="price_desc">Price ↓</option>
                <option value="name">Name A-Z</option>
                <option value="savings">Most Saved</option>
              </select>
              <svg
                class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Wishlist Stream -->
        <div class="bg-card">
          <!-- Loading State Shimmer -->
          @if (loading()) {
            <div class="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              @for (i of [1, 2, 3, 4, 5]; track i) {
                <div class="border border-border rounded-xl overflow-hidden">
                  <div class="flex items-center gap-3 p-3">
                    <div class="shimmer w-8 h-8 rounded-full"></div>
                    <div class="shimmer w-20 h-4 rounded"></div>
                  </div>
                  <div class="shimmer w-full aspect-square"></div>
                  <div class="p-3.5 space-y-3">
                    <div class="shimmer h-4 w-3/4 rounded"></div>
                    <div class="shimmer h-3 w-1/2 rounded"></div>
                  </div>
                </div>
              }
            </div>
          }

          <!-- Empty State -->
          @if (!loading() && filteredItems().length === 0) {
            <div class="flex flex-col items-center justify-center py-24 text-center">
              <div class="w-24 h-24 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center mb-6">
                <svg
                  class="w-10 h-10 text-muted-foreground/50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    [attr.d]="emptyStateIcon"
                  />
                </svg>
              </div>
              <h3 class="text-xl font-semibold mb-2">
                {{ emptyStateTitle }}
              </h3>
              <p class="text-muted-foreground text-sm max-w-xs mb-6">
                {{ emptyStateSubtitle }}
              </p>
            </div>
          }

          <!-- Item Grid/List -->
          @if (!loading() && filteredItems().length > 0) {
            <div
              [class]="
                viewMode() === 'grid'
                  ? 'p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
                  : 'p-4 flex flex-col gap-4'
              "
              (dragover)="onGridDragOver($event)"
              (drop)="onGridDrop($event)"
            >
              @for (
                tile of wishlistSvc.tiles();
                track tile.type === 'item' ? tile.item.id : tile.group.id
              ) {
                @if (tile.type === 'item') {
                  <app-item-card
                    [item]="tile.item"
                    [viewMode]="viewMode()"
                    (edit)="onEditItem($event)"
                    (deleted)="onDeleted($event)"
                    (viewHistory)="onViewHistory($event)"
                    (tagClick)="onTagClick($event)"
                    (droppedItemId)="onDroppedOnItem($event, tile.item)"
                  />
                } @else {
                  <app-group-tile
                    [group]="tile.group"
                    [items]="tile.items"
                    [viewMode]="viewMode()"
                    (edit)="onEditItem($event)"
                    (deleted)="onDeleted($event)"
                    (viewHistory)="onViewHistory($event)"
                    (tagClick)="onTagClick($event)"
                    (removeFromGroup)="onRemoveFromGroup($event)"
                    (droppedOnGroup)="onDroppedOnGroup($event, tile.group.id)"
                  />
                }
              }
            </div>
          }
        </div>
      </main>

      <!-- Add/Edit Modal Component -->
      @if (showAddModal()) {
        <app-add-item-modal
          [editItem]="editingItem()"
          (close)="closeModal()"
          (saved)="wishlistSvc.loadItems()"
        />
      }

      <!-- Price History Modal Component -->
      @if (historyItemId()) {
        <app-price-history-modal
          [itemId]="historyItemId()!"
          (close)="historyItemId.set(null)"
        />
      }

      <!-- Group Name Modal Component -->
      @if (pendingGroupItemIds()) {
        <app-group-name-modal
          (confirmed)="onGroupNameConfirmed($event)"
          (close)="pendingGroupItemIds.set(null)"
        />
      }

      <!-- Quick Add Modal Component -->
      @if (showQuickAdd()) {
        <app-quick-add-modal
          [quickAdding]="quickAdding()"
          (close)="showQuickAdd.set(false)"
          (add)="onQuickAdd($event)"
        />
      }

      <!-- Toasts Container -->
      <div class="fixed bottom-20 md:bottom-6 right-6 z-[100] space-y-2">
        @for (toast of toastSvc.toasts(); track toast.id) {
          <div
            class="toast"
            [class.toast-success]="toast.type === 'success'"
            [class.toast-error]="toast.type === 'error'"
            [class.toast-info]="toast.type === 'info'"
          >
            @if (toast.type === 'success') {
              <svg
                class="w-4 h-4 shrink-0"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            @if (toast.type === 'error') {
              <svg
                class="w-4 h-4 shrink-0"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 9v3.75m0 3.75h.008M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            @if (toast.type === 'info') {
              <svg
                class="w-4 h-4 shrink-0"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                />
              </svg>
            }
            {{ toast.message }}
            <button
              (click)="toastSvc.dismiss(toast.id)"
              class="ml-auto opacity-70 hover:opacity-100"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  showAddModal = signal(false);
  editingItem = signal<WishlistItem | null>(null);
  historyItemId = signal<string | null>(null);
  pendingGroupItemIds = signal<[string, string] | null>(null);
  showQuickAdd = signal(false);
  quickAdding = signal(false);
  quickAddUrl = '';
  sharingWishlist = signal(false);
  isDark = signal(false);
  viewMode = signal<'grid' | 'list'>('grid');
  searchQuery = '';
  whatsappNumber = '';
  savingWhatsapp = signal(false);
  editingWhatsapp = signal(false);

  constructor(
    public wishlistSvc: WishlistService,
    public toastSvc: ToastService,
    private sb: SupabaseService,
    private router: Router,
    private cookieSvc: CookieService,
    private shareSvc: ShareService,
    private extensionBridge: ExtensionBridgeService,
  ) {}

  get filteredItems() {
    return this.wishlistSvc.filteredItems;
  }
  get loading() {
    return this.wishlistSvc.loading;
  }
  get stats() {
    return this.wishlistSvc.stats;
  }
  get filterBy() {
    return this.wishlistSvc.filterBy;
  }
  get activeTag() {
    return this.wishlistSvc.activeTag;
  }

  userEmail() {
    return this.sb.currentUser?.email ?? '';
  }
  userDisplayName(): string {
    const local = this.userEmail().split('@')[0] || '';
    const name = local
      .split(/\d+/)
      .filter(Boolean)
      .join(' ');
    if (!name) return this.userEmail();
    return name
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }
  userInitial() {
    return this.userDisplayName().charAt(0).toUpperCase();
  }
  maskedWhatsapp(): string {
    const num = this.whatsappNumber?.trim() || '';
    if (!num) return 'Not set';
    if (num.length <= 4) return '*'.repeat(num.length);
    const first = num.slice(0, 2);
    const last = num.slice(-2);
    const middle = '*'.repeat(num.length - 4);
    return `${first}${middle}${last}`;
  }

  get emptyStateIcon(): string {
    if (this.searchQuery) {
      return 'm21 21-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607Z';
    }
    switch (this.filterBy()) {
      case 'price_dropped':
        return 'M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.169.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3zM6 6h.008v.008H6V6z';
      case 'target_reached':
        return 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'purchased':
        return 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z';
      default:
        return 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z';
    }
  }

  get emptyStateTitle(): string {
    if (this.searchQuery) return 'No results found';
    switch (this.filterBy()) {
      case 'price_dropped':
        return 'No price drops yet';
      case 'target_reached':
        return 'No targets met yet';
      case 'purchased':
        return 'Nothing purchased yet';
      default:
        return 'No items yet';
    }
  }

  get emptyStateSubtitle(): string {
    if (this.searchQuery) return 'Try changing your search terms.';
    switch (this.filterBy()) {
      case 'price_dropped':
        return "We'll show items here as soon as a price drops.";
      case 'target_reached':
        return "Set a target price on an item and it'll show up here once reached.";
      case 'purchased':
        return 'Items you mark as purchased will show up here.';
      default:
        return 'When you add items to your wishlist, they will appear here.';
    }
  }

  async ngOnInit() {
    const dark = this.cookieSvc.get('ww-dark') === 'true';
    this.isDark.set(dark);
    document.documentElement.classList.toggle('dark', dark);

    const mode =
      (this.cookieSvc.get('ww-viewmode') as 'grid' | 'list') || 'grid';
    this.viewMode.set(mode);

    this.sb.user$.subscribe((user) => {
      if (user) {
        this.whatsappNumber = user.user_metadata?.['whatsapp_number'] || '';
      }
    });

    await this.wishlistSvc.loadItems();
    await this.wishlistSvc.loadGroups();
  }

  async saveWhatsappNumber() {
    if (!this.whatsappNumber) {
      this.toastSvc.error('Please enter a valid phone number');
      return;
    }
    this.savingWhatsapp.set(true);
    const { error } = await this.sb.client.auth.updateUser({
      data: { whatsapp_number: this.whatsappNumber },
    });
    this.savingWhatsapp.set(false);
    if (error) {
      this.toastSvc.error(error.message || 'Could not save number');
    } else {
      this.toastSvc.success('WhatsApp updates configured successfully!');
      this.editingWhatsapp.set(false);
    }
  }

  setViewMode(mode: 'grid' | 'list') {
    this.viewMode.set(mode);
    this.cookieSvc.set('ww-viewmode', mode, { expires: 365, sameSite: 'Lax' });
  }

  toggleDark() {
    const next = !this.isDark();
    this.isDark.set(next);
    document.documentElement.classList.toggle('dark', next);
    this.cookieSvc.set('ww-dark', String(next), {
      expires: 365,
      sameSite: 'Lax',
    });
  }

  setFilter(f: FilterBy) {
    this.wishlistSvc.setFilterBy(f);
  }

  onSort(e: Event) {
    this.wishlistSvc.setSortBy((e.target as HTMLSelectElement).value as SortBy);
  }

  onSearch() {
    this.wishlistSvc.setSearchQuery(this.searchQuery);
  }

  onEditItem(item: WishlistItem) {
    this.editingItem.set(item);
    this.showAddModal.set(true);
  }

  onViewHistory(item: WishlistItem) {
    this.historyItemId.set(item.id);
  }

  onTagClick(tag: string) {
    this.wishlistSvc.toggleTag(tag);
  }

  onDroppedOnItem(draggedId: string, targetItem: WishlistItem) {
    if (targetItem.group_id) {
      this.wishlistSvc
        .addToGroup(targetItem.group_id, [draggedId])
        .then(({ error }) => {
          if (error) this.toastSvc.error('Could not add to group');
        });
      return;
    }
    this.pendingGroupItemIds.set([draggedId, targetItem.id]);
  }

  onDroppedOnGroup(draggedId: string, groupId: string) {
    this.wishlistSvc.addToGroup(groupId, [draggedId]).then(({ error }) => {
      if (error) this.toastSvc.error('Could not add to group');
    });
  }

  async onGroupNameConfirmed(name: string) {
    const ids = this.pendingGroupItemIds();
    this.pendingGroupItemIds.set(null);
    if (!ids) return;
    const { error } = await this.wishlistSvc.createGroup(name, ids);
    if (error) this.toastSvc.error('Could not create group');
    else this.toastSvc.success(`Grouped into "${name}"`);
  }

  async onRemoveFromGroup(itemId: string) {
    const { error } = await this.wishlistSvc.removeFromGroup(itemId);
    if (error) this.toastSvc.error('Could not remove from group');
  }

  onGridDragOver(e: DragEvent) {
    e.preventDefault();
  }

  async onGridDrop(e: DragEvent) {
    e.preventDefault();
    const draggedId = e.dataTransfer?.getData('text/plain');
    if (!draggedId) return;
    const { error } = await this.wishlistSvc.removeFromGroup(draggedId);
    if (error) this.toastSvc.error('Could not remove from group');
  }

  async onQuickAdd(url?: string) {
    const targetUrl = url || this.quickAddUrl;
    if (!targetUrl) return;
    this.quickAdding.set(true);
    const { data, error } = await this.wishlistSvc.addItem({
      product_url: targetUrl,
    });
    this.quickAdding.set(false);
    if (error) {
      this.toastSvc.error('Could not add item: ' + (error.message ?? error));
      return;
    }
    this.quickAddUrl = '';
    this.showQuickAdd.set(false);

    if (data && isBlockedPlatformUrl(targetUrl)) {
      this.toastSvc.success('Added! Asking your browser extension for details...');
      this.extensionBridge.fetchItemNow(targetUrl, data.id).then((result) => {
        if (result?.updated) {
          this.toastSvc.success('Product details fetched!');
        }
      });
    } else {
      this.toastSvc.success('Added! Fetching product details...');
    }
  }

  async onShareWishlist() {
    this.sharingWishlist.set(true);
    const { token, error } = await this.shareSvc.getWishlistShareToken();
    this.sharingWishlist.set(false);
    await this.copyWishlistShareLink(token, error);
  }

  async onRegenerateWishlistShare() {
    this.sharingWishlist.set(true);
    const { token, error } = await this.shareSvc.regenerateWishlistShareToken();
    this.sharingWishlist.set(false);
    await this.copyWishlistShareLink(token, error);
  }

  private async copyWishlistShareLink(token: string | null, error: any) {
    if (error || !token) {
      this.toastSvc.error('Could not create share link');
      return;
    }
    const url = `${window.location.origin}/shared/list/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      this.toastSvc.success('Wishlist share link copied to clipboard!');
    } catch {
      this.toastSvc.info(`Share link: ${url}`);
    }
  }

  onDeleted(_id: string) {}

  closeModal() {
    this.showAddModal.set(false);
    this.editingItem.set(null);
  }

  async signOut() {
    if (confirm('Are you sure you want to log out?')) {
      await this.sb.signOut();
      this.router.navigate(['/auth/login']);
    }
  }
}
