import { Injectable, signal } from '@angular/core';

export interface ConfirmRequest {
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive: boolean;
}

export interface ConfirmOptions {
  confirmLabel?: string;
  cancelLabel?: string;
  /** Renders the confirm button in the destructive (red) style — use for delete/logout-style actions. */
  destructive?: boolean;
}

/**
 * App-wide replacement for window.confirm(). Rendered once by
 * ConfirmDialogComponent (mounted at the app root), so any service/component
 * can `await confirmSvc.confirm(...)` instead of showing its own ad-hoc
 * confirmation UI.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private _request = signal<ConfirmRequest | null>(null);
  request = this._request.asReadonly();

  private resolver: ((result: boolean) => void) | null = null;

  confirm(message: string, options: ConfirmOptions = {}): Promise<boolean> {
    // Only one confirmation can be pending at a time — resolve any stale
    // one as "cancelled" rather than leaving its promise dangling forever.
    this.resolver?.(false);

    this._request.set({
      message,
      confirmLabel: options.confirmLabel ?? 'Confirm',
      cancelLabel: options.cancelLabel ?? 'Cancel',
      destructive: options.destructive ?? false,
    });

    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  resolve(result: boolean): void {
    this._request.set(null);
    this.resolver?.(result);
    this.resolver = null;
  }
}
