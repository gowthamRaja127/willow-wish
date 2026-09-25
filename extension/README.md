# Willow Wish Price Watcher (browser extension)

Refreshes prices for your Willow Wish wishlist items on sites the server
can't reach reliably. **Only Amazon has been confirmed to work from the
actual production Supabase edge network** — this extension exists for
**Nykaa, Meesho, Instamart, Flipkart, and Myntra**.

Note: Flipkart and Myntra initially looked fine when tested from a local
sandbox environment, but production testing (from Supabase's actual edge
IP range) showed Flipkart returns HTTP 529 ("Site is overloaded") and
Myntra returns a fake maintenance page — both specifically to Supabase's
IP range, not to arbitrary IPs. Always verify server-side scraping against
the *deployed* function, not a local test environment — the two can give
different, misleading results for sites with IP-reputation-based blocking.

## How it works

1. **No separate login.** The website already writes plain
   (non-HttpOnly) cookies specifically for this — `ww_access_token`,
   `ww_refresh_token`, `ww_expires_at` (see `writeSessionCookies()` in
   `supabase.service.ts`). `bridge-content-script.js` reads them whenever
   it runs on the site and hands them to the background worker, which
   adopts that session as its own. Just be logged into willowwish.dev in
   the same browser — nothing else to do.
2. Every 8 hours (matching the server-side cron cadence), or on-demand via
   the "Refresh now" button, the extension:
   - Fetches your non-purchased items from Supabase (RLS-scoped to you).
   - Filters to the ones whose URL is on a known-blocked platform.
   - Opens each one in a hidden background tab — a real Chrome tab, so it
     carries a normal browser's network fingerprint and actually executes
     the page's JS, which is what gets past both the CDN-level bot block
     and any client-side rendering.
   - Extracts `{title, price, image}` from the live page and closes the tab.
   - Posts the result to `scrape-product` with `mode: "client_update"`,
     which reuses the exact same price-drop/target-met notification logic
     as the server-side path — it just skips the (blocked) fetch step.

Nothing gets added to your wishlist by this extension — it only refreshes
items you already track.

### Quick Add integration

When you Quick Add a URL on a known-blocked platform, the website (via
`bridge-content-script.js`) asks the extension to fetch that item
immediately instead of waiting for the next periodic cycle. It goes
through the exact same path as the periodic cycle — extract from a live
tab, then hand the data to `scrape-product`'s `client_update` mode, which
does the actual database write. The extension itself never writes to the
database directly: `price_history` in particular has no RLS policy
allowing regular users to insert into it (only the service-role-backed
edge function can), so routing through that one "service" for every
write keeps this simple and avoids duplicating permission logic. If the
extension isn't installed, isn't synced yet, or doesn't respond within
~25s, the website just silently falls back to the normal behavior
(server-side scrape attempt + the extension's next periodic run whenever
it happens).

## Load it locally

1. Open `chrome://extensions`.
2. Enable "Developer mode" (top right).
3. Click "Load unpacked" and select this `extension/` directory.
4. Make sure you're logged into willowwish.dev in the same browser, then
   visit the site once (or reload it) so the bridge content script can
   sync your session — check the extension popup, it should say "Synced".

## Known limitations / things to verify live

- **Flipkart and Myntra** already have verified selectors/JSON-LD handling
  in `content-extract.js` (confirmed against real page content from a
  non-flagged IP) — they should work well once running in your actual
  browser, which isn't subject to the IP-reputation block Supabase's edge
  network hits.
- **Nykaa and Meesho** extraction is based on the JSON-LD `Product` schema
  most e-commerce sites emit for SEO — this could not be verified against
  real page HTML ahead of time (both hard-block plain `curl`/server
  fetches outright, unlike Flipkart/Myntra's IP-reputation-based
  degradation), so it should be confirmed once running against a real
  logged-in tab. If it doesn't extract correctly, inspect the live page's
  `<script type="application/ld+json">` blocks and add a site-specific
  selector the same way Amazon and Flipkart have one.
- **Instamart** is the least certain of the three: quick-commerce apps are
  typically pincode/session-gated and may not be SEO-optimized the way
  catalog sites are, so there may be no JSON-LD or Open Graph data on the
  real page at all. Needs live verification; may need a dedicated selector
  once the real DOM structure is known.
- The background tab approach adds real latency (page load + a fixed
  settle delay for client-rendered content) — refreshing many items takes
  a while and only runs while the browser is open. It's not a true 24/7
  background job like the server cron.
- No icons are bundled yet (Chrome shows its default icon) — cosmetic,
  add `icons` to `manifest.json` whenever convenient.
