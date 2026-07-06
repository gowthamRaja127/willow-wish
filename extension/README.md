# Willow Wish Price Watcher (browser extension)

Refreshes prices for your Willow Wish wishlist items on sites the server
can't reach directly. Amazon, Flipkart, and Myntra already work fine via
the server-side `scrape-product` edge function and don't need this — this
extension exists specifically for **Nykaa, Meesho, and Instamart**, which
block plain server-side fetches outright (confirmed via direct testing).

## How it works

1. You log in once, in the extension popup, with the same Willow Wish
   account/password you use on the website.
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

## Load it locally

1. Open `chrome://extensions`.
2. Enable "Developer mode" (top right).
3. Click "Load unpacked" and select this `extension/` directory.
4. Click the extension icon, log in with your Willow Wish account.

## Known limitations / things to verify live

- **Nykaa and Meesho** extraction is based on the JSON-LD `Product` schema
  most e-commerce sites emit for SEO — this could not be verified against
  real page HTML ahead of time (both block plain `curl`/server fetches, the
  exact problem this extension solves), so it should be confirmed once
  running against a real logged-in tab. If it doesn't extract correctly,
  inspect the live page's `<script type="application/ld+json">` blocks (or
  add a site-specific selector to `content-extract.js` the same way Amazon
  and Flipkart have one).
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
