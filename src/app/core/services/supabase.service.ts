import { Injectable } from '@angular/core';
import {
  createClient,
  SupabaseClient,
  User,
  Session,
  AuthChangeEvent,
  SupportedStorage,
} from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CookieService } from './cookie.service';

// ─── Cookie names ─────────────────────────────────────────────
const COOKIE_ACCESS_TOKEN  = 'ww_access_token';
const COOKIE_REFRESH_TOKEN = 'ww_refresh_token';
const COOKIE_EXPIRES_AT    = 'ww_expires_at';
// Session duration: 7 days (rolling)
const SESSION_DAYS = 7;

/**
 * Custom Supabase storage adapter that persists tokens in cookies
 * instead of localStorage (protects against XSS-based token theft).
 */
function buildCookieStorage(cookies: CookieService): SupportedStorage {
  // Supabase stores a single JSON blob under the key "sb-<ref>-auth-token"
  return {
    getItem(key: string): string | null {
      return cookies.get(key);
    },
    setItem(key: string, value: string): void {
      cookies.set(key, value, {
        expires: SESSION_DAYS,
        path: '/',
        secure: location.protocol === 'https:',
        sameSite: 'Lax',
      });
    },
    removeItem(key: string): void {
      cookies.delete(key);
    },
  };
}

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;
  private _user    = new BehaviorSubject<User | null>(null);
  private _session = new BehaviorSubject<Session | null>(null);
  private _ready   = new BehaviorSubject<boolean>(false);

  /** Emits every authenticated User (or null on sign-out). */
  user$: Observable<User | null> = this._user.asObservable();
  /** Emits the full Session object (or null). */
  session$: Observable<Session | null> = this._session.asObservable();
  /**
   * Emits `true` once the initial session check has completed.
   * Guards must await this before evaluating auth state.
   */
  ready$: Observable<boolean> = this._ready.asObservable();

  /**
   * Cached init promise — ensures concurrent guard activations on page
   * load share a single `getSession()` call instead of racing.
   */
  private _initPromise: Promise<void>;

  constructor(private cookieSvc: CookieService) {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: buildCookieStorage(cookieSvc),
          storageKey: `sb-${this.projectRef}-auth-token`,
        },
      }
    );

    // Cache the init promise so concurrent awaiters share one network call.
    this._initPromise = this.supabase.auth.getSession().then(({ data: { session } }) => {
      this.applySession(session);
      this._ready.next(true);
    });

    // React to subsequent auth changes AFTER the initial session is applied.
    this._initPromise.then(() => {
      this.supabase.auth.onAuthStateChange(
        (event: AuthChangeEvent, session: Session | null) => {
          this.applySession(session);

          if (event === 'SIGNED_OUT') {
            this.clearSessionCookies();
          }

          if (event === 'TOKEN_REFRESHED' && session) {
            this.writeSessionCookies(session);
          }
        }
      );
    });
  }

  // ─── Public accessors ──────────────────────────────────────

  get client(): SupabaseClient {
    return this.supabase;
  }

  get currentUser(): User | null {
    return this._user.getValue();
  }

  get currentSession(): Session | null {
    return this._session.getValue();
  }

  isAuthenticated(): boolean {
    return !!this._user.getValue();
  }

  /**
   * Validate the stored session: check expiry, attempt a token refresh
   * if the access token has expired but a refresh token still exists.
   * Returns `true` if the user ends up authenticated, `false` otherwise.
   */
  async validateSession(): Promise<boolean> {
    const { data: { session }, error } = await this.supabase.auth.getSession();
    if (error || !session) {
      this.clearSessionCookies();
      return false;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at ?? 0;

    if (expiresAt < nowSec) {
      // Try to refresh silently
      const { data: refreshed, error: refreshError } =
        await this.supabase.auth.refreshSession();
      if (refreshError || !refreshed.session) {
        this.clearSessionCookies();
        this.applySession(null);
        return false;
      }
      this.applySession(refreshed.session);
      this.writeSessionCookies(refreshed.session);
      return true;
    }

    this.applySession(session);
    return true;
  }

  // ─── Auth methods ──────────────────────────────────────────

  async signUp(email: string, password: string, fullName?: string) {
    return this.supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
  }

  async signIn(email: string, password: string) {
    const result = await this.supabase.auth.signInWithPassword({ email, password });
    if (result.data.session) {
      this.writeSessionCookies(result.data.session);
    }
    return result;
  }

  async signInWithGoogle() {
    return this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
  }

  async signOut() {
    this.clearSessionCookies();
    return this.supabase.auth.signOut();
  }

  async resetPassword(email: string) {
    return this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
  }

  // ─── Private helpers ───────────────────────────────────────

  /** Extract the project ref from the Supabase URL (used as cookie key prefix). */
  private get projectRef(): string {
    try {
      const url = new URL(environment.supabaseUrl);
      return url.hostname.split('.')[0];
    } catch {
      return 'project';
    }
  }

  private applySession(session: Session | null): void {
    this._session.next(session);
    this._user.next(session?.user ?? null);
  }

  private writeSessionCookies(session: Session): void {
    const expires = new Date((session.expires_at ?? 0) * 1000);
    this.cookieSvc.set(COOKIE_ACCESS_TOKEN,  session.access_token,  { expires, sameSite: 'Lax', secure: location.protocol === 'https:' });
    this.cookieSvc.set(COOKIE_REFRESH_TOKEN, session.refresh_token ?? '', { expires: SESSION_DAYS, sameSite: 'Lax', secure: location.protocol === 'https:' });
    this.cookieSvc.set(COOKIE_EXPIRES_AT,    String(session.expires_at ?? 0), { expires: SESSION_DAYS, sameSite: 'Lax', secure: location.protocol === 'https:' });
  }

  private clearSessionCookies(): void {
    this.cookieSvc.delete(COOKIE_ACCESS_TOKEN);
    this.cookieSvc.delete(COOKIE_REFRESH_TOKEN);
    this.cookieSvc.delete(COOKIE_EXPIRES_AT);
    // Also clear the Supabase SDK's own composite cookie
    this.cookieSvc.delete(`sb-${this.projectRef}-auth-token`);
  }
}
