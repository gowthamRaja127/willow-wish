import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { WishlistService } from '../../../core/services/wishlist.service';
import { PriceHistoryEntry } from '../../../core/models/wishlist.model';

Chart.register(...registerables);

@Component({
  selector: 'app-price-history-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay" (click)="onBackdropClick($event)">
      <div class="modal-content max-w-lg" (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-display font-bold text-foreground">Price History</h2>
          <button (click)="close.emit()" class="btn-ghost btn-icon">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        @if (loading) {
          <div class="py-10 text-center text-sm text-muted-foreground">Loading...</div>
        } @else if (entries.length === 0) {
          <div class="py-10 text-center text-sm text-muted-foreground">No price history recorded yet.</div>
        }
        <canvas #canvas height="220" [style.display]="!loading && entries.length > 0 ? 'block' : 'none'"></canvas>
      </div>
    </div>
  `
})
export class PriceHistoryModalComponent implements OnInit, OnDestroy {
  @Input({ required: true }) itemId!: string;
  @Output() close = new EventEmitter<void>();
  @ViewChild('canvas') canvasRef?: ElementRef<HTMLCanvasElement>;

  loading = true;
  entries: PriceHistoryEntry[] = [];
  private chart?: Chart;

  constructor(private wishlistSvc: WishlistService) {}

  async ngOnInit() {
    this.entries = await this.wishlistSvc.getPriceHistory(this.itemId);
    this.loading = false;
    if (this.entries.length > 0) {
      setTimeout(() => this.renderChart());
    }
  }

  private renderChart(): void {
    if (!this.canvasRef) return;
    this.chart = new Chart(this.canvasRef.nativeElement, {
      type: 'line',
      data: {
        labels: this.entries.map(e => new Date(e.recorded_at).toLocaleDateString()),
        datasets: [{
          label: 'Price (₹)',
          data: this.entries.map(e => e.price),
          borderColor: '#e0620a',
          backgroundColor: 'rgba(224, 98, 10, 0.1)',
          tension: 0.3,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: false } },
      },
    });
  }

  onBackdropClick(e: Event): void {
    if (e.target === e.currentTarget) this.close.emit();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
