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
