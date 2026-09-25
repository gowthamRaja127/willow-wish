import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FilterBy } from '../../../../core/models/wishlist.model';
import {
  LucideList,
  LucideTrendingDown,
  LucideCheckCircle,
  LucideShoppingBag,
  LucidePlus,
  LucideZap,
  LucideShare2,
  LucideRefreshCw,
  LucideLogOut,
  LucideHeart
} from '@lucide/angular';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    LucideList,
    LucideTrendingDown,
    LucideCheckCircle,
    LucideShoppingBag,
    LucidePlus,
    LucideZap,
    LucideShare2,
    LucideRefreshCw,
    LucideLogOut,
    LucideHeart
  ],
  template: `
    <!-- Desktop Sidebar -->
    <aside class="fixed inset-y-0 left-0 w-20 lg:w-64 bg-background border-r border-border hidden md:flex flex-col z-30 pt-8 pb-4 px-4 lg:px-6">
      <div class="mb-10 flex items-center justify-center lg:justify-start px-2">
        <img
          src="assets/logo.svg"
          alt="WillowWish"
          class="h-[8.5rem] w-auto hidden lg:block select-none"
        />
        <!-- Icon-only for collapsed sidebar -->
        <div class="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0 lg:hidden shadow-md">
          <svg lucideHeart class="w-5 h-5 text-primary-foreground"></svg>
        </div>
      </div>

      <nav class="flex-1 space-y-4">
        <!-- All Items -->
        <button
          (click)="filterChanged.emit('all')"
          [class]="
            filterBy === 'all'
              ? 'flex items-center gap-4 p-3 w-full rounded-lg text-primary font-bold bg-muted'
              : 'flex items-center gap-4 p-3 w-full rounded-lg hover:bg-muted/50 transition-colors'
          "
        >
          <svg lucideList class="w-6 h-6"></svg>
          <span class="hidden lg:block text-base">All Items</span>
        </button>

        <!-- Price Dropped -->
        <button
          (click)="filterChanged.emit('price_dropped')"
          [class]="
            filterBy === 'price_dropped'
              ? 'flex items-center gap-4 p-3 w-full rounded-lg text-primary font-bold bg-muted'
              : 'flex items-center gap-4 p-3 w-full rounded-lg hover:bg-muted/50 transition-colors'
          "
        >
          <svg lucideTrendingDown class="w-6 h-6"></svg>
          <span class="hidden lg:block text-base">Price Dropped</span>
        </button>

        <!-- Targets Met -->
        <button
          (click)="filterChanged.emit('target_reached')"
          [class]="
            filterBy === 'target_reached'
              ? 'flex items-center gap-4 p-3 w-full rounded-lg text-primary font-bold bg-muted'
              : 'flex items-center gap-4 p-3 w-full rounded-lg hover:bg-muted/50 transition-colors'
          "
        >
          <svg lucideCheckCircle class="w-6 h-6"></svg>
          <span class="hidden lg:block text-base">Targets Met</span>
        </button>

        <!-- Purchased -->
        <button
          (click)="filterChanged.emit('purchased')"
          [class]="
            filterBy === 'purchased'
              ? 'flex items-center gap-4 p-3 w-full rounded-lg text-primary font-bold bg-muted'
              : 'flex items-center gap-4 p-3 w-full rounded-lg hover:bg-muted/50 transition-colors'
          "
        >
          <svg lucideShoppingBag class="w-6 h-6"></svg>
          <span class="hidden lg:block text-base">Purchased</span>
        </button>

        <!-- Add Item -->
        <button
          (click)="addModalOpened.emit()"
          class="flex items-center gap-4 p-3 w-full rounded-lg hover:bg-muted/50 transition-colors mt-8 text-primary font-medium"
        >
          <svg lucidePlus class="w-6 h-6"></svg>
          <span class="hidden lg:block text-base font-bold">Add Item</span>
        </button>

        <!-- Quick Add -->
        <button
          (click)="quickAddOpened.emit()"
          class="flex items-center gap-4 p-3 w-full rounded-lg hover:bg-muted/50 transition-colors text-primary font-medium"
        >
          <svg lucideZap class="w-6 h-6"></svg>
          <span class="hidden lg:block text-base font-bold">Quick Add</span>
        </button>

        <!-- Share Wishlist -->
        <div class="flex items-center gap-1">
          <button
            (click)="shareWishlist.emit()"
            [disabled]="sharingWishlist"
            class="flex items-center gap-4 p-3 flex-1 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <svg lucideShare2 class="w-6 h-6"></svg>
            <span class="hidden lg:block text-base text-left">{{
              sharingWishlist ? 'Copying...' : 'Share'
            }}</span>
          </button>
          <button
            (click)="regenerateShare.emit()"
            [disabled]="sharingWishlist"
            title="Regenerate wishlist share link"
            class="p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <svg lucideRefreshCw class="w-4 h-4"></svg>
          </button>
        </div>
      </nav>

      <!-- Log Out -->
      <div class="mt-auto pt-4 border-t border-border">
        <button
          (click)="signOut.emit()"
          class="flex items-center gap-4 p-3 w-full rounded-lg hover:bg-muted/50 transition-colors text-destructive"
        >
          <svg lucideLogOut class="w-6 h-6"></svg>
          <span class="hidden lg:block text-base">Log Out</span>
        </button>
      </div>
    </aside>

    <!-- Mobile Bottom Nav -->
    <nav class="fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border flex items-center justify-around md:hidden z-30 px-4">
      <button
        class="p-3"
        (click)="filterChanged.emit('all')"
        [class.text-primary]="filterBy === 'all'"
      >
        <svg lucideList class="w-6 h-6"></svg>
      </button>
      <button
        class="p-3"
        (click)="filterChanged.emit('price_dropped')"
        [class.text-primary]="filterBy === 'price_dropped'"
      >
        <svg lucideTrendingDown class="w-6 h-6"></svg>
      </button>
      <button class="p-3 text-primary" (click)="addModalOpened.emit()">
        <svg lucidePlus class="w-7 h-7"></svg>
      </button>
      <button
        class="p-3"
        (click)="filterChanged.emit('target_reached')"
        [class.text-primary]="filterBy === 'target_reached'"
      >
        <svg lucideCheckCircle class="w-6 h-6"></svg>
      </button>
      <button class="p-3" (click)="signOut.emit()">
        <div class="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
          {{ userInitial }}
        </div>
      </button>
    </nav>
  `
})
export class SidebarComponent {
  @Input({ required: true }) filterBy!: FilterBy;
  @Input({ required: true }) userInitial!: string;
  @Input({ required: true }) sharingWishlist!: boolean;

  @Output() filterChanged = new EventEmitter<FilterBy>();
  @Output() addModalOpened = new EventEmitter<void>();
  @Output() quickAddOpened = new EventEmitter<void>();
  @Output() shareWishlist = new EventEmitter<void>();
  @Output() regenerateShare = new EventEmitter<void>();
  @Output() signOut = new EventEmitter<void>();
}
