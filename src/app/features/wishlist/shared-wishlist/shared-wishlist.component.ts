import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ShareService, SharedItem } from '../../../core/services/share.service';
import { CookieService } from '../../../core/services/cookie.service';

@Component({
  selector: 'app-shared-wishlist',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-background p-4 sm:p-8">
      <div class="max-w-5xl mx-auto">
        <h1 class="text-2xl font-display font-bold text-foreground mb-6">Shared Wishlist</h1>

        @if (loading()) {
          <div class="text-center text-muted-foreground py-16">Loading...</div>
        } @else if (items().length === 0) {
          <div class="text-center text-muted-foreground py-16">This link is invalid, expired, or the wishlist is empty.</div>
        } @else {
          <div class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            @for (item of items(); track item.id) {
              <div class="card p-3 flex flex-col">
                @if (item.image_url) {
                  <img [src]="item.image_url" [alt]="item.product_name" class="w-full aspect-square object-contain bg-muted/30 rounded-lg mb-3" />
                }
                <h3 class="font-semibold text-sm text-foreground truncate">{{ item.product_name || 'Unnamed Product' }}</h3>
                @if (item.current_price !== null) {
                  <span class="font-bold text-foreground mt-1">₹{{ item.current_price | number:'1.0-0' }}</span>
                }
                @if (item.is_purchased) {
                  <div class="badge-muted mt-2 self-start">Already purchased</div>
                }
                <button (click)="onProductClick()" class="btn-secondary btn-sm w-full mt-3">
                  View Product
                </button>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class SharedWishlistComponent implements OnInit {
  loading = signal(true);
  items = signal<SharedItem[]>([]);

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

  onProductClick(): void {
    this.router.navigate(['/auth/login']);
  }
}
