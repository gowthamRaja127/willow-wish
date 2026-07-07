import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-quick-add-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <div
        class="modal-content max-w-sm"
        (click)="$event.stopPropagation()"
      >
        <h2 class="text-lg font-display font-bold text-foreground mb-4">
          Quick Add
        </h2>
        <form (ngSubmit)="onSubmit()">
          <input
            type="url"
            [(ngModel)]="url"
            name="url"
            placeholder="Paste a product link"
            class="input mb-4"
            [disabled]="quickAdding"
            required
            focus
          />
          <div class="flex gap-3">
            <button
              type="button"
              (click)="close.emit()"
              class="btn-secondary btn-md flex-1"
              [disabled]="quickAdding"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn-primary btn-md flex-1"
              [disabled]="!url || quickAdding"
            >
              {{ quickAdding ? 'Adding...' : 'Add' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class QuickAddModalComponent {
  @Input() quickAdding = false;
  @Output() close = new EventEmitter<void>();
  @Output() add = new EventEmitter<string>();

  url = '';

  onSubmit() {
    if (this.url && !this.quickAdding) {
      this.add.emit(this.url);
      this.url = '';
    }
  }
}
