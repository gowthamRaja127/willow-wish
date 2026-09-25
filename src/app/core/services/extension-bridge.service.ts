import { Injectable } from '@angular/core';

/**
 * Talks to the Willow Wish Price Watcher browser extension, if installed,
 * via window.postMessage — the extension's bridge content script (see
 * extension/bridge-content-script.js) relays this to its background worker.
 * There is no way to detect "extension not installed" other than a
 * response timing out, since an uninstalled extension simply never runs
 * the content script that would reply.
 */
@Injectable({ providedIn: 'root' })
export class ExtensionBridgeService {
  /**
   * Fast install-detection via the content script's existing PING/PONG
   * handshake (see bridge-content-script.js) — a short timeout here means
   * the common "extension not installed" case resolves in ~1.5s instead of
   * fetchItemNow's much longer 25s (which has to allow for a real tab
   * load), so callers can skip straight to a fallback without a long wait.
   */
  isInstalled(timeoutMs = 1500): Promise<boolean> {
    return new Promise((resolve) => {
      const requestId = crypto.randomUUID();
      let settled = false;

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        window.removeEventListener('message', onMessage);
        resolve(false);
      }, timeoutMs);

      function onMessage(event: MessageEvent) {
        if (event.source !== window) return;
        const data = event.data;
        if (!data || data.source !== 'willowwish-extension' || data.requestId !== requestId) return;
        if (data.type !== 'PONG') return;

        if (settled) return;
        settled = true;
        clearTimeout(timer);
        window.removeEventListener('message', onMessage);
        resolve(true);
      }

      window.addEventListener('message', onMessage);
      window.postMessage({ source: 'willowwish-app', type: 'PING', requestId }, window.location.origin);
    });
  }

  /**
   * Asks the extension to immediately fetch a product page's data (used for
   * platforms the server can't scrape) and apply it to an existing item.
   * Resolves `null` if the extension isn't installed/didn't respond in time.
   */
  fetchItemNow(url: string, itemId: string, timeoutMs = 25000): Promise<{ updated: boolean; reason?: string } | null> {
    return new Promise((resolve) => {
      const requestId = crypto.randomUUID();
      let settled = false;

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        window.removeEventListener('message', onMessage);
        resolve(null);
      }, timeoutMs);

      function onMessage(event: MessageEvent) {
        if (event.source !== window) return;
        const data = event.data;
        if (!data || data.source !== 'willowwish-extension' || data.requestId !== requestId) return;
        if (data.type !== 'FETCH_ITEM_RESULT') return;

        if (settled) return;
        settled = true;
        clearTimeout(timer);
        window.removeEventListener('message', onMessage);
        resolve(data.response?.ok ? { updated: !!data.response.updated, reason: data.response.reason } : null);
      }

      window.addEventListener('message', onMessage);
      window.postMessage({ source: 'willowwish-app', type: 'FETCH_ITEM_NOW', requestId, url, itemId }, window.location.origin);
    });
  }
}
