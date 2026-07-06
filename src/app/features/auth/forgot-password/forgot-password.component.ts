import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-background flex items-center justify-center p-4">
      <div class="w-full max-w-md relative">
        <div class="text-center mb-8 animate-fade-in">
          <div class="inline-flex items-center justify-center mb-4">
            <img src="assets/logo.svg" alt="WillowWish" class="h-24 w-auto" />
          </div>
          <h1 class="text-3xl font-display font-bold text-foreground">Reset your password</h1>
          <p class="text-muted-foreground mt-2">We'll email you a link to set a new one</p>
        </div>

        @if (emailSent()) {
          <div class="card p-8 animate-slide-up text-center">
            <h2 class="text-xl font-display font-bold text-foreground mb-2">Check your email</h2>
            <p class="text-muted-foreground text-sm">We sent a password reset link to <strong class="text-foreground">{{ email }}</strong>.</p>
            <a routerLink="/auth/login" class="btn-primary btn-md mt-6 inline-flex">Back to Sign in</a>
          </div>
        } @else {
          <div class="card p-8 animate-slide-up">
            @if (errorMessage()) {
              <div class="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {{ errorMessage() }}
              </div>
            }

            <form (ngSubmit)="onSubmit()" class="space-y-5">
              <div class="space-y-1.5">
                <label class="text-sm font-medium text-foreground" for="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  [(ngModel)]="email"
                  name="email"
                  required
                  placeholder="you@example.com"
                  class="input"
                  [disabled]="loading()"
                />
              </div>

              <button type="submit" class="btn-primary btn-lg w-full" [disabled]="loading() || !email">
                @if (loading()) {
                  Sending...
                } @else {
                  Send reset link
                }
              </button>
            </form>

            <p class="text-center text-sm text-muted-foreground mt-6">
              Remembered your password?
              <a routerLink="/auth/login" class="text-primary font-medium hover:underline ml-1">Sign in</a>
            </p>
          </div>
        }
      </div>
    </div>
  `
})
export class ForgotPasswordComponent {
  email = '';
  loading = signal(false);
  emailSent = signal(false);
  errorMessage = signal('');

  constructor(private sb: SupabaseService, private toast: ToastService) {}

  async onSubmit() {
    if (!this.email) return;
    this.loading.set(true);
    this.errorMessage.set('');

    const { error } = await this.sb.resetPassword(this.email);
    this.loading.set(false);

    if (error) {
      this.errorMessage.set(error.message || 'Could not send reset link. Please try again.');
    } else {
      this.emailSent.set(true);
    }
  }
}
