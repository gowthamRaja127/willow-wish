import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-group-name-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="onBackdropClick($event)">
      <div class="modal-content max-w-sm" (click)="$event.stopPropagation()">
        <h2 class="text-lg font-display font-bold text-foreground mb-4">Name this group</h2>
        <form (ngSubmit)="onSubmit()">
          <input
            type="text"
            [(ngModel)]="name"
            name="groupName"
            placeholder="e.g. Outfit 1"
            class="input mb-4"
            autofocus
          />
          <div class="flex gap-3">
            <button type="button" (click)="close.emit()" class="btn-secondary btn-md flex-1">Cancel</button>
            <button type="submit" class="btn-primary btn-md flex-1" [disabled]="!name.trim()">Create Group</button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class GroupNameModalComponent {
  @Output() confirmed = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  name = '';

  onSubmit(): void {
    if (!this.name.trim()) return;
    this.confirmed.emit(this.name.trim());
  }

  onBackdropClick(e: Event): void {
    if (e.target === e.currentTarget) this.close.emit();
  }
}
