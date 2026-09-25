import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (confirmSvc.request(); as req) {
      <div class="modal-overlay" (click)="onBackdropClick($event)">
        <div class="modal-content max-w-sm p-6" (click)="$event.stopPropagation()">
          <div class="min-h-[64px] flex items-center">
            <p class="text-base text-foreground leading-relaxed">{{ req.message }}</p>
          </div>
          <div class="flex gap-3 mt-6">
            <button type="button" (click)="confirmSvc.resolve(false)" class="btn-secondary btn-md flex-1">
              {{ req.cancelLabel }}
            </button>
            <button
              type="button"
              (click)="confirmSvc.resolve(true)"
              [class]="req.destructive ? 'btn-destructive btn-md flex-1' : 'btn-primary btn-md flex-1'"
            >
              {{ req.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialogComponent {
  constructor(public confirmSvc: ConfirmDialogService) {}

  onBackdropClick(e: Event): void {
    if (e.target === e.currentTarget) this.confirmSvc.resolve(false);
  }
}
