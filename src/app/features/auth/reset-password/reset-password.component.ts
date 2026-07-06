import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-background flex items-center justify-center p-4">
      <div class="w-full max-w-md relative">
        <div class="text-center mb-8 animate-fade-in">
          <div class="inline-flex items-center justify-center mb-4">
            <img src="assets/logo.svg" alt="WillowWish" class="h-24 w-auto" />
          </div>
          <h1 class="text-3xl font-display font-bold text-foreground">Set a new password</h1>
        </div>

        <div class="card p-8 animate-slide-up">
          @if (errorMessage()) {
            <div class="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {{ errorMessage() }}
            </div>
          }

          <form (ngSubmit)="onSubmit()" class="space-y-5">
            <div class="space-y-1.5">
              <label class="text-sm font-medium text-foreground" for="password">New password</label>
              <input
                id="password"
                type="password"
                [(ngModel)]="password"
                name="password"
                required
                minlength="8"
                placeholder="Min. 8 characters"
                class="input"
                [disabled]="loading()"
              />
            </div>

            <button type="submit" class="btn-primary btn-lg w-full" [disabled]="loading() || password.length < 8">
              @if (loading()) {
                Saving...
              } @else {
                Save new password
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  `
})
export class ResetPasswordComponent {
  password = '';
  loading = signal(false);
  errorMessage = signal('');

  constructor(private sb: SupabaseService, private toast: ToastService, private router: Router) {}

  async onSubmit() {
    if (this.password.length < 8) return;
    this.loading.set(true);
    this.errorMessage.set('');

    const { error } = await this.sb.client.auth.updateUser({ password: this.password });
    this.loading.set(false);

    if (error) {
      this.errorMessage.set(error.message || 'Could not update password. Please try again.');
    } else {
      this.toast.success('Password updated!');
      this.router.navigate(['/dashboard']);
    }
  }
}
