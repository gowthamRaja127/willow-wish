import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideSun, LucideMoon, LucidePencil } from '@lucide/angular';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideSun,
    LucideMoon,
    LucidePencil
  ],
  template: `
    <header class="p-6 md:p-10 border-b border-border flex flex-row items-center gap-6 sm:gap-10">
      <!-- Profile Initial -->
      <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-muted border border-border flex items-center justify-center text-3xl sm:text-4xl font-bold text-foreground shrink-0 select-none shadow-inner">
        {{ userInitial }}
      </div>

      <!-- User Details & Settings -->
      <div class="flex-1 flex flex-col gap-3">
        <div class="flex items-center gap-4">
          <h1 class="text-xl sm:text-2xl font-semibold">
            {{ userDisplayName }}
          </h1>
          <!-- Theme Toggle (Desktop) -->
          <button
            (click)="toggleDark.emit()"
            class="btn-secondary btn-sm rounded-lg hidden sm:flex items-center justify-center"
            [attr.title]="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            @if (isDark) {
              <svg lucideSun class="w-4 h-4"></svg>
            } @else {
              <svg lucideMoon class="w-4 h-4"></svg>
            }
          </button>
        </div>

        <div class="text-sm text-muted-foreground hidden sm:block">
          Organizing your wishes and catching price drops before they're gone. ✨
        </div>

        <!-- WhatsApp Updates Config (Desktop) -->
        <div class="flex items-center gap-2 mt-1 max-w-sm hidden sm:flex">
          <span class="text-xs text-muted-foreground whitespace-nowrap">WhatsApp No:</span>
          @if (editingWhatsapp) {
            <div class="flex items-center gap-1.5 flex-1">
              <input
                type="text"
                placeholder="e.g. +919876543210"
                [ngModel]="whatsappNumber"
                (ngModelChange)="whatsappNumberChange.emit($event)"
                class="input h-8 px-2.5 py-1 text-xs bg-muted/40 border border-border rounded-lg flex-1"
                [disabled]="savingWhatsapp"
              />
              <button
                (click)="saveWhatsapp.emit()"
                class="btn-primary text-[10px] h-8 px-3 rounded-lg flex items-center justify-center font-bold shrink-0"
                [disabled]="savingWhatsapp"
              >
                {{ savingWhatsapp ? '...' : 'Save' }}
              </button>
            </div>
          } @else {
            <div class="flex items-center gap-1.5 flex-1">
              <span class="text-xs font-mono text-foreground">{{ maskedWhatsapp }}</span>
              <button
                (click)="editWhatsapp.emit(true)"
                class="p-1 rounded-md hover:bg-muted text-muted-foreground shrink-0"
                title="Edit WhatsApp number"
              >
                <svg lucidePencil class="w-3.5 h-3.5"></svg>
              </button>
            </div>
          }
        </div>
      </div>
    </header>

    <!-- Mobile bio & settings -->
    <div class="p-4 text-sm text-muted-foreground sm:hidden border-b border-border space-y-3">
      <div>
        Organizing your wishes and catching price drops before they're gone. ✨
      </div>

      <div class="flex flex-col gap-1.5 pt-2 border-t border-border/40">
        <span class="text-xs text-muted-foreground font-medium">WhatsApp Updates:</span>
        @if (editingWhatsapp) {
          <div class="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="e.g. +919876543210"
              [ngModel]="whatsappNumber"
              (ngModelChange)="whatsappNumberChange.emit($event)"
              class="input h-8 px-2.5 py-1 text-xs bg-muted/40 border border-border rounded-lg flex-1"
              [disabled]="savingWhatsapp"
            />
            <button
              (click)="saveWhatsapp.emit()"
              class="btn-primary text-[10px] h-8 px-3 rounded-lg flex items-center justify-center font-bold shrink-0"
              [disabled]="savingWhatsapp"
            >
              {{ savingWhatsapp ? '...' : 'Save' }}
            </button>
          </div>
        } @else {
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-mono text-foreground">{{ maskedWhatsapp }}</span>
            <button
              (click)="editWhatsapp.emit(true)"
              class="p-1 rounded-md hover:bg-muted text-muted-foreground shrink-0"
              title="Edit WhatsApp number"
            >
              <svg lucidePencil class="w-3.5 h-3.5"></svg>
            </button>
          </div>
        }
      </div>
    </div>
  `
})
export class HeaderComponent {
  @Input({ required: true }) userInitial!: string;
  @Input({ required: true }) userDisplayName!: string;
  @Input({ required: true }) isDark!: boolean;
  @Input({ required: true }) editingWhatsapp!: boolean;
  @Input({ required: true }) whatsappNumber!: string;
  @Input({ required: true }) savingWhatsapp!: boolean;
  @Input({ required: true }) maskedWhatsapp!: string;

  @Output() toggleDark = new EventEmitter<void>();
  @Output() editWhatsapp = new EventEmitter<boolean>();
  @Output() whatsappNumberChange = new EventEmitter<string>();
  @Output() saveWhatsapp = new EventEmitter<void>();
}
