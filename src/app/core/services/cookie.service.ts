import { Injectable } from '@angular/core';

export interface CookieOptions {
  expires?: Date | number; // Date object or days from now
  path?: string;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  httpOnly?: boolean; // Note: cannot be set via JS — for documentation only
}

const DEFAULT_OPTIONS: CookieOptions = {
  path: '/',
  secure: location.protocol === 'https:',
  sameSite: 'Lax',
};

@Injectable({ providedIn: 'root' })
export class CookieService {
  /** Write a cookie value. Handles serialization automatically. */
  set(name: string, value: string, options: CookieOptions = {}): void {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    let cookieStr = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

    if (opts.expires !== undefined) {
      const date =
        opts.expires instanceof Date
          ? opts.expires
          : new Date(Date.now() + opts.expires * 24 * 60 * 60 * 1000);
      cookieStr += `; expires=${date.toUTCString()}`;
    }

    if (opts.path) cookieStr += `; path=${opts.path}`;
    if (opts.secure) cookieStr += '; secure';
    if (opts.sameSite) cookieStr += `; samesite=${opts.sameSite}`;

    document.cookie = cookieStr;
  }

  /** Read a cookie by name. Returns null if not found. */
  get(name: string): string | null {
    const key = encodeURIComponent(name);
    const entry = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${key}=`));
    if (!entry) return null;
    return decodeURIComponent(entry.split('=').slice(1).join('='));
  }

  /** Delete a cookie by name. */
  delete(name: string, path = '/'): void {
    document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}`;
  }

  /** Check whether a cookie exists. */
  has(name: string): boolean {
    return this.get(name) !== null;
  }
}
