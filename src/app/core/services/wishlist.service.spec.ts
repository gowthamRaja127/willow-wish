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
