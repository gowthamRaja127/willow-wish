import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ShareService, SharedItem } from '../../../core/services/share.service';
import { CookieService } from '../../../core/services/cookie.service';

@Component({
  selector: 'app-shared-wishlist',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-background p-4 sm:p-8">
      <div class="max-w-5xl mx-auto">
        <!-- Branded header -->
        <div class="flex items-center justify-between gap-4 mb-8">
          <div class="flex items-center gap-3">
            <img src="assets/logo-icon.svg" alt="WillowWish" class="h-10 w-10" />
            <div>
              <h1 class="text-xl sm:text-2xl font-display font-bold text-foreground">Shared Wishlist</h1>
              @if (!loading() && items().length > 0) {
                <p class="text-xs sm:text-sm text-muted-foreground">
                  {{ items().length }} item{{ items().length === 1 ? '' : 's' }}
                  @if (totalValue() > 0) {
                    · worth ₹{{ totalValue() | number: '1.0-0' }}
                  }
                </p>
              }
            </div>
          </div>
          <a routerLink="/auth/register" class="btn-secondary btn-sm whitespace-nowrap hidden sm:inline-flex">
            Create your own
          </a>
        </div>

        @if (loading()) {
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            @for (i of [1, 2, 3, 4, 5, 6, 7, 8]; track i) {
              <div class="border border-border rounded-xl overflow-hidden">
                <div class="shimmer w-full aspect-square"></div>
                <div class="p-3 space-y-2">
                  <div class="shimmer h-4 w-3/4 rounded"></div>
                  <div class="shimmer h-3 w-1/2 rounded"></div>
                </div>
              </div>
            }
          </div>
        } @else if (items().length === 0) {
          <div class="flex flex-col items-center justify-center py-24 text-center">
            <div class="w-20 h-20 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center mb-6">
              <svg class="w-9 h-9 text-muted-foreground/50" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-foreground mb-1">Link invalid or empty</h3>
            <p class="text-muted-foreground text-sm max-w-xs">
              This share link doesn't work anymore, or the owner hasn't shared any items yet.
            </p>
          </div>
        } @else {
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            @for (item of items(); track item.id) {
              <div class="card card-hover p-3 flex flex-col relative overflow-hidden">
                <div class="relative w-full aspect-square bg-muted/30 rounded-lg mb-3 overflow-hidden flex items-center justify-center">
                  @if (item.image_url) {
                    <img [src]="item.image_url" [alt]="item.product_name" class="w-full h-full object-contain" />
                  } @else {
                    <svg class="w-10 h-10 text-muted-foreground/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  }
                  @if (dropPercent(item) > 0) {
                    <div class="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-md">
                      -{{ dropPercent(item) }}% OFF
                    </div>
                  }
                  @if (item.is_purchased) {
                    <div class="absolute inset-0 bg-background/85 backdrop-blur-[2px] flex items-center justify-center">
                      <span class="badge-muted">Already purchased</span>
                    </div>
                  }
                </div>
                <h3 class="font-semibold text-sm text-foreground truncate" [title]="item.product_name || 'Unnamed Product'">
                  {{ item.product_name || 'Unnamed Product' }}
                </h3>
                <div class="flex items-baseline gap-2 mt-1 flex-wrap">
                  @if (item.current_price !== null) {
                    <span class="font-bold text-foreground">₹{{ item.current_price | number: '1.0-0' }}</span>
                  } @else {
                    <span class="text-xs text-muted-foreground">No price data</span>
                  }
                  @if (dropPercent(item) > 0) {
                    <span class="text-xs text-muted-foreground line-through">₹{{ item.initial_price | number: '1.0-0' }}</span>
                  }
                </div>
                @if (item.target_purchase_date) {
                  <p class="text-[11px] text-muted-foreground mt-1">
                    Planned: {{ item.target_purchase_date | date: 'MMM d, y' }}
                  </p>
                }
                <button (click)="onProductClick()" class="btn-secondary btn-sm w-full mt-3">
                  View Product
                </button>
              </div>
            }
          </div>

          <div class="mt-10 text-center border-t border-border pt-8">
            <p class="text-sm text-muted-foreground mb-3">
              Want to track prices and get WhatsApp/email alerts on your own wishlist?
            </p>
            <a routerLink="/auth/register" class="btn-primary btn-md">Create your free WillowWish</a>
          </div>
        }
      </div>
    </div>
  `
})
export class SharedWishlistComponent implements OnInit {
  loading = signal(true);
  items = signal<SharedItem[]>([]);

  totalValue = computed(() =>
    this.items().reduce((sum, i) => sum + (i.current_price ?? 0), 0)
  );

  constructor(
    private route: ActivatedRoute,
    private shareSvc: ShareService,
    private router: Router,
    private cookieSvc: CookieService,
  ) {}

  async ngOnInit() {
    const dark = this.cookieSvc.get('ww-dark') === 'true';
    document.documentElement.classList.toggle('dark', dark);

    const token = this.route.snapshot.paramMap.get('token');
    if (token) {
      this.items.set(await this.shareSvc.fetchSharedWishlist(token));
    }
    this.loading.set(false);
  }

  dropPercent(item: SharedItem): number {
    if (!item.initial_price || !item.current_price || item.initial_price === 0) return 0;
    return Math.round(((item.initial_price - item.current_price) / item.initial_price) * 100);
  }

  onProductClick(): void {
    this.router.navigate(['/auth/login']);
  }
}
