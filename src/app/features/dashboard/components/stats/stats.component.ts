import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideHeart, LucideTrendingDown, LucidePiggyBank, LucideShoppingBag } from '@lucide/angular';

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [
    CommonModule,
    LucideHeart,
    LucideTrendingDown,
    LucidePiggyBank,
    LucideShoppingBag
  ],
  template: `
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border-b border-border">
      <!-- Total Items -->
      <div class="rounded-xl border border-border p-3 bg-card/50 flex items-center justify-between gap-3">
        <div>
          <div class="text-lg font-bold text-foreground font-mono">
            {{ stats.total }}
          </div>
          <div class="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Items</div>
        </div>
        <div class="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
          <svg lucideHeart class="w-4 h-4"></svg>
        </div>
      </div>

      <!-- Price Drops -->
      <div class="rounded-xl border border-border p-3 bg-card/50 flex items-center justify-between gap-3">
        <div>
          <div class="text-lg font-bold text-foreground font-mono">
            {{ stats.priceDrop }}
          </div>
          <div class="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-semibold">Price Drops</div>
        </div>
        <div class="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 shrink-0">
          <svg lucideTrendingDown class="w-4 h-4"></svg>
        </div>
      </div>

      <!-- Total Savings -->
      <div class="rounded-xl border border-border p-3 bg-card/50 flex items-center justify-between gap-3">
        <div>
          <div class="text-lg font-bold text-foreground font-mono">
            ₹{{ stats.totalSavings | number: '1.0-0' }}
          </div>
          <div class="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Saved</div>
        </div>
        <div class="p-2 bg-blue-500/10 rounded-lg text-blue-500 shrink-0">
          <svg lucidePiggyBank class="w-4 h-4"></svg>
        </div>
      </div>

      <!-- Purchased -->
      <div class="rounded-xl border border-border p-3 bg-card/50 flex items-center justify-between gap-3">
        <div>
          <div class="text-lg font-bold text-foreground font-mono">
            {{ stats.purchased }}
          </div>
          <div class="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-semibold">Purchased</div>
        </div>
        <div class="p-2 bg-violet-500/10 rounded-lg text-violet-500 shrink-0">
          <svg lucideShoppingBag class="w-4 h-4"></svg>
        </div>
      </div>
    </div>
  `
})
export class StatsComponent {
  @Input({ required: true }) stats!: {
    total: number;
    priceDrop: number;
    totalSavings: number;
    purchased: number;
  };
}
