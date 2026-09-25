import { fakeAsync, tick } from '@angular/core/testing';
import { WishlistService } from './wishlist.service';
import { WishlistItem, AddItemPayload } from '../models/wishlist.model';

describe('WishlistService', () => {
  let service: WishlistService;
  let supabaseSvc: jasmine.SpyObj<any>;

  beforeEach(() => {
    supabaseSvc = jasmine.createSpyObj('SupabaseService', ['currentUser', 'currentSession']);
    Object.defineProperty(supabaseSvc, 'currentUser', {
      get: () => ({ id: 'user-123' })
    });
    Object.defineProperty(supabaseSvc, 'currentSession', {
      get: () => ({ access_token: 'token-abc' })
    });

    const fromSpyObj = jasmine.createSpyObj('from', ['insert', 'select', 'single']);
    supabaseSvc.client = jasmine.createSpyObj('client', ['from']);
    supabaseSvc.client.from.and.returnValue(fromSpyObj);
    fromSpyObj.insert.and.returnValue(fromSpyObj);
    fromSpyObj.select.and.returnValue(fromSpyObj);
  });

  it('correctly maps and updates item fields in local signal after background scraping', fakeAsync(() => {
    service = new WishlistService(supabaseSvc);

    const initialItem: WishlistItem = {
      id: 'item-123',
      user_id: 'user-123',
      product_url: 'https://example.com/product',
      product_name: null,
      description: null,
      image_url: null,
      initial_price: null,
      current_price: null,
      target_price: null,
      target_purchase_date: null,
      tags: [],
      priority: 'medium',
      notes: null,
      is_notified: false,
      is_purchased: false,
      created_at: new Date().toISOString(),
      last_scraped_at: new Date().toISOString()
    };

    const fromSpy = supabaseSvc.client.from('items') as any;
    fromSpy.single.and.returnValue(Promise.resolve({ data: initialItem, error: null }));

    const mockScrapedResponse = {
      success: true,
      image: 'https://example.com/image.jpg',
      title: 'Awesome Product',
      desc: 'This is an awesome product description',
      price: 1500
    };
    spyOn(window, 'fetch').and.returnValue(
      Promise.resolve({
        json: () => Promise.resolve(mockScrapedResponse)
      } as any)
    );

    const payload: AddItemPayload = {
      product_url: 'https://example.com/product'
    };

    let addResult: any;
    service.addItem(payload).then(res => addResult = res);

    tick();

    expect(addResult.data).toEqual(initialItem);
    const updatedItem = service.items()[0];
    expect(updatedItem.image_url).toBe('https://example.com/image.jpg');
    expect(updatedItem.product_name).toBe('Awesome Product');
    expect(updatedItem.description).toBe('This is an awesome product description');
    expect(updatedItem.current_price).toBe(1500);
    expect(updatedItem.initial_price).toBe(1500);
  }));
});

describe('WishlistService soft delete', () => {
  let service: WishlistService;
  let supabaseSvc: jasmine.SpyObj<any>;
  let updateSpy: jasmine.Spy;
  let deleteSpy: jasmine.Spy;

  function seedItem(id: string): WishlistItem {
    return {
      id,
      user_id: 'user-123',
      product_url: 'https://example.com/product',
      product_name: 'Test Item',
      description: null,
      image_url: null,
      initial_price: null,
      current_price: null,
      target_price: null,
      target_purchase_date: null,
      tags: [],
      priority: 'medium',
      notes: null,
      is_notified: false,
      is_purchased: false,
      created_at: new Date().toISOString(),
      last_scraped_at: new Date().toISOString(),
    };
  }

  beforeEach(() => {
    supabaseSvc = jasmine.createSpyObj('SupabaseService', ['currentUser']);
    Object.defineProperty(supabaseSvc, 'currentUser', { get: () => ({ id: 'user-123' }) });

    // Mimics real supabase-js query builders: every filter/mutation method
    // returns the same chainable object, which is itself "thenable" so
    // `await` works no matter how many methods were chained before it.
    const fromSpyObj: any = {
      then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
    };
    updateSpy = jasmine.createSpy('update').and.callFake(() => fromSpyObj);
    deleteSpy = jasmine.createSpy('delete').and.callFake(() => fromSpyObj);
    fromSpyObj.update = updateSpy;
    fromSpyObj.delete = deleteSpy;
    fromSpyObj.select = jasmine.createSpy('select').and.callFake(() => fromSpyObj);
    fromSpyObj.eq = jasmine.createSpy('eq').and.callFake(() => fromSpyObj);
    fromSpyObj.in = jasmine.createSpy('in').and.callFake(() => fromSpyObj);
    fromSpyObj.order = jasmine.createSpy('order').and.returnValue(Promise.resolve({ data: [], error: null }));

    supabaseSvc.client = jasmine.createSpyObj('client', ['from']);
    supabaseSvc.client.from.and.returnValue(fromSpyObj);

    service = new WishlistService(supabaseSvc);
    (service as any)._items.set([seedItem('item-1'), seedItem('item-2')]);
  });

  it('deleteItem soft-deletes (update is_deleted) instead of hard-deleting the row', async () => {
    const { error } = await service.deleteItem('item-1');

    expect(error).toBeNull();
    expect(updateSpy).toHaveBeenCalledWith({ is_deleted: true });
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(service.items().find(i => i.id === 'item-1')).toBeUndefined();
  });

  it('bulkDelete soft-deletes (update is_deleted) instead of hard-deleting the rows', async () => {
    const { error } = await service.bulkDelete(['item-1', 'item-2']);

    expect(error).toBeNull();
    expect(updateSpy).toHaveBeenCalledWith({ is_deleted: true });
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(service.items().length).toBe(0);
  });

  it('restoreItem clears is_deleted', async () => {
    const { error } = await service.restoreItem('item-1');

    expect(error).toBeNull();
    expect(updateSpy).toHaveBeenCalledWith({ is_deleted: false });
  });
});
