# WillowWish: Security Audit Fixes, UI Overhaul, and New Features

**Date:** 2026-07-06
**Status:** Approved, ready for implementation planning

## Context

An audit of the WillowWish codebase (Angular 17 + Supabase) turned up two security
issues in the `scrape-product` edge function, several incomplete/dead features, and
a general lack of visual polish. This spec covers fixing all of that and adding
four new features, plus a full visual redesign. Work is sequenced so nothing gets
styled twice: UI overhaul first, then backend/security, then features layered on
top of the new UI.

**Sequencing (approved):**

1. UI overhaul (design tokens + all components)
2. Security fix — IDOR + SSRF in `scrape-product`
3. Forgot password flow
4. Price history (fix the write pipeline + add the chart)
5. Tag-based filtering
6. Wishlist sharing (per-item + whole-list)

---

## 1. UI overhaul — Modern Minimal, Amber accent, open dashboard grid

Purely visual/template work. No component logic, service, or data-flow changes.

**Direction (chosen via visual mockup comparison):**
- Base style: **Modern Minimal** — white / near-black-not-pure-black surfaces, thin
  1px borders instead of heavy shadows and gradients, generous whitespace, quiet
  typography.
- Accent: **Amber** (keeps WillowWish's existing orange identity) but used far more
  sparingly — restricted to primary buttons, the active sidebar/nav item, and focus
  rings. It is not used for background gradients, avatar gradients, or decorative
  glows anymore.
- Semantic colors (price-drop green, price-increase red, target-met emerald) are
  untouched — they signal state, not brand, and stay exactly as they are.
- Layout: **open dashboard grid**, not the current narrow "Instagram feed" column.

**Design tokens (`src/styles.css`):**
- Light: `--background`/`--card` → true white; borders → light neutral gray
  (`#e8e8e8`-equivalent HSL); drop `shadow-glow`/`shadow-glow-lg` from default
  states, keep a subtle elevation shadow only on hover.
- Dark: near-black (not pure `#000`) background/card, off-white foreground, same
  thin-border philosophy so light/dark feel like the same system.
- `--primary` (amber) hue stays, but `.btn-primary`/badges drop the gradient fill
  in favor of a flat amber fill; gradient avatars (`from-primary-dark to-primary`)
  become flat neutral-bordered initials circles.

**Dashboard (`dashboard.component.ts`):**
- Replace `max-w-4xl mx-auto border-x` centered feed shell with a full-width main
  content area (sidebar unchanged in position, just no longer bounding a narrow
  column).
- Add a compact stat-tile row (Total items / Price drops / Saved / Purchased) as
  bordered tiles, replacing the current inline text stats next to the avatar.
- Item grid becomes responsive up to 4–5 columns on large screens (from 3), tighter
  gaps, matching the flattened card style.
- Search/sort toolbar: thin-border inputs instead of the current pill/glass
  (`glass`, fully-rounded) styling.

**Item card (`item-card.component.ts`):** flatten to match — white/near-black
card, thin border, quieter/smaller badges, amber reserved for the "Mark Got"
primary button; grid and list variants both restyled consistently.

**Add/Edit modal (`add-item-modal.component.ts`):** replace the tinted
`bg-muted/20` boxed sections with plain stacked fields separated by whitespace and
hairline dividers.

**Login/Register:** drop the blurred gradient-blob background decorations and glow
shadows on the card; plain neutral background, clean bordered card, same amber
button treatment as the rest of the app.

**Out of scope for this section:** no changes to routing, guards, services, or
any business logic — this is templates + `styles.css` only.

---

## 2. Security fix — `scrape-product` edge function

File: `supabase/functions/scrape-product/index.ts`

**IDOR fix:** the function currently trusts the `itemId` in the request body
unconditionally and uses the service-role key to patch that row and fire
notifications — meaning any authenticated caller who knows/guesses another user's
`itemId` can corrupt their item data or trigger fake price-drop notifications to
them.

Fix: extract the caller's identity from the `Authorization: Bearer <token>` header
via `supabase.auth.getUser(token)` at the top of the request (for both `preview`
and `enrich`/default modes where `itemId` is present). After fetching the existing
item row, compare `existing.user_id` to the caller's id — if they don't match,
return `403` and do not touch the row. The `preview` mode (no `itemId`, no DB
write) doesn't need this check since it never touches the database. The legacy
`userId`-only insert branch gets the same treatment: the inserted `user_id` must
equal the caller's own id, not an arbitrary body field.

**SSRF fix:** the function currently does `fetch(url)` on a fully attacker-supplied
URL with no validation. Fix: before fetching, parse the URL and reject anything
whose hostname isn't on an allowlist of the retailers the scraper actually knows
how to parse (`amazon.in`, `amazon.com`, `flipkart.com`, and subdomains thereof —
matching the existing Amazon/Flipkart-specific selectors in `extractPrice`/
`extractImage`). Also reject non-`http(s)` schemes. Anything else returns a `400`
before any outbound request is made — this both closes the SSRF hole and matches
what the scraper can usefully do anyway.

No changes to the CORS policy or the notification logic itself.

---

## 3. Forgot password flow

New standalone components/routes, following the existing auth component pattern
(`login.component.ts` / `register.component.ts`):

- **`ForgotPasswordComponent`** at `/auth/forgot-password`: single email field,
  submits via the existing (currently unused) `SupabaseService.resetPassword()`,
  then shows a "check your email" confirmation state (same pattern as
  `RegisterComponent`'s `emailSent` signal). Guarded by `guestGuard` like the other
  `/auth/*` routes.
- **`ResetPasswordComponent`** at `/auth/reset-password`: lands here from the email
  link (Supabase's recovery flow signs the user into a temporary session via
  `detectSessionInUrl`); shows a new-password form and calls
  `supabase.auth.updateUser({ password })`, then redirects to `/dashboard` on
  success.
- **Routing fix:** `reset-password` must be registered as a sibling route under
  `/auth` but **excluded from `guestGuard`** — the recovery session that the email
  link creates would otherwise make `guestGuard` bounce the user straight to
  `/dashboard` before they can set a new password. It gets no guard (or a
  dedicated pass-through) instead.
- `login.component.ts`'s existing `routerLink="/auth/forgot-password"` starts
  working as-is once the route exists — no change needed there.

---

## 4. Price history — fix the pipeline, then add the UI

**The gap:** `PriceHistoryEntry`, the `price_history` table, and
`WishlistService.getPriceHistory()` all already exist, but nothing ever writes to
`price_history` — the edge function only ever updates `items.current_price`. The
feature has no data and no UI.

**Pipeline fix (`scrape-product/index.ts`):** in the `enrich` path, when
`price > 0` and the new price differs from `existing.current_price` (or
`current_price` was previously null), insert a row into `price_history`
(`item_id`, `price`, `recorded_at: now()`) in addition to patching `items`. This
gives a real trail of changes instead of one row per poll.

**Migration:** add `supabase/migrations/` (doesn't exist yet in the repo) with a
`create table if not exists public.price_history (...)` guard, defensive in case
the table was only ever created ad hoc via the dashboard. This also establishes
version-controlled schema going forward, which the audit flagged as missing
entirely.

**UI:** new `PriceHistoryChartComponent` using the already-installed `chart.js`
dependency — a line chart of price over time for one item. Opened via a new "View
Price History" entry in the item-card's actions menu (both grid and list
variants), rendered in a modal consistent with the new Modern Minimal styling.

---

## 5. Tag-based filtering

Clicking a tag chip on an item card sets it as an active tag filter, shown as a
small removable chip near the search bar on the dashboard. This is a separate
filter dimension from the free-text search box (`WishlistService.searchQuery`) —
both apply together. `WishlistService.filteredItems` gains an additional filter
step: when an active tag is set, items must include that tag (case-insensitive)
in their `tags` array. Clicking the same tag again, or the chip's remove control,
clears it.

---

## 6. Wishlist sharing — per-item + whole-list, full detail visible

Per the product decision: shared links show everything the owner sees, including
target price, notes, and purchase status — no field stripping.

**Schema (new migration, `supabase/migrations/`):**
- `items.share_token` — nullable, unique `text` column (per-item share).
- `wishlist_shares` table — `user_id uuid primary key references auth.users(id)`,
  unique `token text not null`, `created_at timestamptz default now()`. One active
  token per user; regenerating replaces it, invalidating the old link.

**Creating a link:** no new backend needed — handled through the existing
authenticated Supabase client, since the user is only ever writing their own row
(same RLS trust boundary as `updateItem`/`addItem` today). A "Share" action lazily
generates a `crypto.randomUUID()` token the first time it's used (persisted on the
item, or upserted into `wishlist_shares` for the whole-list case) and reuses it on
subsequent clicks. A "regenerate link" action explicitly replaces the token,
invalidating any previously shared link.

**Viewing a shared link:** new public, unauthenticated routes:
- `/shared/item/:token` → `SharedItemComponent`
- `/shared/list/:token` → `SharedWishlistComponent`

Both call a **new edge function** (`get-shared`) rather than opening public RLS
directly on `items`/`wishlist_shares` — a permissive `USING (share_token IS NOT
NULL)`-style RLS policy would let anyone querying the REST API directly retrieve
*every* shared row across *all* users, not just the one matching a specific token,
since RLS can't validate against a client-supplied token value. The edge function
instead uses the service-role key server-side and does an exact `.eq('share_token',
token)` (or the `wishlist_shares` equivalent) match, returning only that one row
(or that one user's items) — same trust pattern already established by
`scrape-product`. Neither route is guarded by `authGuard`/`guestGuard`.

**Response shape:** full item detail (name, image, description, price, target
price, target date, tags, notes, purchase status) — matches the "everything you
see" product decision. No auth required to view.

---

## Explicitly out of scope

- No changes to the existing email/WhatsApp notification logic beyond the IDOR fix
  (who it's allowed to fire for).
- No rate-limiting or expiry on share links — regenerate-to-revoke is the only
  revocation mechanism for this pass.
- No automated background polling for price checks — scraping remains triggered by
  the existing add-item / manual flows only.
