import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background flex items-center justify-center p-4">
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl"></div>
        <div class="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/8 blur-3xl"></div>
      </div>

      <div class="w-full max-w-md relative">
        <div class="text-center mb-8 animate-fade-in">
          <div class="inline-flex items-center justify-center mb-4">
            <img src="assets/logo.svg" alt="WillowWish" class="h-24 w-auto" />
          </div>
          <h1 class="text-3xl font-display font-bold text-foreground">Create your account</h1>
          <p class="text-muted-foreground mt-2">Start tracking your dream purchases</p>
        </div>

        @if (emailSent()) {
          <div class="card p-8 animate-slide-up text-center shadow-card-hover">
            <div class="w-16 h-16 rounded-full bg-pricedrop-bg flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-pricedrop" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </div>
            <h2 class="text-xl font-display font-bold text-foreground mb-2">Check your email</h2>
            <p class="text-muted-foreground text-sm">We sent a confirmation link to <strong class="text-foreground">{{ email }}</strong>. Click it to activate your account.</p>
            <a routerLink="/auth/login" class="btn-primary btn-md mt-6 inline-flex">Go to Sign in</a>
          </div>
        } @else {
          <div class="card p-8 animate-slide-up shadow-card-hover">
            @if (errorMessage()) {
              <div class="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                <svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
                {{ errorMessage() }}
              </div>
            }

            <form (ngSubmit)="onSubmit()" class="space-y-5">
              <div class="space-y-1.5">
                <label class="text-sm font-medium text-foreground" for="fullName">Full name</label>
                <input id="fullName" type="text" [(ngModel)]="fullName" name="fullName" placeholder="Jane Doe" class="input" [disabled]="loading()"/>
              </div>
              <div class="space-y-1.5">
                <label class="text-sm font-medium text-foreground" for="email">Email address</label>
                <input id="email" type="email" [(ngModel)]="email" name="email" required placeholder="you@example.com" class="input" [disabled]="loading()"/>
              </div>
              <div class="space-y-1.5">
                <label class="text-sm font-medium text-foreground" for="password">Password</label>
                <input id="password" type="password" [(ngModel)]="password" name="password" required placeholder="Min. 8 characters" class="input" [disabled]="loading()" minlength="8"/>
                @if (password && password.length < 8) {
                  <p class="text-xs text-muted-foreground">Password must be at least 8 characters</p>
                }
              </div>

              <button type="submit" class="btn-primary btn-lg w-full" [disabled]="loading() || password.length < 8">
                @if (loading()) {
                  <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Creating account...
                } @else {
                  Create account
                }
              </button>
            </form>

            <p class="text-center text-sm text-muted-foreground mt-6">
              Already have an account?
              <a routerLink="/auth/login" class="text-primary font-medium hover:underline ml-1">Sign in</a>
            </p>
          </div>
        }
      </div>
    </div>
  `
})
export class RegisterComponent {
  email = '';
  password = '';
  fullName = '';
  loading = signal(false);
  emailSent = signal(false);
  errorMessage = signal('');

  constructor(
    private sb: SupabaseService,
    private toast: ToastService,
    private router: Router
  ) {}

  async onSubmit() {
    if (!this.email || !this.password || this.password.length < 8) return;
    this.loading.set(true);
    this.errorMessage.set('');

    const { error } = await this.sb.signUp(this.email, this.password, this.fullName);
    this.loading.set(false);

    if (error) {
      this.errorMessage.set(error.message || 'Registration failed. Please try again.');
    } else {
      this.emailSent.set(true);
    }
  }
}
