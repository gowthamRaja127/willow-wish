import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';

/**
 * Attaches the Supabase access token as a Bearer header on every
 * outgoing HTTP request that targets our Supabase project URL.
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const sb = inject(SupabaseService);
  const session = sb.currentSession;

  if (session?.access_token && req.url.includes('supabase.co')) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: session.access_token,
      },
    });
    return next(authReq);
  }

  return next(req);
};
