import { Component, signal, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WishlistItem } from '../../../core/models/wishlist.model';
import { WishlistService } from '../../../core/services/wishlist.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-item-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- ── GRID VIEW CARD ── -->
    @if (viewMode === 'grid') {
      <div class="bg-card border border-border rounded-xl overflow-hidden flex flex-col h-full relative group">
        <!-- Header -->
        <div class="flex items-center justify-between p-3 border-b border-border/40">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-foreground font-bold text-xs shrink-0">
              {{ item.product_name ? item.product_name.charAt(0).toUpperCase() : 'W' }}
            </div>
            <div class="flex flex-col min-w-0">
              <h3 class="font-semibold text-sm leading-none text-foreground flex items-center gap-1 truncate">
                {{ item.product_name || 'Unnamed Product' }}
                @if (item.priority === 'high') {
                  <span class="text-primary text-xs shrink-0" title="High Priority">🔥</span>
                }
              </h3>
              <p class="text-[10px] text-muted-foreground mt-0.5">Added {{ timeAgo(item.last_scraped_at) }}</p>
            </div>
          </div>

          <!-- Actions Dropdown -->
          <div class="relative action-menu-container">
            <button (click)="toggleActionsMenu($event)" class="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all" title="Options">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
            </button>

            @if (showActionsMenu()) {
              <div class="absolute right-0 mt-1 w-36 bg-card/90 backdrop-blur border border-border rounded-lg shadow-xl py-1 z-20 text-sm">
                <button (click)="onEdit($event)" class="flex items-center w-full px-3 py-2 hover:bg-muted text-foreground transition-colors gap-2">
                  <svg class="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                  </svg>
                  Edit
                </button>
                <hr class="border-border my-1" />
                @if (confirmingDelete()) {
                  <div class="px-2 py-1 space-y-1">
                    <p class="text-[10px] text-muted-foreground text-center">Are you sure?</p>
                    <div class="flex gap-1">
                      <button (click)="onDelete($event)" class="flex-1 text-center py-1 text-[10px] bg-destructive text-destructive-foreground rounded font-semibold hover:bg-destructive/80 transition-colors">Yes</button>
                      <button (click)="cancelDelete($event)" class="flex-1 text-center py-1 text-[10px] bg-muted text-foreground rounded hover:bg-muted/80 transition-colors">No</button>
                    </div>
                  </div>
                } @else {
                  <button (click)="confirmDelete($event)" class="flex items-center w-full px-3 py-2 hover:bg-muted text-destructive transition-colors gap-2">
                    <svg class="w-3.5 h-3.5 text-destructive" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                    Delete
                  </button>
                }
              </div>
            }
          </div>
        </div>

        <!-- Image -->
        <div class="relative w-full aspect-square bg-muted/30 flex items-center justify-center border-b border-border/40 overflow-hidden">
          @if (item.image_url) {
            <img [src]="item.image_url" [alt]="item.product_name" class="object-contain w-full h-full p-2 group-hover:scale-105 transition-transform duration-300" (error)="onImgError($event)" />
          } @else {
            <svg class="w-12 h-12 text-muted-foreground/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          }
          
          <!-- Badges -->
          <div class="absolute top-2 left-2 flex flex-col gap-1 z-10">
            @if (priceDrop > 0) {
              <div class="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-md">
                -{{ dropPercent }}% OFF
              </div>
            }
            @if (isTargetReached) {
              <div class="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                TARGET MET
              </div>
            }
          </div>

          @if (item.is_purchased) {
            <div class="absolute inset-0 bg-background/85 backdrop-blur-[2px] flex items-center justify-center z-10">
              <div class="text-center">
                <div class="text-4xl mb-1">✅</div>
                <p class="font-bold text-foreground text-sm">Purchased</p>
              </div>
            </div>
          }
        </div>

        <!-- Content -->
        <div class="p-3.5 flex flex-col flex-1">
          <!-- Pricing Block (With Red/Green Price Change Indicators) -->
          <div class="space-y-1.5 mb-2.5">
            <div class="flex flex-col gap-0.5">
              <div class="flex items-baseline gap-2 flex-wrap">
                @if (item.current_price !== null) {
                  <span class="font-bold text-lg text-foreground">₹{{ item.current_price | number:'1.0-0' }}</span>
                } @else {
                  <span class="text-muted-foreground text-xs">No price data</span>
                }

                @if (item.initial_price !== null && item.current_price !== null && item.initial_price !== item.current_price) {
                  @if (priceDirection === 'down') {
                    <span class="inline-flex items-center text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded gap-0.5">
                      <svg class="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>
                      </svg>
                      {{ priceChangePercent }}%
                    </span>
                  } @else if (priceDirection === 'up') {
                    <span class="inline-flex items-center text-xs font-semibold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded gap-0.5">
                      <svg class="w-3 h-3 text-rose-500" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5"/>
                      </svg>
                      {{ priceChangePercent }}%
                    </span>
                  }
                }
              </div>
              @if (item.initial_price !== null) {
                <span class="text-[10px] text-muted-foreground">Created price: ₹{{ item.initial_price | number:'1.0-0' }}</span>
              }
            </div>

            <div class="flex items-center justify-between text-xs text-muted-foreground">
              @if (item.target_price) {
                <span>Target: <span class="font-medium text-foreground/80">₹{{ item.target_price | number:'1.0-0' }}</span></span>
              }
              @if (item.target_purchase_date) {
                <span>By: <span class="font-medium text-foreground/80">{{ item.target_purchase_date | date:'MMM d, y' }}</span></span>
              }
            </div>
          </div>

          <!-- Description & Notes -->
          <div class="flex-1 space-y-1">
            @if (item.description) {
              <p class="text-xs text-foreground line-clamp-2 leading-relaxed">
                {{ item.description }}
              </p>
            }
            @if (item.notes) {
              <p class="text-[11px] text-muted-foreground italic line-clamp-2">
                "{{ item.notes }}"
              </p>
            }
          </div>

          <!-- Tags -->
          @if (item.tags?.length) {
            <div class="flex gap-1.5 flex-wrap my-3">
              @for (tag of item.tags; track tag) {
                <span class="text-primary text-[10px] font-medium bg-primary/5 px-2 py-0.5 rounded-full hover:bg-primary/10 cursor-pointer">
                  #{{ tag }}
                </span>
              }
            </div>
          }

          <!-- Footer Actions -->
          <div class="flex gap-2 mt-auto pt-3 border-t border-border/40">
            <a [href]="item.product_url" target="_blank" rel="noopener noreferrer" class="btn-secondary text-xs py-1.5 flex-1 text-center justify-center flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/>
              </svg>
              Buy Now
            </a>
            @if (!item.is_purchased) {
              <button (click)="onMarkPurchased()" class="btn-primary text-xs py-1.5 flex-1 flex items-center justify-center gap-1.5">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Mark Got
              </button>
            }
          </div>
        </div>
      </div>
    } @else {
      <!-- ── LIST VIEW ROW ── -->
      <div class="bg-card border border-border rounded-xl p-3 flex items-center gap-4 w-full relative group">
        <!-- Thumbnail -->
        <div class="relative w-16 h-16 sm:w-20 sm:h-20 bg-muted/30 rounded-lg overflow-hidden shrink-0 flex items-center justify-center border border-border/40">
          @if (item.image_url) {
            <img [src]="item.image_url" [alt]="item.product_name" class="object-contain w-full h-full p-1" (error)="onImgError($event)" />
          } @else {
            <svg class="w-8 h-8 text-muted-foreground/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          }
          
          @if (item.is_purchased) {
            <div class="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
              <span class="text-sm">✅</span>
            </div>
          }
        </div>

        <!-- Middle Info -->
        <div class="flex-1 min-w-0 py-0.5">
          <div class="flex items-center gap-2">
            <h3 class="font-semibold text-sm sm:text-base text-foreground truncate">
              {{ item.product_name || 'Unnamed Product' }}
            </h3>
            @if (item.priority === 'high') {
              <span class="text-primary text-xs shrink-0" title="High Priority">🔥</span>
            }
            @if (priceDrop > 0) {
              <span class="bg-primary/10 text-primary text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0">
                -{{ dropPercent }}%
              </span>
            }
          </div>
          
          <!-- Pricing -->
          <div class="flex items-baseline gap-2 mt-1 flex-wrap">
            @if (item.current_price !== null) {
              <span class="font-bold text-sm sm:text-base text-foreground">₹{{ item.current_price | number:'1.0-0' }}</span>
            }

            @if (item.initial_price !== null && item.current_price !== null && item.initial_price !== item.current_price) {
              @if (priceDirection === 'down') {
                <span class="inline-flex items-center text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-1 py-0.2 rounded gap-0.5">
                  <svg class="w-2.5 h-2.5 text-emerald-500" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>
                  </svg>
                  {{ priceChangePercent }}%
                </span>
              } @else if (priceDirection === 'up') {
                <span class="inline-flex items-center text-[10px] font-semibold text-rose-500 bg-rose-500/10 px-1 py-0.2 rounded gap-0.5">
                  <svg class="w-2.5 h-2.5 text-rose-500" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5"/>
                  </svg>
                  {{ priceChangePercent }}%
                </span>
              }
            }
            @if (item.initial_price !== null) {
              <span class="text-xs text-muted-foreground">(Created: ₹{{ item.initial_price | number:'1.0-0' }})</span>
            }
            @if (item.target_price) {
              <span class="text-xs text-muted-foreground">(Target: ₹{{ item.target_price | number:'1.0-0' }})</span>
            }
          </div>

          <!-- Description/Tags preview -->
          <div class="mt-1 hidden sm:block">
            @if (item.description) {
              <p class="text-xs text-muted-foreground line-clamp-1">
                {{ item.description }}
              </p>
            }
          </div>
          
          <!-- Tags list -->
          @if (item.tags?.length) {
            <div class="flex gap-1 flex-wrap mt-1">
              @for (tag of item.tags; track tag) {
                <span class="text-primary text-[9px] font-medium bg-primary/5 px-1.5 py-0.2 rounded-full">
                  #{{ tag }}
                </span>
              }
            </div>
          }
        </div>

        <!-- Right Side Actions & 3-dot Menu -->
        <div class="flex items-center gap-2 shrink-0">
          <a [href]="item.product_url" target="_blank" rel="noopener noreferrer" class="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all hidden xs:flex" title="Buy Now">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/>
            </svg>
          </a>
          @if (!item.is_purchased) {
            <button (click)="onMarkPurchased()" class="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all hidden xs:flex" title="Mark Purchased">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </button>
          }

          <!-- 3-dot dropdown menu -->
          <div class="relative action-menu-container">
            <button (click)="toggleActionsMenu($event)" class="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all" title="Options">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
            </button>

            @if (showActionsMenu()) {
              <div class="absolute right-0 mt-1 w-36 bg-card/90 backdrop-blur border border-border rounded-lg shadow-xl py-1 z-20 text-sm">
                <!-- Mobile fallback shortcuts inside 3-dot -->
                <a [href]="item.product_url" target="_blank" rel="noopener noreferrer" class="flex xs:hidden items-center w-full px-3 py-2 hover:bg-muted text-foreground transition-colors gap-2">
                  <svg class="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/>
                  </svg>
                  Buy Now
                </a>
                @if (!item.is_purchased) {
                  <button (click)="onMarkPurchased()" class="flex xs:hidden items-center w-full px-3 py-2 hover:bg-muted text-foreground transition-colors gap-2">
                    <svg class="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Mark Got
                  </button>
                }
                <hr class="border-border my-1 xs:hidden" />

                <button (click)="onEdit($event)" class="flex items-center w-full px-3 py-2 hover:bg-muted text-foreground transition-colors gap-2">
                  <svg class="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                  </svg>
                  Edit
                </button>
                <hr class="border-border my-1" />
                @if (confirmingDelete()) {
                  <div class="px-2 py-1 space-y-1">
                    <p class="text-[10px] text-muted-foreground text-center">Are you sure?</p>
                    <div class="flex gap-1">
                      <button (click)="onDelete($event)" class="flex-1 text-center py-1 text-[10px] bg-destructive text-destructive-foreground rounded font-semibold hover:bg-destructive/80 transition-colors">Yes</button>
                      <button (click)="cancelDelete($event)" class="flex-1 text-center py-1 text-[10px] bg-muted text-foreground rounded hover:bg-muted/80 transition-colors">No</button>
                    </div>
                  </div>
                } @else {
                  <button (click)="confirmDelete($event)" class="flex items-center w-full px-3 py-2 hover:bg-muted text-destructive transition-colors gap-2">
                    <svg class="w-3.5 h-3.5 text-destructive" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                    Delete
                  </button>
                }
              </div>
            }
          </div>
        </div>
      </div>
    }
  `
})
export class ItemCardComponent {
  @Input({ required: true }) item!: WishlistItem;
  @Input() viewMode: 'grid' | 'list' = 'grid';
  @Output() edit = new EventEmitter<WishlistItem>();
  @Output() deleted = new EventEmitter<string>();

  showActionsMenu = signal(false);
  confirmingDelete = signal(false);

  constructor(private wishlistSvc: WishlistService, private toast: ToastService) {}

  get priceDrop(): number { return this.wishlistSvc.getPriceDrop(this.item); }
  get dropPercent(): number { return this.wishlistSvc.getPriceDropPercent(this.item); }
  get isTargetReached(): boolean { return this.wishlistSvc.isTargetReached(this.item); }

  get priceDifference(): number | null {
    if (this.item.current_price === null || this.item.initial_price === null) return null;
    return this.item.current_price - this.item.initial_price;
  }

  get priceDirection(): 'down' | 'up' | 'none' {
    const diff = this.priceDifference;
    if (diff === null || diff === 0) return 'none';
    return diff < 0 ? 'down' : 'up';
  }

  get priceChangePercent(): number {
    if (!this.item.initial_price || !this.item.current_price) return 0;
    const diff = Math.abs(this.item.current_price - this.item.initial_price);
    return Math.round((diff / this.item.initial_price) * 100);
  }

  onImgError(e: Event) {
    (e.target as HTMLImageElement).style.display = 'none';
  }

  toggleActionsMenu(e: MouseEvent) {
    e.stopPropagation();
    this.showActionsMenu.update(v => !v);
  }

  confirmDelete(e: MouseEvent) {
    e.stopPropagation();
    this.confirmingDelete.set(true);
  }

  cancelDelete(e: MouseEvent) {
    e.stopPropagation();
    this.confirmingDelete.set(false);
  }

  onEdit(e: MouseEvent) {
    e.stopPropagation();
    this.edit.emit(this.item);
    this.showActionsMenu.set(false);
  }

  async onDelete(e: MouseEvent) {
    e.stopPropagation();
    const { error } = await this.wishlistSvc.deleteItem(this.item.id);
    this.showActionsMenu.set(false);
    if (error) {
      this.toast.error('Could not delete item');
      this.confirmingDelete.set(false);
    } else {
      this.toast.success('Item removed');
      this.deleted.emit(this.item.id);
    }
  }

  async onMarkPurchased() {
    const { error } = await this.wishlistSvc.markPurchased(this.item.id);
    if (error) this.toast.error('Could not update item');
    else this.toast.success('🎉 Marked as purchased!');
  }

  timeAgo(date: string): string {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.action-menu-container')) {
      this.showActionsMenu.set(false);
      this.confirmingDelete.set(false);
    }
  }
}
