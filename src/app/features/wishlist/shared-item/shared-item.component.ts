import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ShareService, SharedItem } from '../../../core/services/share.service';
import { CookieService } from '../../../core/services/cookie.service';

@Component({
  selector: 'app-shared-item',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-background flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        @if (loading()) {
          <div class="text-center text-muted-foreground">Loading...</div>
        } @else if (!item()) {
          <div class="text-center text-muted-foreground">This link is invalid or has expired.</div>
        } @else {
          <div class="card p-6">
            @if (item()!.image_url) {
              <img [src]="item()!.image_url" [alt]="item()!.product_name" class="w-full aspect-square object-contain bg-muted/30 rounded-lg mb-4" />
            }
            <h1 class="text-xl font-display font-bold text-foreground">{{ item()!.product_name || 'Unnamed Product' }}</h1>
            @if (item()!.description) {
              <p class="text-sm text-muted-foreground mt-2">{{ item()!.description }}</p>
            }
            <div class="mt-4 flex items-baseline gap-3">
              @if (item()!.current_price !== null) {
                <span class="text-2xl font-bold text-foreground">₹{{ item()!.current_price | number:'1.0-0' }}</span>
              }
              @if (item()!.target_price) {
                <span class="text-sm text-muted-foreground">Target: ₹{{ item()!.target_price | number:'1.0-0' }}</span>
              }
            </div>
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

  onProductClick(): void {
    this.router.navigate(['/auth/login']);
  }
}
