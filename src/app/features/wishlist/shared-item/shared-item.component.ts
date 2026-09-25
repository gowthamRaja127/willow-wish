import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ShareService, SharedItem } from '../../../core/services/share.service';
import { CookieService } from '../../../core/services/cookie.service';

@Component({
  selector: 'app-shared-item',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-background flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        <div class="flex items-center justify-center gap-2 mb-6">
          <img src="assets/logo-icon.svg" alt="WillowWish" class="h-8 w-8" />
          <span class="font-display font-bold text-foreground">WillowWish</span>
        </div>

        @if (loading()) {
          <div class="card p-6">
            <div class="shimmer w-full aspect-square rounded-lg mb-4"></div>
            <div class="shimmer h-5 w-3/4 rounded mb-2"></div>
            <div class="shimmer h-4 w-1/3 rounded"></div>
          </div>
        } @else if (!item()) {
          <div class="card p-8 text-center">
            <div class="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center mx-auto mb-4">
              <svg class="w-7 h-7 text-muted-foreground/50" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 class="font-semibold text-foreground mb-1">Link invalid or expired</h3>
            <p class="text-muted-foreground text-sm">This item is no longer shared.</p>
          </div>
        } @else {
          <div class="card p-6">
            <div class="relative w-full aspect-square bg-muted/30 rounded-lg mb-4 overflow-hidden flex items-center justify-center">
              @if (item()!.image_url) {
                <img [src]="item()!.image_url" [alt]="item()!.product_name" class="w-full h-full object-contain" />
              } @else {
                <svg class="w-12 h-12 text-muted-foreground/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
              @if (dropPercent() > 0) {
                <div class="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-md">
                  -{{ dropPercent() }}% OFF
                </div>
              }
            </div>
            <h1 class="text-xl font-display font-bold text-foreground">{{ item()!.product_name || 'Unnamed Product' }}</h1>
            @if (item()!.description) {
              <p class="text-sm text-muted-foreground mt-2">{{ item()!.description }}</p>
            }
            <div class="mt-4 flex items-baseline gap-3 flex-wrap">
              @if (item()!.current_price !== null) {
                <span class="text-2xl font-bold text-foreground">₹{{ item()!.current_price | number:'1.0-0' }}</span>
              }
              @if (dropPercent() > 0) {
                <span class="text-sm text-muted-foreground line-through">₹{{ item()!.initial_price | number:'1.0-0' }}</span>
              }
              @if (item()!.target_price) {
                <span class="text-sm text-muted-foreground">Target: ₹{{ item()!.target_price | number:'1.0-0' }}</span>
              }
            </div>
            @if (item()!.target_purchase_date) {
              <p class="text-xs text-muted-foreground mt-2">
                Planned purchase: {{ item()!.target_purchase_date | date: 'MMM d, y' }}
              </p>
            }
            @if (item()!.notes) {
              <p class="text-sm text-muted-foreground italic mt-3">"{{ item()!.notes }}"</p>
            }
            @if (item()!.is_purchased) {
              <div class="mt-3 badge-muted">Already purchased</div>
            }
            <button (click)="onProductClick()" class="btn-primary btn-md w-full mt-6">
              View Product
            </button>
            <p class="text-center text-xs text-muted-foreground mt-3">Sign in to view the product link</p>
          </div>

          <p class="text-center text-sm text-muted-foreground mt-6">
            Want to track prices like this yourself?
            <a routerLink="/auth/register" class="text-primary font-medium hover:underline">Create a free wishlist</a>
          </p>
        }
      </div>
    </div>
  `
})
export class SharedItemComponent implements OnInit {
  loading = signal(true);
  item = signal<SharedItem | null>(null);

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
      this.item.set(await this.shareSvc.fetchSharedItem(token));
    }
    this.loading.set(false);
  }

  dropPercent(): number {
    const i = this.item();
    if (!i?.initial_price || !i?.current_price || i.initial_price === 0) return 0;
    return Math.round(((i.initial_price - i.current_price) / i.initial_price) * 100);
  }

  onProductClick(): void {
    this.router.navigate(['/auth/login']);
  }
}
