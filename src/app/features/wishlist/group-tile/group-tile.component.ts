import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WishlistItem, ItemGroup } from '../../../core/models/wishlist.model';
import { ItemCardComponent } from '../item-card/item-card.component';

@Component({
  selector: 'app-group-tile',
  standalone: true,
  imports: [CommonModule, ItemCardComponent],
  template: `
    @if (!expanded()) {
      <div
        class="bg-card border border-border rounded-xl overflow-hidden flex flex-col h-full cursor-pointer hover:border-primary/40 transition-colors"
        (click)="expanded.set(true)"
        (dragover)="onDragOver($event)"
        (drop)="onDrop($event)"
      >
        <div class="relative w-full aspect-square bg-muted/30 p-3">
          <div class="grid grid-cols-2 gap-1 w-full h-full">
            @for (item of items.slice(0, 3); track item.id) {
              <div class="bg-muted/50 rounded-lg overflow-hidden flex items-center justify-center">
                @if (item.image_url) {
                  <img [src]="item.image_url" [alt]="item.product_name" class="object-contain w-full h-full p-1" />
                } @else {
                  <svg class="w-6 h-6 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                }
              </div>
            }
          </div>
        </div>
        <div class="p-3.5 flex flex-col gap-1">
          <h3 class="font-semibold text-sm text-foreground truncate">{{ group.name }}</h3>
          <p class="text-xs text-muted-foreground">{{ items.length }} item{{ items.length === 1 ? '' : 's' }}</p>
        </div>
      </div>
    } @else {
      <div class="col-span-full flex items-center justify-between p-2 -mt-1 mb-1 bg-primary/5 border border-primary/20 rounded-lg">
        <h3 class="font-semibold text-sm text-foreground flex items-center gap-2">
          {{ group.name }}
          <span class="text-xs text-muted-foreground font-normal">{{ items.length }} item{{ items.length === 1 ? '' : 's' }}</span>
        </h3>
        <button (click)="expanded.set(false)" class="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      @for (item of items; track item.id) {
        <div class="flex flex-col gap-1 cursor-pointer">
          <app-item-card
            [item]="item"
            [viewMode]="viewMode"
            (edit)="edit.emit($event)"
            (deleted)="deleted.emit($event)"
            (viewHistory)="viewHistory.emit($event)"
            (tagClick)="tagClick.emit($event)"
          />
          <button (click)="removeFromGroup.emit(item.id)" class="text-xs text-destructive hover:underline self-start px-1 sm:hidden">
            Remove from group
          </button>
        </div>
      }
    }
  `,
  styles: [':host { display: contents; }'],
})
export class GroupTileComponent {
  @Input({ required: true }) group!: ItemGroup;
  @Input({ required: true }) items!: WishlistItem[];
  @Input() viewMode: 'grid' | 'list' = 'grid';
  @Output() edit = new EventEmitter<WishlistItem>();
  @Output() deleted = new EventEmitter<string>();
  @Output() viewHistory = new EventEmitter<WishlistItem>();
  @Output() tagClick = new EventEmitter<string>();
  @Output() removeFromGroup = new EventEmitter<string>();
  @Output() droppedOnGroup = new EventEmitter<string>();

  expanded = signal(false);

  onDragOver(e: DragEvent): void {
    e.preventDefault();
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    const draggedId = e.dataTransfer?.getData('text/plain');
    if (draggedId) this.droppedOnGroup.emit(draggedId);
  }
}
