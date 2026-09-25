import { Component, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-bulk-reminder-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="onBackdropClick($event)">
      <div class="modal-content max-w-sm" (click)="$event.stopPropagation()">
        <h2 class="text-lg font-display font-bold text-foreground mb-1">Edit reminder date & time</h2>
        <p class="text-sm text-muted-foreground mb-4">Applies to every selected item.</p>

        <div class="grid grid-cols-3 gap-2">
          <div class="relative">
            <select [(ngModel)]="day" name="day" (ngModelChange)="onMonthOrYearChange()" class="input text-sm pr-7 appearance-none cursor-pointer">
              <option value="">Day</option>
              @for (d of days(); track d) {
                <option [value]="d">{{ d }}</option>
              }
            </select>
          </div>
          <div class="relative">
            <select [(ngModel)]="month" name="month" (ngModelChange)="onMonthOrYearChange()" class="input text-sm pr-7 appearance-none cursor-pointer">
              @for (m of months; track m.value) {
                <option [value]="m.value">{{ m.label }}</option>
              }
            </select>
          </div>
          <div class="relative">
            <select [(ngModel)]="year" name="year" (ngModelChange)="onMonthOrYearChange()" class="input text-sm pr-7 appearance-none cursor-pointer">
              @for (y of years; track y) {
                <option [value]="y">{{ y }}</option>
              }
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 mt-2">
          <select [(ngModel)]="hour" name="hour" class="input text-sm pr-7 appearance-none cursor-pointer">
            <option value="">Hour</option>
            @for (h of hours; track h) {
              <option [value]="h">{{ h }}</option>
            }
          </select>
          <select [(ngModel)]="minute" name="minute" class="input text-sm pr-7 appearance-none cursor-pointer">
            <option value="">Minute</option>
            @for (m of minutes; track m) {
              <option [value]="m">{{ m }}</option>
            }
          </select>
        </div>

        <div class="flex gap-3 mt-5">
          <button type="button" (click)="close.emit()" class="btn-secondary btn-md flex-1">Cancel</button>
          <button type="button" (click)="onClear()" class="btn-secondary btn-md flex-1 text-destructive">Clear Reminder</button>
          <button type="button" (click)="onApply()" class="btn-primary btn-md flex-1" [disabled]="!day || !hour || !minute">Apply</button>
        </div>
      </div>
    </div>
  `,
})
export class BulkReminderModalComponent {
  @Output() applied = new EventEmitter<string | null>();
  @Output() close = new EventEmitter<void>();

  day = '';
  month = '';
  year = '';
  hour = '';
  minute = '';

  readonly months = [
    { value: '01', label: 'January'  }, { value: '02', label: 'February' },
    { value: '03', label: 'March'    }, { value: '04', label: 'April'    },
    { value: '05', label: 'May'      }, { value: '06', label: 'June'     },
    { value: '07', label: 'July'     }, { value: '08', label: 'August'   },
    { value: '09', label: 'September'}, { value: '10', label: 'October'  },
    { value: '11', label: 'November' }, { value: '12', label: 'December' },
  ];

  readonly years: number[] = (() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => y + i);
  })();

  readonly hours: string[] = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  readonly minutes: string[] = ['00', '15', '30', '45'];

  days = signal<number[]>([]);

  constructor() {
    const now = new Date();
    this.year = String(now.getFullYear());
    this.month = String(now.getMonth() + 1).padStart(2, '0');
    this.rebuildDays();
  }

  onMonthOrYearChange() {
    this.rebuildDays();
    if (this.day && Number(this.day) > this.days().length) {
      this.day = String(this.days().length);
    }
  }

  rebuildDays() {
    const year = parseInt(this.year, 10) || new Date().getFullYear();
    const month = parseInt(this.month, 10) || 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    this.days.set(Array.from({ length: daysInMonth }, (_, i) => i + 1));
  }

  onApply() {
    if (!this.day || !this.hour || !this.minute) return;
    const date = new Date(
      Number(this.year), Number(this.month) - 1, Number(this.day),
      Number(this.hour), Number(this.minute), 0, 0
    );
    this.applied.emit(date.toISOString());
  }

  onClear() {
    this.applied.emit(null);
  }

  onBackdropClick(e: Event) {
    if (e.target === e.currentTarget) this.close.emit();
  }
}
