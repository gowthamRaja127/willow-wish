import { Component, signal, Output, EventEmitter, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WishlistItem, AddItemPayload, UpdateItemPayload } from '../../../core/models/wishlist.model';
import { WishlistService } from '../../../core/services/wishlist.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-add-item-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="onBackdropClick($event)">
      <div class="modal-content max-w-lg" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-xl font-display font-bold text-foreground">
              {{ editItem ? 'Edit Item Details' : 'Add to Wishlist' }}
            </h2>
            <p class="text-sm text-muted-foreground mt-0.5">
              {{ editItem ? 'Update details of your wish' : 'Add details or let us auto-scrape them' }}
            </p>
          </div>
          <button (click)="requestClose()" class="btn-ghost btn-icon">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form (ngSubmit)="onSubmit()" class="space-y-4">
          <!-- Product URL / Auto-Scrape Row -->
          @if (!editItem) {
            <div class="space-y-1.5">
              <label class="text-sm font-medium text-foreground">Product URL *</label>
              <div class="flex gap-2">
                <input
                  type="url"
                  [(ngModel)]="form.product_url"
                  name="url"
                  required
                  placeholder="https://amazon.in/dp/... or flipkart.com/..."
                  class="input flex-1"
                  [disabled]="loading() || scrapingPreview()"
                  autofocus
                />
                <button
                  type="button"
                  (click)="autoScrape()"
                  [disabled]="!form.product_url || loading() || scrapingPreview()"
                  class="btn-secondary whitespace-nowrap flex items-center gap-2"
                >
                  @if (scrapingPreview()) {
                    <svg class="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Scraping...
                  } @else {
                    <span>Auto-Fill</span>
                  }
                </button>
              </div>
            </div>
          }

          <!-- Image Preview (if present) -->
          @if (scrapedImage() || form.image_url) {
            <div class="flex items-center gap-3 p-2 bg-muted/40 rounded-lg border border-border">
              <img
                [src]="scrapedImage() || form.image_url"
                alt="Product Preview"
                class="w-14 h-14 object-cover rounded border border-border"
              />
              <div>
                <p class="text-xs text-muted-foreground">Product Image Found</p>
                <p class="text-[10px] text-primary mt-0.5 truncate max-w-[280px]">
                  {{ scrapedImage() || form.image_url }}
                </p>
              </div>
            </div>
          }

          <!-- Product Name & Description -->
          <div class="space-y-3 pb-3 border-b border-border">
            <div class="space-y-1.5">
              <label class="text-sm font-medium text-foreground">Product Name</label>
              <input
                type="text"
                [(ngModel)]="form.product_name"
                name="product_name"
                placeholder="Product title (e.g. Sony Headset)"
                class="input"
                [disabled]="loading() || scrapingPreview()"
                [attr.autofocus]="editItem ? '' : null"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-sm font-medium text-foreground">Description</label>
              <input
                type="text"
                [(ngModel)]="form.description"
                name="description"
                placeholder="Product description/details"
                class="input"
                [disabled]="loading() || scrapingPreview()"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-sm font-medium text-foreground">Image URL</label>
              <input
                type="url"
                [(ngModel)]="form.image_url"
                name="image_url"
                placeholder="https://example.com/image.jpg"
                class="input"
                [disabled]="loading() || scrapingPreview()"
              />
            </div>
          </div>

          <!-- Price & Priority -->
          <div class="grid grid-cols-2 gap-3">
            @if (editItem) {
              <div class="space-y-1.5">
                <label class="text-sm font-medium text-foreground">Current Price (₹)</label>
                <input
                  type="number"
                  [(ngModel)]="form.current_price"
                  name="current_price"
                  placeholder="Current Price"
                  step="1"
                  min="0"
                  class="input"
                  [disabled]="loading()"
                />
                <p class="text-[11px] text-muted-foreground">Correct this if auto-scraping got it wrong.</p>
              </div>
            }
            <div class="space-y-1.5">
              <label class="text-sm font-medium text-foreground">Target Price (₹)</label>
              <input
                type="number"
                [(ngModel)]="form.target_price"
                name="target_price"
                placeholder="Target Price"
                step="1"
                min="0"
                class="input"
                [disabled]="loading()"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-sm font-medium text-foreground">Priority</label>
              <div class="relative">
                <select [(ngModel)]="form.priority" name="priority" class="input pr-8 appearance-none cursor-pointer">
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🔴 High</option>
                </select>
                <svg class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </div>
            </div>
          </div>

          <!-- Target Purchase Date -->
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground">Target Purchase Date</label>
            <div class="grid grid-cols-3 gap-2">
              <!-- Day -->
              <div class="relative">
                <select [(ngModel)]="dateDay" name="dateDay" (ngModelChange)="syncDate()" class="input text-sm pr-7 appearance-none cursor-pointer" [disabled]="loading()">
                  <option value="">Day</option>
                  @for (d of days(); track d) {
                    <option [value]="d">{{ d }}</option>
                  }
                </select>
                <svg class="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </div>
              <!-- Month -->
              <div class="relative">
                <select [(ngModel)]="dateMonth" name="dateMonth" (ngModelChange)="onMonthOrYearChange()" class="input text-sm pr-7 appearance-none cursor-pointer" [disabled]="loading()">
                  @for (m of months; track m.value) {
                    <option [value]="m.value">{{ m.label }}</option>
                  }
                </select>
                <svg class="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </div>
              <!-- Year -->
              <div class="relative">
                <select [(ngModel)]="dateYear" name="dateYear" (ngModelChange)="onMonthOrYearChange()" class="input text-sm pr-7 appearance-none cursor-pointer" [disabled]="loading()">
                  @for (y of years; track y) {
                    <option [value]="y">{{ y }}</option>
                  }
                </select>
                <svg class="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </div>
            </div>
            <!-- Reminder Time -->
            <div class="grid grid-cols-2 gap-2 mt-2">
              <div class="relative">
                <select [(ngModel)]="hour" name="reminderHour" (ngModelChange)="syncDate()" class="input text-sm pr-7 appearance-none cursor-pointer" [disabled]="loading()">
                  <option value="">Hour</option>
                  @for (h of hours; track h) {
                    <option [value]="h">{{ h }}</option>
                  }
                </select>
                <svg class="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </div>
              <div class="relative">
                <select [(ngModel)]="minute" name="reminderMinute" (ngModelChange)="syncDate()" class="input text-sm pr-7 appearance-none cursor-pointer" [disabled]="loading()">
                  <option value="">Minute</option>
                  @for (m of minutes; track m) {
                    <option [value]="m">{{ m }}</option>
                  }
                </select>
                <svg class="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </div>
            </div>
            @if (form.target_purchase_date) {
              <p class="text-xs text-muted-foreground pt-0.5">
                Reminder: <span class="text-primary font-medium">{{ form.target_purchase_date | date: "MMM d, y 'at' h:mm a" }}</span>
                — we'll message you on WhatsApp/email around then.
                <button type="button" class="ml-2 text-destructive hover:underline text-xs" (click)="clearDate()">Clear</button>
              </p>
            }
          </div>

          <!-- Tags -->
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground">Tags (comma separated)</label>
            <input type="text" [(ngModel)]="tagsInput" name="tags"
              placeholder="electronics, wishlist, birthday" class="input" [disabled]="loading()"/>
          </div>

          <!-- Notes -->
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground">Notes</label>
            <textarea [(ngModel)]="form.notes" name="notes" rows="2"
              placeholder="Notes..." class="input resize-none h-auto py-2" [disabled]="loading()"></textarea>
          </div>

          <!-- Buttons -->
          <div class="flex gap-3 pt-2">
            <button type="button" (click)="requestClose()" class="btn-secondary btn-md flex-1">Cancel</button>
            <button type="submit" class="btn-primary btn-md flex-1" [disabled]="loading() || scrapingPreview()">
              @if (loading()) {
                <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              }
              {{ editItem ? 'Save Changes' : 'Add Item' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class AddItemModalComponent implements OnInit {
  @Input() editItem: WishlistItem | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  loading = signal(false);
  scrapingPreview = signal(false);
  scrapedImage = signal<string | null>(null);
  scrapedPrice = signal<number | null>(null);
  tagsInput = '';

  form: AddItemPayload & { product_name?: string; description?: string; image_url?: string | null; current_price?: number | null } = {
    product_url: '',
    product_name: '',
    description: '',
    image_url: null,
    target_price: null,
    priority: 'medium',
    target_purchase_date: null,
    tags: [],
    notes: null
  };

  // Date picker state
  dateDay   = '';
  dateMonth = '';
  dateYear  = '';
  hour      = '';
  minute    = '';

  readonly hours: string[] = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  readonly minutes: string[] = ['00', '15', '30', '45'];

  readonly months = [
    { value: '01', label: 'January'  },
    { value: '02', label: 'February' },
    { value: '03', label: 'March'    },
    { value: '04', label: 'April'    },
    { value: '05', label: 'May'      },
    { value: '06', label: 'June'     },
    { value: '07', label: 'July'     },
    { value: '08', label: 'August'   },
    { value: '09', label: 'September'},
    { value: '10', label: 'October'  },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  readonly years: number[] = (() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => y + i);
  })();

  days = signal<number[]>([]);

  /** Snapshot of the form's initial state, used to detect unsaved edits on close. */
  private initialSnapshot = '';

  constructor(
    private wishlistSvc: WishlistService,
    private toast: ToastService,
    private confirmSvc: ConfirmDialogService,
  ) {}

  ngOnInit() {
    const now = new Date();
    const currentYear  = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');

    if (this.editItem) {
      this.form = {
        product_url: this.editItem.product_url,
        product_name: this.editItem.product_name ?? '',
        description: this.editItem.description ?? '',
        image_url: this.editItem.image_url,
        target_price: this.editItem.target_price,
        current_price: this.editItem.current_price,
        priority: this.editItem.priority ?? 'medium',
        target_purchase_date: this.editItem.target_purchase_date ?? null,
        notes: this.editItem.notes,
      };
      this.tagsInput = (this.editItem.tags ?? []).join(', ');

      if (this.form.target_purchase_date) {
        // Read back in LOCAL time (not the raw UTC string) so the picker
        // shows the same wall-clock date/time the user originally chose,
        // regardless of what timezone offset it round-tripped through.
        const d = new Date(this.form.target_purchase_date);
        this.dateYear  = String(d.getFullYear());
        this.dateMonth = String(d.getMonth() + 1).padStart(2, '0');
        this.dateDay   = String(d.getDate());
        this.hour      = String(d.getHours()).padStart(2, '0');
        this.minute    = this.nearestMinuteOption(d.getMinutes());
      } else {
        this.dateYear  = String(currentYear);
        this.dateMonth = currentMonth;
      }
    } else {
      this.dateYear  = String(currentYear);
      this.dateMonth = currentMonth;
    }

    this.rebuildDays();
    this.initialSnapshot = this.snapshot();
  }

  private snapshot(): string {
    return JSON.stringify({ form: this.form, tagsInput: this.tagsInput });
  }

  async requestClose() {
    if (this.snapshot() === this.initialSnapshot) {
      this.close.emit();
      return;
    }
    const confirmed = await this.confirmSvc.confirm('Are you sure you want to discard your unsaved changes?', {
      confirmLabel: 'Discard',
      destructive: true,
    });
    if (confirmed) this.close.emit();
  }

  async autoScrape() {
    if (!this.form.product_url || this.editItem) return;
    this.scrapingPreview.set(true);
    try {
      const result = await this.wishlistSvc.scrapeProduct(this.form.product_url, undefined, 'preview');
      if (result) {
        if (result.title) this.form.product_name = result.title;
        if (result.desc) this.form.description = result.desc;
        if (result.image) {
          this.form.image_url = result.image;
          this.scrapedImage.set(result.image);
        }
        if (result.price) {
          this.scrapedPrice.set(result.price);
          if (!this.form.target_price) {
            this.form.target_price = result.price;
          }
        }
        this.toast.success('Auto-filled product details!');
      } else {
        this.toast.info('Could not auto-scrape. You can type details manually.');
      }
    } catch {
      this.toast.error('Scrape failed. Please fill manually.');
    } finally {
      this.scrapingPreview.set(false);
    }
  }

  onMonthOrYearChange() {
    this.rebuildDays();
    if (this.dateDay && Number(this.dateDay) > this.days().length) {
      this.dateDay = String(this.days().length);
    }
    this.syncDate();
  }

  rebuildDays() {
    const year  = parseInt(this.dateYear,  10) || new Date().getFullYear();
    const month = parseInt(this.dateMonth, 10) || 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    this.days.set(Array.from({ length: daysInMonth }, (_, i) => i + 1));
  }

  /** Rounds a stored minute value to the nearest option this picker offers. */
  private nearestMinuteOption(mins: number): string {
    const step = 15;
    const rounded = Math.round(mins / step) * step;
    return String(rounded % 60).padStart(2, '0');
  }

  syncDate() {
    if (this.dateYear && this.dateMonth && this.dateDay) {
      // Built from the LOCAL calendar fields the user picked (defaulting to
      // midnight if no time was chosen), then serialized to UTC via
      // toISOString() — this is what makes the round-trip through Postgres'
      // timestamptz storage show the same wall-clock time back to the user,
      // regardless of their timezone.
      const date = new Date(
        Number(this.dateYear),
        Number(this.dateMonth) - 1,
        Number(this.dateDay),
        this.hour ? Number(this.hour) : 0,
        this.minute ? Number(this.minute) : 0,
        0, 0
      );
      this.form.target_purchase_date = date.toISOString();
    } else {
      this.form.target_purchase_date = null;
    }
  }

  clearDate() {
    this.dateDay = '';
    this.hour = '';
    this.minute = '';
    this.form.target_purchase_date = null;
  }

  onBackdropClick(e: Event) {
    if (e.target === e.currentTarget) this.requestClose();
  }

  async onSubmit() {
    if (!this.editItem && !this.form.product_url) return;

    if (!this.editItem) {
      const duplicate = this.wishlistSvc.findDuplicateByUrl(this.form.product_url);
      if (duplicate) {
        const proceed = await this.confirmSvc.confirm(
          `You already have "${duplicate.product_name || 'this product'}" in your wishlist. Add it again anyway?`,
          { confirmLabel: 'Add anyway' }
        );
        if (!proceed) return;
      }
    }

    this.loading.set(true);

    const tags = this.tagsInput.split(',').map(t => t.trim()).filter(Boolean);

    if (this.editItem) {
      const payload: UpdateItemPayload = {
        product_name: this.form.product_name ?? undefined,
        description: this.form.description ?? undefined,
        image_url: this.form.image_url ?? null,
        target_price: this.form.target_price ?? null,
        current_price: this.form.current_price ?? null,
        priority: this.form.priority,
        target_purchase_date: this.form.target_purchase_date ?? null,
        tags,
        notes: this.form.notes ?? null,
      };
      const { error } = await this.wishlistSvc.updateItem(this.editItem.id, payload);
      this.loading.set(false);
      if (error) this.toast.error("Couldn't update the item.");
      else {
        this.toast.success('Item updated!');
        this.saved.emit();
        this.close.emit();
      }
    } else {
      const payload: AddItemPayload = {
        product_url: this.form.product_url,
        product_name: this.form.product_name ?? null,
        description: this.form.description ?? null,
        image_url: this.form.image_url ?? null,
        target_price: this.form.target_price ?? null,
        target_purchase_date: this.form.target_purchase_date ?? null,
        tags,
        priority: this.form.priority,
        notes: this.form.notes ?? null,
      };

      if (this.scrapedPrice() !== null) {
        (payload as any).initial_price = this.scrapedPrice();
        (payload as any).current_price = this.scrapedPrice();
      }

      const { data, error } = await this.wishlistSvc.addItem(payload);
      this.loading.set(false);
      if (error) {
        this.toast.error("Couldn't add the item: " + error.message);
      } else {
        this.toast.success('Item added to wishlist!');
        this.saved.emit();
        this.close.emit();
      }
    }
  }
}
