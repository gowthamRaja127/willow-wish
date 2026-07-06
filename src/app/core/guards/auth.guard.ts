import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { filter, firstValueFrom } from 'rxjs';

/** Waits for SupabaseService to finish its initial getSession() call. */
async function waitForReady(sb: SupabaseService): Promise<void> {
  await firstValueFrom(sb.ready$.pipe(filter(ready => ready)));
}

/**
 * Protects dashboard routes.
 *
 * 1. Waits for the service to resolve the initial session from cookies.
 * 2. Validates the session (auto-refreshes an expired token if possible).
 * 3. Redirects to /auth/login if not authenticated.
 */
export const authGuard: CanActivateFn = async () => {
  const sb     = inject(SupabaseService);
  const router = inject(Router);

  await waitForReady(sb);

  // validateSession() will refresh an expired token before returning false
  const authenticated = await sb.validateSession();
  if (authenticated) return true;

  return router.createUrlTree(['/auth/login']);
};

/**
 * Prevents already-authenticated users from reaching /auth/* routes.
 *
 * Uses the in-memory BehaviorSubject after ready$ fires — no extra
 * network call needed here since we only need a coarse "are you logged in?"
 * check (the auth routes themselves are harmless to double-visit).
 */
export const guestGuard: CanActivateFn = async () => {
  const sb     = inject(SupabaseService);
  const router = inject(Router);

  await waitForReady(sb);

  // Use the cached in-memory value — avoid a second getSession() round-trip
  if (sb.isAuthenticated()) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};
