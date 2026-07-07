import { DashboardComponent } from './dashboard.component';

// Directly instantiates the component (bypassing TestBed/template rendering)
// since onQuickAdd() only touches constructor-injected services — this
// avoids needing to mock the many child components in the full template
// just to verify the Quick Add → extension bridge wiring.
describe('DashboardComponent.onQuickAdd', () => {
  let component: DashboardComponent;
  let wishlistSvc: jasmine.SpyObj<any>;
  let toastSvc: jasmine.SpyObj<any>;
  let extensionBridge: jasmine.SpyObj<any>;

  beforeEach(() => {
    wishlistSvc = jasmine.createSpyObj('WishlistService', ['addItem']);
    toastSvc = jasmine.createSpyObj('ToastService', ['success', 'error', 'info']);
    extensionBridge = jasmine.createSpyObj('ExtensionBridgeService', ['fetchItemNow']);
    extensionBridge.fetchItemNow.and.returnValue(Promise.resolve(null));

    component = new DashboardComponent(
      wishlistSvc,
      toastSvc,
      {} as any, // SupabaseService — unused by onQuickAdd
      {} as any, // Router — unused by onQuickAdd
      {} as any, // CookieService — unused by onQuickAdd
      {} as any, // ShareService — unused by onQuickAdd
      extensionBridge,
    );
  });

  it('asks the extension to fetch immediately for a blocked-platform URL (Nykaa)', async () => {
    component.quickAddUrl = 'https://www.nykaa.com/some-product/p/123';
    wishlistSvc.addItem.and.returnValue(Promise.resolve({ data: { id: 'item-1' }, error: null }));

    await component.onQuickAdd();

    expect(extensionBridge.fetchItemNow).toHaveBeenCalledWith('https://www.nykaa.com/some-product/p/123', 'item-1');
  });

  it('does not call the extension for a normal server-scrapable URL (Amazon)', async () => {
    component.quickAddUrl = 'https://www.amazon.in/dp/B0CHX3TW6X';
    wishlistSvc.addItem.and.returnValue(Promise.resolve({ data: { id: 'item-2' }, error: null }));

    await component.onQuickAdd();

    expect(extensionBridge.fetchItemNow).not.toHaveBeenCalled();
    expect(toastSvc.success).toHaveBeenCalledWith('Added! Fetching product details...');
  });

  it('does not call the extension when addItem fails', async () => {
    component.quickAddUrl = 'https://www.meesho.com/some-product/p/456';
    wishlistSvc.addItem.and.returnValue(Promise.resolve({ data: null, error: new Error('boom') }));

    await component.onQuickAdd();

    expect(extensionBridge.fetchItemNow).not.toHaveBeenCalled();
    expect(toastSvc.error).toHaveBeenCalled();
  });

  it('shows a follow-up success toast once the extension reports it updated the item', async () => {
    component.quickAddUrl = 'https://www.swiggy.com/instamart/item/789';
    wishlistSvc.addItem.and.returnValue(Promise.resolve({ data: { id: 'item-3' }, error: null }));
    extensionBridge.fetchItemNow.and.returnValue(Promise.resolve({ updated: true }));

    await component.onQuickAdd();
    // fetchItemNow's .then() runs on the next microtask after onQuickAdd resolves.
    await Promise.resolve();

    expect(toastSvc.success).toHaveBeenCalledWith('Product details fetched!');
  });

  it('does nothing extra when the extension is not installed (bridge resolves null)', async () => {
    component.quickAddUrl = 'https://www.nykaa.com/some-product/p/999';
    wishlistSvc.addItem.and.returnValue(Promise.resolve({ data: { id: 'item-4' }, error: null }));
    extensionBridge.fetchItemNow.and.returnValue(Promise.resolve(null));

    await component.onQuickAdd();
    await Promise.resolve();

    expect(toastSvc.success).toHaveBeenCalledWith('Added! Asking your browser extension for details...');
    expect(toastSvc.success).not.toHaveBeenCalledWith('Product details fetched!');
  });
});

describe('DashboardComponent.signOut', () => {
  let component: DashboardComponent;
  let supabaseSvc: jasmine.SpyObj<any>;
  let router: jasmine.SpyObj<any>;

  beforeEach(() => {
    supabaseSvc = jasmine.createSpyObj('SupabaseService', ['signOut']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    spyOn(window, 'confirm');

    component = new DashboardComponent(
      {} as any, // WishlistService
      {} as any, // ToastService
      supabaseSvc,
      router,
      {} as any, // CookieService
      {} as any, // ShareService
      {} as any  // ExtensionBridgeService
    );
  });

  it('calls supabase signOut and navigates to login if user confirms', async () => {
    (window.confirm as jasmine.Spy).and.returnValue(true);
    supabaseSvc.signOut.and.returnValue(Promise.resolve({ error: null }));

    await component.signOut();

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to log out?');
    expect(supabaseSvc.signOut).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('does not log out if user cancels', async () => {
    (window.confirm as jasmine.Spy).and.returnValue(false);

    await component.signOut();

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to log out?');
    expect(supabaseSvc.signOut).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});

