import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-background flex items-center justify-center p-4">
      <div class="w-full max-w-md relative">
        <!-- Logo -->
        <div class="text-center mb-8 animate-fade-in">
          <div class="inline-flex items-center justify-center mb-4">
            <img src="assets/logo.svg" alt="WillowWish" class="h-24 w-auto" />
          </div>
          <h1 class="text-3xl font-display font-bold text-foreground">Welcome back</h1>
          <p class="text-muted-foreground mt-2">Sign in to your wishlist</p>
        </div>

        <!-- Card -->
        <div class="card p-8 animate-slide-up">
          <!-- Error -->
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

            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-foreground" for="password">Password</label>
                <a routerLink="/auth/forgot-password" class="text-xs text-primary hover:underline">Forgot password?</a>
              </div>
              <div class="relative">
                <input
                  id="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  [(ngModel)]="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  class="input pr-10"
                  [disabled]="loading()"
                />
                <button
                  type="button"
                  (click)="showPassword.set(!showPassword())"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  @if (showPassword()) {
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                    </svg>
                  } @else {
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                  }
                </button>
              </div>
            </div>

            <button
              type="submit"
              class="btn-primary btn-lg w-full"
              [disabled]="loading()"
            >
              @if (loading()) {
                <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Signing in...
              } @else {
                Sign in
              }
            </button>
          </form>

          <div class="relative my-6">
            <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-border"></div></div>
            <div class="relative flex justify-center text-xs text-muted-foreground"><span class="bg-card px-3">or continue with</span></div>
          </div>

          <button (click)="signInWithGoogle()" class="btn-secondary btn-md w-full" [disabled]="loading()">
            <svg class="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <p class="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?
            <a routerLink="/auth/register" class="text-primary font-medium hover:underline ml-1">Sign up free</a>
          </p>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  email = '';
  password = '';
  loading = signal(false);
  showPassword = signal(false);
  errorMessage = signal('');

  constructor(
    private sb: SupabaseService,
    private toast: ToastService,
    private router: Router
  ) {}

  async onSubmit() {
    if (!this.email || !this.password) return;
    this.loading.set(true);
    this.errorMessage.set('');

    const { error } = await this.sb.signIn(this.email, this.password);
    this.loading.set(false);

    if (error) {
      this.errorMessage.set(error.message || 'Sign in failed. Please try again.');
    } else {
      this.toast.success('Welcome back! 🎉');
      this.router.navigate(['/dashboard']);
    }
  }

  async signInWithGoogle() {
    this.loading.set(true);
    const { error } = await this.sb.signInWithGoogle();
    this.loading.set(false);
    if (error) this.toast.error(error.message);
  }
}
