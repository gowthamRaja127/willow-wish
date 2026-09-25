# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

WillowWish is a real-time product wishlist and price tracker: users paste product links (Amazon, Flipkart, Nykaa, Meesho, Instamart, Myntra, ...), the app scrapes name/price/image, tracks price history, and alerts the user via WhatsApp/email when a price drops, a target price is hit, or a scheduled purchase reminder comes due. There's also a browser extension that scrapes on the user's behalf for platforms that block server-side fetches.

**Stack:** Angular 17 (standalone components, signals, `@if`/`@for` control flow, no NgModules) + Tailwind CSS + Supabase (Postgres, Auth, Edge Functions, Storage) + Chart.js. Hosted on Cloudflare Pages (frontend) + Supabase (edge functions). CI/CD and scheduled jobs run via GitHub Actions.

## Commands

```bash
npm install                          # install deps
npm start                            # ng serve, http://localhost:4200
npm run build                        # production build -> dist/willow-wish-app/browser
npm run watch                        # dev build, --watch
npm test                             # ng test (Karma + Jasmine, ChromeHeadless)
```

Running a single Angular spec: there's no npm script for it — use `ng test --include='**/wishlist.service.spec.ts'` (or point `--include` at any `*.spec.ts` glob).

**Supabase edge functions** (`supabase/functions/*`) are Deno, tested separately from the Angular app:

```bash
deno test --no-check --allow-env --allow-net supabase/functions/   # all edge function tests
deno test --no-check --allow-env --allow-net extension/            # extension content-script tests
```

`--no-check` is required — the repo has no `deno.json`/import map configured for type-checking against the `Deno` global, so `deno test` without it fails on `Cannot find name 'Deno'` even though the tests themselves are fine. Don't commit a `deno.lock` — none is currently tracked.

Local dev needs `src/environments/environment.ts` (gitignored), created per the README:
```ts
export const environment = {
  production: false,
  supabaseUrl: 'YOUR_SUPABASE_PROJECT_URL',
  supabaseKey: 'YOUR_SUPABASE_ANON_PUBLISHABLE_KEY',
};
```

## Architecture

### Frontend: signals-based services, standalone components

- `src/app/core/services/*` hold all state as `signal()`s, following one consistent convention throughout the app: a private writable signal (`_foo`), exposed publicly via `.asReadonly()`, mutated only through named methods (never `.set()` from outside the service). `WishlistService` (`src/app/core/services/wishlist.service.ts`) is the central one — items, groups, filters, sort, search, and the multi-select state used by the bulk toolbar all live there, with `filteredItems`/`stats`/`tiles` as `computed()` signals derived from them.
- `src/app/core/services/supabase.service.ts` wraps the Supabase client and stores the session in **cookies, not localStorage** (`ww_access_token`/`ww_refresh_token`/`ww_expires_at`), specifically so the browser extension's content script can read them to adopt the user's session (see `extension/bridge-content-script.js` and `supabase-rest.js`). Don't move this back to localStorage without checking the extension.
- `src/app/core/guards/auth.guard.ts` await `SupabaseService.ready$` before checking auth — routes render nothing until the initial session check resolves.
- Feature components live under `src/app/features/{auth,dashboard,wishlist}/`. Almost everything is inline-template standalone components (no separate `.html` files) using Tailwind utility classes defined in `src/styles.css` (`.btn-*`, `.card`, `.modal-*`, `.toast-*`, `.shimmer`, `.badge-*` — reuse these rather than inventing new utility patterns).
- Cross-cutting UI is mounted once at the app root (`app.component.html`): `<app-confirm-dialog>` (replaces `window.confirm()` — inject `ConfirmDialogService` and `await confirmSvc.confirm(message, opts)` instead of using the browser dialog) and the toast container lives in `dashboard.component.ts` (`ToastService`).
- Dashboard multi-select ("Google Photos style") lives on `WishlistService` (`selectionMode`/`selectedIds`/`toggleSelected`) and is rendered by `item-card.component.ts` (a low-opacity check icon, not a bordered checkbox, that goes to full opacity when selected) plus a top toolbar in `dashboard.component.ts` for bulk delete/share/mark-purchased/edit-reminder.

### Edge functions (Deno, `supabase/functions/`)

- `scrape-product/index.ts` — the core scraper. Fetches a product URL server-side (SSRF-guarded via `isAllowedProductUrl`: blocks localhost/private IPs/`.local`/`.internal`, rejects redirects to disallowed hosts), extracts price/image/title through a fallback chain (site-specific selectors for Amazon/Flipkart → JSON-LD `Product` schema → schema.org Microdata `itemprop` → Open Graph/Twitter meta), then applies the update via `applyItemUpdate` (ownership check, price_history insert, price-drop/target-met notification). Also accepts `mode: "client_update"` from the browser extension for platforms it can't fetch itself, and is rate-limited (60s cooldown) for non-service-role callers.
- `get-shared/index.ts` — public, unauthenticated (`verify_jwt = false` in `supabase/config.toml`) lookup by `share_token`/`wishlist_shares.token`, used by the `/shared/item/:token` and `/shared/list/:token` pages. A wishlist share can be scoped to a subset of items (`wishlist_shares.item_ids`); null/empty means "whole wishlist".
- `send-reminders/index.ts` — service-role-only sweep (checked via a literal bearer-token match against `SUPABASE_SERVICE_ROLE_KEY`, not Supabase's JWT verification) that finds items whose `target_purchase_date` has arrived and `reminder_sent` is false, notifies the owner, and flips the flag. Invoked on a cron.
- `_shared/notify.ts` — the Resend (email) + Twilio (WhatsApp) sending logic, shared between `scrape-product` (price-drop/target-met alerts) and `send-reminders` (purchase reminders). Edge functions can't share code via relative imports across deploys the way a monorepo package would, but Supabase's Deno runtime does resolve `../_shared/...` at deploy time, so this pattern works — keep new cross-function logic here rather than duplicating it.
- Tests live next to each function (`*.test.ts`) and mock the Supabase client as a plain object implementing just the `.from(table).select().eq()...` chain the code under test actually calls — see any existing `*.test.ts` for the pattern before adding a new one.

### Browser extension (`extension/`, MV3, no bundler)

Exists because some platforms (Nykaa, Meesho, Instamart/Swiggy, Flipkart, Myntra) block or degrade server-side fetches from Supabase's edge IPs specifically (confirmed in production, not reproducible from a local sandbox — see `extension/README.md`). It reuses the website's session via cookies (no separate login), and on a periodic alarm (or on-demand for Quick Add) opens a hidden background tab, extracts product data with the same fallback chain as `scrape-product` (deliberately duplicated in `content-extract.js` since the extension can't import from the Angular app or bundle `@supabase/supabase-js` — Chrome Web Store disallows remotely-hosted code), and posts the result to `scrape-product`'s `client_update` mode. The extension never writes to the database directly.

`ExtensionBridgeService` (Angular side) talks to it via `window.postMessage`, relayed by `bridge-content-script.js`. Install detection is a `PING`/`PONG` handshake with a short timeout (`isInstalled()`) — check that before calling `fetchItemNow()` (whose own timeout is much longer, ~25s, to allow for a real tab load) so the common "extension not installed" case resolves fast instead of making the user wait.

### Database (`supabase/migrations/`)

Numbered, sequential SQL migrations (`0001_...` onward) — the `items` table itself predates this migration history (created directly in the Supabase dashboard), so its schema isn't fully reconstructable from migrations alone; check the live dashboard when in doubt. Every table has RLS scoped to `auth.uid() = user_id` except `wishlist_shares`/`get-shared`'s read path, which is intentionally public via `share_token`.

### CI/CD (`.github/workflows/`)

- `deploy.yml` — on push to `main` or `release/dev`: builds and deploys the Angular app to Cloudflare Pages, deploys all three edge functions to Supabase.
- `thrice-daily.yml` — cron, sweeps all non-purchased items and calls `scrape-product` in `enrich` mode for each (server-to-server, using the service-role key as the bearer token, which `scrape-product` treats as a trusted caller distinct from a real user session).
- `reminder-check.yml` — cron (every 15 min), calls `send-reminders`.
