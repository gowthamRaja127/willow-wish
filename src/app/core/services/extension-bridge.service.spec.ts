import { fakeAsync, tick } from '@angular/core/testing';
import { ExtensionBridgeService } from './extension-bridge.service';

describe('ExtensionBridgeService', () => {
  let service: ExtensionBridgeService;

  beforeEach(() => {
    service = new ExtensionBridgeService();
  });

  it('posts a FETCH_ITEM_NOW message with the url/itemId and resolves on a matching response', fakeAsync(() => {
    const postSpy = spyOn(window, 'postMessage').and.callFake((data: any) => {
      // Simulate the extension's bridge content script replying.
      window.dispatchEvent(new MessageEvent('message', {
        source: window as any,
        data: { source: 'willowwish-extension', requestId: data.requestId, type: 'FETCH_ITEM_RESULT', response: { ok: true, updated: true } },
      }));
    });

    let result: { updated: boolean; reason?: string } | null | undefined;
    service.fetchItemNow('https://www.nykaa.com/product/p/123', 'item-1').then((r) => (result = r));
    tick();

    expect(postSpy).toHaveBeenCalled();
    const [sentMessage] = postSpy.calls.mostRecent().args as any[];
    expect(sentMessage.source).toBe('willowwish-app');
    expect(sentMessage.type).toBe('FETCH_ITEM_NOW');
    expect(sentMessage.url).toBe('https://www.nykaa.com/product/p/123');
    expect(sentMessage.itemId).toBe('item-1');

    expect(result).toEqual({ updated: true, reason: undefined });
  }));

  it('ignores unrelated messages and messages with a mismatched requestId', fakeAsync(() => {
    spyOn(window, 'postMessage').and.callFake((data: any) => {
      // Unrelated message first — must not resolve the promise.
      window.dispatchEvent(new MessageEvent('message', {
        source: window as any,
        data: { source: 'some-other-extension', requestId: data.requestId, type: 'FETCH_ITEM_RESULT', response: { ok: true, updated: true } },
      }));
      // Right source, wrong requestId — must also be ignored.
      window.dispatchEvent(new MessageEvent('message', {
        source: window as any,
        data: { source: 'willowwish-extension', requestId: 'not-the-right-id', type: 'FETCH_ITEM_RESULT', response: { ok: true, updated: true } },
      }));
      // The real, matching response.
      window.dispatchEvent(new MessageEvent('message', {
        source: window as any,
        data: { source: 'willowwish-extension', requestId: data.requestId, type: 'FETCH_ITEM_RESULT', response: { ok: true, updated: false, reason: 'nothing_extracted' } },
      }));
    });

    let result: { updated: boolean; reason?: string } | null | undefined;
    service.fetchItemNow('https://www.meesho.com/product/p/456', 'item-2').then((r) => (result = r));
    tick();

    expect(result).toEqual({ updated: false, reason: 'nothing_extracted' });
  }));

  it('resolves null when nothing responds before the timeout (extension not installed)', fakeAsync(() => {
    spyOn(window, 'postMessage'); // no reply simulated at all

    let result: any = 'unset';
    service.fetchItemNow('https://www.swiggy.com/instamart/item/789', 'item-3', 5000).then((r) => (result = r));

    tick(4999);
    expect(result).toBe('unset'); // still pending just before the timeout

    tick(1);
    expect(result).toBeNull();
  }));

  it('resolves null when the extension reports failure (response.ok is false)', fakeAsync(() => {
    spyOn(window, 'postMessage').and.callFake((data: any) => {
      window.dispatchEvent(new MessageEvent('message', {
        source: window as any,
        data: { source: 'willowwish-extension', requestId: data.requestId, type: 'FETCH_ITEM_RESULT', response: { ok: false, error: 'not logged in' } },
      }));
    });

    let result: { updated: boolean; reason?: string } | null | undefined;
    service.fetchItemNow('https://www.nykaa.com/product/p/999', 'item-4').then((r) => (result = r));
    tick();

    expect(result).toBeNull();
  }));
});
