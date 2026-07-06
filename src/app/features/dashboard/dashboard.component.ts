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
import {
  WishlistItem,
  SortBy,
  FilterBy,
} from '../../core/models/wishlist.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ItemCardComponent,
    AddItemModalComponent,
    PriceHistoryModalComponent,
  ],
  template: `
    <div
      class="min-h-screen bg-background text-foreground pb-16 md:pb-0 md:pl-20 lg:pl-64 flex"
    >
      <!-- Desktop Sidebar -->
      <aside
        class="fixed inset-y-0 left-0 w-20 lg:w-64 bg-background border-r border-border hidden md:flex flex-col z-30 pt-8 pb-4 px-4 lg:px-6"
      >
        <div
          class="mb-10 flex items-center justify-center lg:justify-start px-2"
        >
          <img
            src="assets/logo.svg"
            alt="WillowWish"
            class="h-[8.5rem] w-auto hidden lg:block"
          />
          <!-- Icon-only for collapsed sidebar -->
          <div
            class="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0 lg:hidden"
          >
            <svg
              class="w-5 h-5 text-primary-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
        </div>

        <nav class="flex-1 space-y-4">
          <button
            (click)="setFilter('all')"
            [class]="
              filterBy() === 'all'
                ? 'flex items-center gap-4 p-3 w-full rounded-lg text-primary font-bold bg-muted'
                : 'flex items-center gap-4 p-3 w-full rounded-lg hover:bg-muted/50 transition-colors'
            "
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
            <span class="hidden lg:block text-base">All Items</span>
          </button>

          <button
            (click)="setFilter('price_dropped')"
            [class]="
              filterBy() === 'price_dropped'
                ? 'flex items-center gap-4 p-3 w-full rounded-lg text-primary font-bold bg-muted'
                : 'flex items-center gap-4 p-3 w-full rounded-lg hover:bg-muted/50 transition-colors'
            "
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
              />
            </svg>
            <span class="hidden lg:block text-base">Price Dropped</span>
          </button>

          <button
            (click)="setFilter('target_reached')"
            [class]="
              filterBy() === 'target_reached'
                ? 'flex items-center gap-4 p-3 w-full rounded-lg text-primary font-bold bg-muted'
                : 'flex items-center gap-4 p-3 w-full rounded-lg hover:bg-muted/50 transition-colors'
            "
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span class="hidden lg:block text-base">Targets Met</span>
          </button>

          <button
            (click)="setFilter('purchased')"
            [class]="
              filterBy() === 'purchased'
                ? 'flex items-center gap-4 p-3 w-full rounded-lg text-primary font-bold bg-muted'
                : 'flex items-center gap-4 p-3 w-full rounded-lg hover:bg-muted/50 transition-colors'
            "
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <span class="hidden lg:block text-base">Purchased</span>
          </button>

          <button
            (click)="showAddModal.set(true)"
            class="flex items-center gap-4 p-3 w-full rounded-lg hover:bg-muted/50 transition-colors mt-8 text-primary"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span class="hidden lg:block text-base font-bold">Add Item</span>
          </button>
        </nav>

        <div class="mt-auto pt-4 border-t border-border">
          <button
            (click)="signOut()"
            class="flex items-center gap-4 p-3 w-full rounded-lg hover:bg-muted/50 transition-colors"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span class="hidden lg:block text-base">Log Out</span>
          </button>
        </div>
      </aside>

      <!-- Mobile Bottom Nav -->
      <nav
        class="fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border flex items-center justify-around md:hidden z-30 px-4"
      >
        <button
          class="p-3"
          (click)="setFilter('all')"
          [class.text-primary]="filterBy() === 'all'"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        </button>
        <button
          class="p-3"
          (click)="setFilter('price_dropped')"
          [class.text-primary]="filterBy() === 'price_dropped'"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
            />
          </svg>
        </button>
        <button class="p-3 text-primary" (click)="showAddModal.set(true)">
          <svg
            class="w-7 h-7"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
        <button
          class="p-3"
          (click)="setFilter('target_reached')"
          [class.text-primary]="filterBy() === 'target_reached'"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>
        <button class="p-3" (click)="signOut()">
          <div
            class="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs"
          >
            {{ userInitial() }}
          </div>
        </button>
      </nav>

      <!-- Main Content -->
      <main
        class="flex-1 w-full min-h-screen bg-background"
      >
        <!-- Header: Profile-like stats -->
        <header
          class="p-6 md:p-10 border-b border-border flex flex-row items-center gap-6 sm:gap-10"
        >
          <div
            class="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-muted border border-border flex items-center justify-center text-3xl sm:text-4xl font-bold text-foreground shrink-0"
          >
            {{ userInitial() }}
          </div>
          <div class="flex-1 flex flex-col gap-3">
            <div class="flex items-center gap-4">
              <h1 class="text-xl sm:text-2xl font-semibold">
                {{ userEmail() }}
              </h1>
              <button
                (click)="toggleDark()"
                class="btn-secondary btn-sm rounded-lg hidden sm:flex"
              >
                Theme
              </button>
            </div>
            <div class="text-sm text-muted-foreground hidden sm:block">
              Organizing your wishes and catching price drops before they're
              gone. ✨
            </div>
            <!-- WhatsApp Updates Config -->
            <div class="flex items-center gap-2 mt-1 max-w-sm hidden sm:flex">
              <span class="text-xs text-muted-foreground whitespace-nowrap">WhatsApp No:</span>
              <div class="flex items-center gap-1.5 flex-1">
                <input
                  type="text"
                  placeholder="e.g. +919876543210"
                  [(ngModel)]="whatsappNumber"
                  class="input h-8 px-2.5 py-1 text-xs bg-muted/40 border border-border rounded-lg flex-1"
                />
                <button
                  (click)="saveWhatsappNumber()"
                  class="btn-primary text-[10px] h-8 px-3 rounded-lg flex items-center justify-center font-bold shrink-0"
                  [disabled]="savingWhatsapp()"
                >
                  {{ savingWhatsapp() ? '...' : 'Save' }}
                </button>
              </div>
            </div>
          </div>
        </header>

        <!-- Mobile bio & settings -->
        <div
          class="p-4 text-sm text-muted-foreground sm:hidden border-b border-border space-y-3"
        >
          <div>Organizing your wishes and catching price drops before they're gone. ✨</div>
          
          <div class="flex flex-col gap-1.5 pt-2 border-t border-border/40">
            <span class="text-xs text-muted-foreground font-medium">WhatsApp Updates:</span>
            <div class="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="e.g. +919876543210"
                [(ngModel)]="whatsappNumber"
                class="input h-8 px-2.5 py-1 text-xs bg-muted/40 border border-border rounded-lg flex-1"
              />
              <button
                (click)="saveWhatsappNumber()"
                class="btn-primary text-[10px] h-8 px-3 rounded-lg flex items-center justify-center font-bold shrink-0"
                [disabled]="savingWhatsapp()"
              >
                {{ savingWhatsapp() ? '...' : 'Save' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Stat tiles -->
        <div class="grid grid-cols-4 gap-3 p-4 border-b border-border">
          <div class="rounded-lg border border-border p-3">
            <div class="text-lg font-bold text-foreground">{{ stats().total }}</div>
            <div class="text-xs text-muted-foreground">Items</div>
          </div>
          <div class="rounded-lg border border-border p-3">
            <div class="text-lg font-bold text-foreground">{{ stats().priceDrop }}</div>
            <div class="text-xs text-muted-foreground">Drops</div>
          </div>
          <div class="rounded-lg border border-border p-3">
            <div class="text-lg font-bold text-foreground">₹{{ stats().totalSavings | number: '1.0-0' }}</div>
            <div class="text-xs text-muted-foreground">Saved</div>
          </div>
          <div class="rounded-lg border border-border p-3">
            <div class="text-lg font-bold text-foreground">{{ stats().purchased }}</div>
            <div class="text-xs text-muted-foreground">Purchased</div>
          </div>
        </div>

        <!-- Search & Sort -->
        <div
          class="flex items-center justify-between p-4 border-b border-border bg-background sticky top-0 z-10 gap-3"
        >
          <div class="flex-1 relative max-w-sm">
            <svg
              class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (input)="onSearch()"
              placeholder="Search wishlist..."
              class="input pl-9 h-9 rounded-lg"
            />
          </div>
          <div class="flex items-center gap-2">
            <!-- Grid Layout Toggle -->
            <button
              (click)="setViewMode('grid')"
              [class]="viewMode() === 'grid' ? 'p-2 rounded-full bg-primary/20 text-primary border border-primary/30' : 'p-2 rounded-full hover:bg-muted text-muted-foreground'"
              title="Grid View"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z"/>
              </svg>
            </button>
            <!-- List Layout Toggle -->
            <button
              (click)="setViewMode('list')"
              [class]="viewMode() === 'list' ? 'p-2 rounded-full bg-primary/20 text-primary border border-primary/30' : 'p-2 rounded-full hover:bg-muted text-muted-foreground'"
              title="List View"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
              </svg>
            </button>

            <select
              (change)="onSort($event)"
              class="input h-9 w-auto rounded-lg px-3 text-sm font-medium cursor-pointer appearance-none"
            >
              <option class="bg-card text-foreground" value="newest">
                Newest
              </option>
              <option class="bg-card text-foreground" value="oldest">
                Oldest
              </option>
              <option class="bg-card text-foreground" value="price_asc">
                Price ↑
              </option>
              <option class="bg-card text-foreground" value="price_desc">
                Price ↓
              </option>
              <option class="bg-card text-foreground" value="name">
                Name A-Z
              </option>
              <option class="bg-card text-foreground" value="savings">
                Most Saved
              </option>
            </select>
          </div>
        </div>

        <!-- Feed (Posts) -->
        <div class="bg-card">
          <!-- Loading -->
          @if (loading()) {
            <div class="space-y-6 py-6">
              @for (i of [1, 2, 3]; track i) {
                <div class="max-w-lg mx-auto border-b border-border pb-6">
                  <div class="flex items-center gap-3 p-3">
                    <div class="shimmer w-8 h-8 rounded-full"></div>
                    <div class="shimmer w-32 h-4 rounded"></div>
                  </div>
                  <div class="shimmer w-full aspect-square"></div>
                  <div class="p-4 space-y-3">
                    <div class="shimmer h-4 w-3/4 rounded"></div>
                    <div class="shimmer h-3 w-1/2 rounded"></div>
                  </div>
                </div>
              }
            </div>
          }

          <!-- Empty -->
          @if (!loading() && filteredItems().length === 0) {
            <div
              class="flex flex-col items-center justify-center py-24 text-center"
            >
              <div
                class="w-24 h-24 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center mb-6"
              >
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
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 class="text-xl font-semibold mb-2">
                {{ searchQuery ? 'No results found' : 'No items yet' }}
              </h3>
              <p class="text-muted-foreground text-sm max-w-xs mb-6">
                {{
                  searchQuery
                    ? 'Try changing your search terms.'
                    : 'When you add items to your wishlist, they will appear here.'
                }}
              </p>
            </div>
          }

          <!-- Post Stream -->
          @if (!loading() && filteredItems().length > 0) {
            <div [class]="viewMode() === 'grid' ? 'p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4' : 'p-4 flex flex-col gap-4'">
              @for (item of filteredItems(); track item.id) {
                <app-item-card
                  [item]="item"
                  [viewMode]="viewMode()"
                  (edit)="onEditItem($event)"
                  (deleted)="onDeleted($event)"
                  (viewHistory)="onViewHistory($event)"
                />
              }
            </div>
          }
        </div>
      </main>

      <!-- Add/Edit Modal -->
      @if (showAddModal()) {
        <app-add-item-modal
          [editItem]="editingItem()"
          (close)="closeModal()"
          (saved)="wishlistSvc.loadItems()"
        />
      }

      <!-- Price History Modal -->
      @if (historyItemId()) {
        <app-price-history-modal
          [itemId]="historyItemId()!"
          (close)="historyItemId.set(null)"
        />
      }

      <!-- Toasts -->
      <div class="fixed bottom-20 md:bottom-6 right-6 z-[100] space-y-2">
        @for (toast of toastSvc.toasts(); track toast.id) {
          <div
            class="toast"
            [class.toast-success]="toast.type === 'success'"
            [class.toast-error]="toast.type === 'error'"
            [class.toast-info]="toast.type === 'info'"
          >
            @if (toast.type === 'success') {
              <span>✅</span>
            }
            @if (toast.type === 'error') {
              <span>❌</span>
            }
            @if (toast.type === 'info') {
              <span>ℹ️</span>
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
  isDark = signal(false);
  viewMode = signal<'grid' | 'list'>('grid');
  searchQuery = '';
  whatsappNumber = '';
  savingWhatsapp = signal(false);

  constructor(
    public wishlistSvc: WishlistService,
    public toastSvc: ToastService,
    private sb: SupabaseService,
    private router: Router,
    private cookieSvc: CookieService,
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

  userEmail() {
    return this.sb.currentUser?.email ?? '';
  }
  userInitial() {
    return this.userEmail().charAt(0).toUpperCase();
  }

  async ngOnInit() {
    const dark = this.cookieSvc.get('ww-dark') === 'true';
    this.isDark.set(dark);
    document.documentElement.classList.toggle('dark', dark);

    const mode = (this.cookieSvc.get('ww-viewmode') as 'grid' | 'list') || 'grid';
    this.viewMode.set(mode);

    this.sb.user$.subscribe(user => {
      if (user) {
        this.whatsappNumber = user.user_metadata?.['whatsapp_number'] || '';
      }
    });

    await this.wishlistSvc.loadItems();
  }

  async saveWhatsappNumber() {
    if (!this.whatsappNumber) {
      this.toastSvc.error('Please enter a valid phone number');
      return;
    }
    this.savingWhatsapp.set(true);
    const { error } = await this.sb.client.auth.updateUser({
      data: { whatsapp_number: this.whatsappNumber }
    });
    this.savingWhatsapp.set(false);
    if (error) {
      this.toastSvc.error(error.message || 'Could not save number');
    } else {
      this.toastSvc.success('WhatsApp updates configured successfully!');
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
    // Persist preference in a cookie (365-day rolling, not security-sensitive)
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

  onDeleted(_id: string) {}

  closeModal() {
    this.showAddModal.set(false);
    this.editingItem.set(null);
  }

  async signOut() {
    await this.sb.signOut();
    this.router.navigate(['/auth/login']);
  }
}
