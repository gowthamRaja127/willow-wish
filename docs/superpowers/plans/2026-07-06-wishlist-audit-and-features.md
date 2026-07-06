# WillowWish Audit Fixes, UI Overhaul & New Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle WillowWish to a Modern Minimal look, fix the two security holes in the `scrape-product` edge function, and ship forgot-password, price history charting, tag filtering, and wishlist sharing — in that order, per the approved spec.

**Architecture:** Angular 17 standalone components + signals throughout (no NgModules, no new state library). Supabase Postgres + Auth + Edge Functions (Deno) as the only backend. Styling is Tailwind utility classes driven by CSS custom properties in `src/styles.css`. No new npm dependencies are needed — `chart.js` is already installed and unused; everything else is Angular/Supabase primitives already in use.

**Tech Stack:** Angular 17 (standalone components, signals, new `@if`/`@for` control flow), Tailwind CSS, Supabase (`@supabase/supabase-js`), Deno edge functions, `chart.js`.

## Global Constraints

- Follow the existing standalone-component pattern (`standalone: true`, inline `template`, `imports: [...]`) — do not introduce NgModules.
- Follow the existing signal-based state pattern in services (`signal()`, `.asReadonly()`, `computed()`) — do not introduce NgRx or similar.
- No new npm packages. `chart.js` and `lucide-angular` are already dependencies; `lucide-angular` stays unused (out of scope — the app uses inline SVGs, don't migrate icons as part of this plan).
- SQL migrations live in `supabase/migrations/` (new directory) and must be idempotent (`create table if not exists`, `drop policy if exists` before `create policy`) since there is no existing migration history to anchor against — the live schema may already partially exist.
- Neither the Deno CLI nor the Supabase CLI is available in this environment. Edge function tasks are verified by (a) extracting any pure logic into a plain-JS-testable form and running it under Node, and (b) a manual code-review checklist. They cannot be executed end-to-end locally — say so explicitly rather than claiming a test passed.
- There is no existing Karma/Jasmine spec in the repo. For template/styling-only tasks, "test" means `ng build` succeeding plus an explicit manual-verification checklist — do not invent fake specs that assert nothing meaningful.
- Price-drop green / price-increase red / target-met emerald are semantic colors and must not change in the UI overhaul — only structural/neutral colors (background, card, border, primary usage) change.

---

## Phase 1 — UI Overhaul (Modern Minimal, Amber accent, open grid)

### Task 1: Fix theme tokens and flatten shadow/glass defaults

**Files:**
- Modify: `src/styles.css:8-54` (`:root` and `.dark` blocks), `src/styles.css:103-105` (`.btn-primary`), `src/styles.css:130-132` (`.card`)

**Interfaces:**
- Produces: the CSS custom properties every other task's Tailwind classes (`bg-background`, `bg-card`, `border-border`, `bg-primary`, etc.) resolve against. No other task should hardcode colors — they consume these tokens via Tailwind's existing `tailwind.config.js` color mappings (unchanged).

Currently `:root` and `.dark` have **identical** values (both near-black) — toggling dark mode has no visual effect at all. This task gives light mode a real light theme and fixes that bug as a side effect of the redesign.

- [ ] **Step 1: Replace the `:root` block with true light-theme values**

In `src/styles.css`, replace:

```css
  :root {
    --background: 0 0% 4%;
    --foreground: 0 0% 95%;
    --card: 0 0% 8%;
    --card-foreground: 0 0% 95%;
    --primary: 28 100% 54%;
    --primary-dark: 28 100% 44%;
    --primary-foreground: 0 0% 0%;
    --secondary: 0 0% 15%;
    --secondary-foreground: 0 0% 95%;
    --muted: 0 0% 15%;
    --muted-foreground: 0 0% 65%;
    --accent: 28 100% 54%;
    --accent-foreground: 0 0% 0%;
    --border: 0 0% 15%;
    --input: 0 0% 15%;
    --price-drop: 142 70% 50%;
    --price-drop-bg: 142 70% 10%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --sidebar: 0 0% 6%;
    --radius: 0.75rem;
  }
```

with:

```css
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 9%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 9%;
    --primary: 28 100% 54%;
    --primary-dark: 28 100% 44%;
    --primary-foreground: 0 0% 0%;
    --secondary: 0 0% 96%;
    --secondary-foreground: 0 0% 9%;
    --muted: 0 0% 96%;
    --muted-foreground: 0 0% 45%;
    --accent: 28 100% 54%;
    --accent-foreground: 0 0% 0%;
    --border: 0 0% 90%;
    --input: 0 0% 90%;
    --price-drop: 142 70% 35%;
    --price-drop-bg: 142 70% 95%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --sidebar: 0 0% 98%;
    --radius: 0.75rem;
  }
```

- [ ] **Step 2: Replace the `.dark` block with near-black (not pure black) dark-theme values**

Replace:

```css
  .dark {
    --background: 0 0% 4%;
    --foreground: 0 0% 95%;
    --card: 0 0% 8%;
    --card-foreground: 0 0% 95%;
    --primary: 28 100% 54%;
    --primary-dark: 28 100% 44%;
    --primary-foreground: 0 0% 0%;
    --secondary: 0 0% 15%;
    --secondary-foreground: 0 0% 95%;
    --muted: 0 0% 15%;
    --muted-foreground: 0 0% 65%;
    --accent: 28 100% 54%;
    --accent-foreground: 0 0% 0%;
    --border: 0 0% 15%;
    --input: 0 0% 15%;
    --price-drop: 142 70% 50%;
    --price-drop-bg: 142 70% 10%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --sidebar: 0 0% 6%;
    --radius: 0.75rem;
  }
```

with:

```css
  .dark {
    --background: 0 0% 7%;
    --foreground: 0 0% 92%;
    --card: 0 0% 10%;
    --card-foreground: 0 0% 92%;
    --primary: 28 100% 54%;
    --primary-dark: 28 100% 44%;
    --primary-foreground: 0 0% 0%;
    --secondary: 0 0% 14%;
    --secondary-foreground: 0 0% 92%;
    --muted: 0 0% 14%;
    --muted-foreground: 0 0% 60%;
    --accent: 28 100% 54%;
    --accent-foreground: 0 0% 0%;
    --border: 0 0% 18%;
    --input: 0 0% 18%;
    --price-drop: 142 65% 50%;
    --price-drop-bg: 142 70% 12%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --sidebar: 0 0% 5%;
    --radius: 0.75rem;
  }
```

- [ ] **Step 3: Drop the default card shadow, keep elevation only on hover**

Replace:

```css
  .card {
    @apply rounded-xl border bg-card text-card-foreground shadow-card;
  }
```

with:

```css
  .card {
    @apply rounded-xl border bg-card text-card-foreground;
  }
```

(`.card-hover` right below it already adds `hover:shadow-card-hover` — leave it as-is, elevation on hover is intentional and unchanged.)

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds with no Tailwind/PostCSS errors.

- [ ] **Step 5: Manual verification**

Run `npm start`, open the app, and confirm: the login page background is white (not black), and clicking the "Theme" toggle on the dashboard actually switches between a white and a near-black (not pure black) background — this is the bug fix.

- [ ] **Step 6: Commit**

```bash
git add src/styles.css
git commit -m "fix: give light/dark themes distinct values, flatten default card shadow"
```

---

### Task 2: Restyle item-card component (grid + list views)

**Files:**
- Modify: `src/app/features/wishlist/item-card/item-card.component.ts`

**Interfaces:**
- Consumes: CSS tokens from Task 1 (`bg-card`, `border-border`, `bg-muted`, `bg-primary`, etc.) — no new component inputs/outputs in this task (those come in Tasks 13/15/19).

- [ ] **Step 1: Flatten the grid-view avatar circle from a gradient to a neutral bordered circle**

Replace:

```html
            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-primary-dark flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0">
              {{ item.product_name ? item.product_name.charAt(0).toUpperCase() : 'W' }}
            </div>
```

with:

```html
            <div class="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-foreground font-bold text-xs shrink-0">
              {{ item.product_name ? item.product_name.charAt(0).toUpperCase() : 'W' }}
            </div>
```

- [ ] **Step 2: Remove the drop shadow from the grid-view price-drop and target-met badges**

Replace:

```html
            @if (priceDrop > 0) {
              <div class="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded shadow">
                -{{ dropPercent }}% OFF
              </div>
            }
            @if (isTargetReached) {
              <div class="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                TARGET MET
              </div>
            }
```

with:

```html
            @if (priceDrop > 0) {
              <div class="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-md">
                -{{ dropPercent }}% OFF
              </div>
            }
            @if (isTargetReached) {
              <div class="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                TARGET MET
              </div>
            }
```

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds with no template/type errors.

- [ ] **Step 4: Manual verification**

Add an item with a price drop and one marked target-reached; confirm both badges render flat (no drop shadow) and the avatar circle in grid view is a plain bordered circle, not an orange gradient.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/wishlist/item-card/item-card.component.ts
git commit -m "style: flatten item-card avatar and badges for Modern Minimal look"
```

---

### Task 3: Restyle dashboard — open layout, stat tiles, toolbar, denser grid

**Files:**
- Modify: `src/app/features/dashboard/dashboard.component.ts`

**Interfaces:**
- Consumes: `WishlistService.stats` (unchanged shape: `{ total, totalSavings, priceDrop, purchased, targetReached }`).

- [ ] **Step 1: Widen the main content area — drop the centered feed column**

Replace:

```html
      <main
        class="flex-1 w-full max-w-4xl mx-auto border-x border-border min-h-screen bg-background"
      >
```

with:

```html
      <main
        class="flex-1 w-full min-h-screen bg-background"
      >
```

- [ ] **Step 2: Flatten the profile avatar and remove the inline stats — replace with a stat-tile row**

Replace:

```html
          <div
            class="w-20 h-20 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-primary-dark to-primary flex items-center justify-center text-3xl sm:text-5xl font-bold text-primary-foreground shrink-0 border-2 border-primary-dark shadow-glow-lg"
          >
            {{ userInitial() }}
          </div>
          <div class="flex-1 flex flex-col gap-3">
            <div class="flex items-center gap-4">
              <h1 class="text-xl sm:text-2xl font-semibold">
                {{ userEmail() }}
              </h1>
              <button
                (click)="toggleDark()"
                class="btn-secondary btn-sm rounded-full hidden sm:flex"
              >
                Theme
              </button>
            </div>
            <div class="flex items-center gap-6 text-sm sm:text-base">
              <div>
                <span class="font-bold text-lg">{{ stats().total }}</span> items
              </div>
              <div>
                <span class="font-bold text-lg">{{ stats().priceDrop }}</span>
                drops
              </div>
              <div>
                <span class="font-bold text-lg"
                  >₹{{ stats().totalSavings | number: '1.0-0' }}</span
                >
                saved
              </div>
            </div>
            <div class="text-sm text-muted-foreground hidden sm:block">
              Organizing your wishes and catching price drops before they're
              gone. ✨
            </div>
```

with:

```html
          <div
            class="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-muted border border-border flex items-center justify-center text-3xl sm:text-4xl font-bold text-foreground shrink-0"
          >
            {{ userInitial() }}
          </div>
          <div class="flex-1 flex flex-col gap-3">
            <div class="flex items-center gap-4">
              <h1 class="text-xl sm:text-2xl font-semibold">
                {{ userEmail() }}
              </h1>
              <button
                (click)="toggleDark()"
                class="btn-secondary btn-sm rounded-lg hidden sm:flex"
              >
                Theme
              </button>
            </div>
            <div class="text-sm text-muted-foreground hidden sm:block">
              Organizing your wishes and catching price drops before they're
              gone. ✨
            </div>
```

- [ ] **Step 3: Add a stat-tile row above the search/sort toolbar**

Replace:

```html
        <!-- Search & Sort (Instagram Stories-like bar or clean toolbar) -->
        <div
          class="flex items-center justify-between p-4 border-b border-border bg-background sticky top-0 z-10 gap-3"
        >
```

with:

```html
        <!-- Stat tiles -->
        <div class="grid grid-cols-4 gap-3 p-4 border-b border-border">
          <div class="rounded-lg border border-border p-3">
            <div class="text-lg font-bold text-foreground">{{ stats().total }}</div>
            <div class="text-xs text-muted-foreground">Items</div>
          </div>
          <div class="rounded-lg border border-border p-3">
            <div class="text-lg font-bold text-foreground">{{ stats().priceDrop }}</div>
            <div class="text-xs text-muted-foreground">Drops</div>
          </div>
          <div class="rounded-lg border border-border p-3">
            <div class="text-lg font-bold text-foreground">₹{{ stats().totalSavings | number: '1.0-0' }}</div>
            <div class="text-xs text-muted-foreground">Saved</div>
          </div>
          <div class="rounded-lg border border-border p-3">
            <div class="text-lg font-bold text-foreground">{{ stats().purchased }}</div>
            <div class="text-xs text-muted-foreground">Purchased</div>
          </div>
        </div>

        <!-- Search & Sort -->
        <div
          class="flex items-center justify-between p-4 border-b border-border bg-background sticky top-0 z-10 gap-3"
        >
```

- [ ] **Step 4: Restyle the search input and sort select to thin-border inputs**

Replace:

```html
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (input)="onSearch()"
              placeholder="Search wishlist..."
              class="input pl-9 h-9 bg-muted/50 border-none rounded-full"
            />
```

with:

```html
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (input)="onSearch()"
              placeholder="Search wishlist..."
              class="input pl-9 h-9 rounded-lg"
            />
```

Replace:

```html
            <select
              (change)="onSort($event)"
              class="glass rounded-full px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground font-medium cursor-pointer appearance-none shadow-sm transition-all hover:bg-card/90"
            >
```

with:

```html
            <select
              (change)="onSort($event)"
              class="input h-9 w-auto rounded-lg px-3 text-sm font-medium cursor-pointer appearance-none"
            >
```

- [ ] **Step 5: Widen the item grid to up to 5 columns with tighter gaps**

Replace:

```html
            <div [class]="viewMode() === 'grid' ? 'p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' : 'p-4 flex flex-col gap-4'">
```

with:

```html
            <div [class]="viewMode() === 'grid' ? 'p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4' : 'p-4 flex flex-col gap-4'">
```

- [ ] **Step 6: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds with no template/type errors.

- [ ] **Step 7: Manual verification**

Run `npm start`, sign in, and confirm: the dashboard now spans the full width (no centered narrow column), a row of 4 stat tiles appears above the search bar, the item grid shows more columns on a wide window, and the search input/sort dropdown have thin borders instead of pill/glass styling.

- [ ] **Step 8: Commit**

```bash
git add src/app/features/dashboard/dashboard.component.ts
git commit -m "style: open up dashboard layout, add stat tiles, densify item grid"
```

---

### Task 4: Restyle add/edit item modal

**Files:**
- Modify: `src/app/features/wishlist/add-item-modal/add-item-modal.component.ts`

- [ ] **Step 1: Replace the tinted "Product Name & Description" box with plain stacked fields**

Replace:

```html
          <!-- Product Name & Description -->
          <div class="space-y-3 p-3 bg-muted/20 border border-border/50 rounded-xl">
            <div class="space-y-1.5">
```

with:

```html
          <!-- Product Name & Description -->
          <div class="space-y-3 pb-3 border-b border-border">
            <div class="space-y-1.5">
```

(The closing `</div>` for this section is unchanged — only the opening tag's classes change.)

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds with no template/type errors.

- [ ] **Step 3: Manual verification**

Open "Add to Wishlist" and confirm the Product Name/Description fields sit against the plain modal background with a hairline separator below them instead of a tinted rounded box.

- [ ] **Step 4: Commit**

```bash
git add src/app/features/wishlist/add-item-modal/add-item-modal.component.ts
git commit -m "style: replace tinted form section with hairline-separated fields"
```

---

### Task 5: Restyle login screen

**Files:**
- Modify: `src/app/features/auth/login/login.component.ts`

- [ ] **Step 1: Remove the blurred gradient-blob background decoration**

Replace:

```html
    <div class="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background flex items-center justify-center p-4">
      <!-- Background pattern -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl"></div>
        <div class="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/8 blur-3xl"></div>
      </div>

      <div class="w-full max-w-md relative">
```

with:

```html
    <div class="min-h-screen bg-background flex items-center justify-center p-4">
      <div class="w-full max-w-md relative">
```

- [ ] **Step 2: Drop the glow shadow on the auth card**

Replace:

```html
        <div class="card p-8 animate-slide-up shadow-card-hover">
```

with:

```html
        <div class="card p-8 animate-slide-up">
```

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds with no template/type errors.

- [ ] **Step 4: Manual verification**

Load `/auth/login` and confirm the page shows a plain background with a bordered card, no blurred orange blobs, no drop shadow on the card.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/auth/login/login.component.ts
git commit -m "style: remove gradient-blob background and glow shadow from login"
```

---

### Task 6: Restyle register screen

**Files:**
- Modify: `src/app/features/auth/register/register.component.ts`

- [ ] **Step 1: Remove the blurred gradient-blob background decoration**

Replace:

```html
    <div class="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background flex items-center justify-center p-4">
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl"></div>
        <div class="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/8 blur-3xl"></div>
      </div>

      <div class="w-full max-w-md relative">
```

with:

```html
    <div class="min-h-screen bg-background flex items-center justify-center p-4">
      <div class="w-full max-w-md relative">
```

- [ ] **Step 2: Drop the glow shadow on both card states**

Replace both occurrences of:

```html
          <div class="card p-8 animate-slide-up text-center shadow-card-hover">
```

and

```html
          <div class="card p-8 animate-slide-up shadow-card-hover">
```

with (respectively):

```html
          <div class="card p-8 animate-slide-up text-center">
```

```html
          <div class="card p-8 animate-slide-up">
```

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds with no template/type errors.

- [ ] **Step 4: Manual verification**

Load `/auth/register` and confirm the same plain-background, no-glow treatment as login, in both the form state and the "check your email" confirmation state.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/auth/register/register.component.ts
git commit -m "style: remove gradient-blob background and glow shadow from register"
```

---

## Phase 2 — Security fix: `scrape-product` edge function

### Task 7: Fix IDOR — verify the caller owns the item before writing to it

**Files:**
- Modify: `supabase/functions/scrape-product/index.ts`

**Interfaces:**
- Produces: the function now returns `401` if the `Authorization` header doesn't carry a valid Supabase JWT, and `403` if the JWT's user doesn't own the `itemId` (or doesn't match the `userId`) in the request body.

- [ ] **Step 1: Move Supabase client creation earlier and authenticate the caller**

Replace:

```ts
    const html = await response.text()
    const doc = new DOMParser().parseFromString(html, 'text/html')
    if (!doc) throw new Error('HTML parsing failure')

    const title  = doc.querySelector('meta[property="og:title"]')?.getAttribute('content')
      || doc.querySelector('title')?.innerText || null
    const image  = extractImage(doc)
    const desc   = doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || null
    const price  = extractPrice(doc)

    const scraped = { title, image, desc, price }

    // ── mode: "preview" — just return scraped data, don't touch DB ─────
    if (mode === 'preview') {
      return new Response(
        JSON.stringify({ success: true, ...scraped }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── mode: "update" or "enrich" — database write & compare ─
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    if (itemId) {
```

with:

```ts
    const html = await response.text()
    const doc = new DOMParser().parseFromString(html, 'text/html')
    if (!doc) throw new Error('HTML parsing failure')

    const title  = doc.querySelector('meta[property="og:title"]')?.getAttribute('content')
      || doc.querySelector('title')?.innerText || null
    const image  = extractImage(doc)
    const desc   = doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || null
    const price  = extractPrice(doc)

    const scraped = { title, image, desc, price }

    // ── mode: "preview" — just return scraped data, don't touch DB ─────
    if (mode === 'preview') {
      return new Response(
        JSON.stringify({ success: true, ...scraped }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── mode: "update" or "enrich" — database write & compare ─
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const authHeader = req.headers.get('Authorization') ?? ''
    const bearerToken = authHeader.replace(/^Bearer\s+/i, '')
    const { data: authData, error: authError } = await supabase.auth.getUser(bearerToken)
    if (authError || !authData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: corsHeaders }
      )
    }
    const callerId = authData.user.id

    if (itemId) {
```

- [ ] **Step 2: Reject writes to items the caller doesn't own**

Replace:

```ts
    if (itemId) {
      // 1. Fetch current stored fields to compare
      const { data: existing } = await supabase
        .from('items')
        .select('user_id, product_name, initial_price, current_price, target_price, is_notified')
        .eq('id', itemId)
        .single()

      const patch: Record<string, any> = { last_scraped_at: new Date() }
```

with:

```ts
    if (itemId) {
      // 1. Fetch current stored fields to compare
      const { data: existing } = await supabase
        .from('items')
        .select('user_id, product_name, initial_price, current_price, target_price, is_notified')
        .eq('id', itemId)
        .single()

      if (!existing || existing.user_id !== callerId) {
        return new Response(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: corsHeaders }
        )
      }

      const patch: Record<string, any> = { last_scraped_at: new Date() }
```

- [ ] **Step 3: Reject the legacy insert path if `userId` doesn't match the caller**

Replace:

```ts
    } else if (userId) {
      // Legacy / Backup
      await supabase.from('items').insert({
```

with:

```ts
    } else if (userId) {
      if (userId !== callerId) {
        return new Response(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: corsHeaders }
        )
      }
      // Legacy / Backup
      await supabase.from('items').insert({
```

- [ ] **Step 4: Manual verification checklist (no local Deno/Supabase CLI available)**

Code-review checklist to confirm before merging:
1. `preview` mode still returns before any auth check runs (unauthenticated preview scraping is intentionally allowed — it never touches the DB).
2. Every code path that reaches the `itemId`/`userId` branches has `callerId` defined and checked first.
3. `WishlistService.scrapeProduct()` in `src/app/core/services/wishlist.service.ts` already sends `Authorization: Bearer ${session?.access_token}` on every call (see existing code, unchanged) — so legitimate calls from the app continue to work with no client-side change needed.
4. If you have access to a deployed instance of this function, confirm behavior with:
   ```bash
   curl -X POST https://<project>.supabase.co/functions/v1/scrape-product \
     -H "Authorization: Bearer <a different user's token>" \
     -H "Content-Type: application/json" \
     -d '{"url":"https://www.amazon.in/dp/EXAMPLE","itemId":"<some other user'\''s item id>"}'
   ```
   Expected: `403 {"error":"Forbidden"}`.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/scrape-product/index.ts
git commit -m "fix: verify caller owns the item before scrape-product writes to it"
```

---

### Task 8: Fix SSRF — restrict scraping to known retailer hosts

**Files:**
- Modify: `supabase/functions/scrape-product/index.ts`

**Interfaces:**
- Produces: `isAllowedProductUrl(rawUrl: string): boolean`, a pure function with no Deno-specific APIs (usable/testable under plain Node).

- [ ] **Step 1: Add the allowlist check function**

Replace:

```ts
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

with:

```ts
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_PRODUCT_HOSTS = ['amazon.in', 'amazon.com', 'flipkart.com']

function isAllowedProductUrl(rawUrl: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return false
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
  const host = parsed.hostname.toLowerCase()
  return ALLOWED_PRODUCT_HOSTS.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`)
  )
}
```

- [ ] **Step 2: Reject disallowed URLs before fetching**

Replace:

```ts
    const { url, itemId, userId, mode } = await req.json()

    if (!url) throw new Error('url is required')

    // ── Fetch product page ─────────────────────────────────────────────
```

with:

```ts
    const { url, itemId, userId, mode } = await req.json()

    if (!url) throw new Error('url is required')

    if (!isAllowedProductUrl(url)) {
      return new Response(
        JSON.stringify({ error: 'URL host is not supported' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // ── Fetch product page ─────────────────────────────────────────────
```

- [ ] **Step 3: Write a standalone Node test for the pure allowlist logic**

Create `scripts/test-scrape-allowlist.mjs` (throwaway verification script, not part of the app bundle):

```js
function isAllowedProductUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  const host = parsed.hostname.toLowerCase();
  const ALLOWED_PRODUCT_HOSTS = ['amazon.in', 'amazon.com', 'flipkart.com'];
  return ALLOWED_PRODUCT_HOSTS.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`)
  );
}

const cases = [
  ['https://www.amazon.in/dp/B0EXAMPLE', true],
  ['https://amazon.com/dp/B0EXAMPLE', true],
  ['https://m.flipkart.com/item/123', true],
  ['http://169.254.169.254/latest/meta-data/', false],
  ['http://localhost:5432/', false],
  ['https://evilamazon.in.attacker.com/', false],
  ['ftp://amazon.in/dp/x', false],
  ['not a url', false],
];

let failed = 0;
for (const [url, expected] of cases) {
  const actual = isAllowedProductUrl(url);
  const pass = actual === expected;
  if (!pass) failed++;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${url} -> ${actual} (expected ${expected})`);
}
if (failed > 0) {
  console.error(`${failed} case(s) failed`);
  process.exit(1);
}
console.log('All cases passed');
```

- [ ] **Step 4: Run the test**

Run: `node scripts/test-scrape-allowlist.mjs`
Expected: all 8 cases print `PASS`, ending with `All cases passed`.

- [ ] **Step 5: Delete the throwaway test script (its job was verifying the logic you just copied into the real function, not living in the repo permanently)**

```bash
rm scripts/test-scrape-allowlist.mjs
```

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/scrape-product/index.ts
git commit -m "fix: restrict scrape-product to an allowlist of known retailer hosts (SSRF fix)"
```

---

## Phase 3 — Forgot password flow

### Task 9: Add ForgotPasswordComponent + route

**Files:**
- Create: `src/app/features/auth/forgot-password/forgot-password.component.ts`
- Modify: `src/app/app.routes.ts`

**Interfaces:**
- Consumes: `SupabaseService.resetPassword(email: string)` (already exists, `src/app/core/services/supabase.service.ts:188-192`, currently unused).

- [ ] **Step 1: Create the component**

Create `src/app/features/auth/forgot-password/forgot-password.component.ts`:

```ts
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-background flex items-center justify-center p-4">
      <div class="w-full max-w-md relative">
        <div class="text-center mb-8 animate-fade-in">
          <div class="inline-flex items-center justify-center mb-4">
            <img src="assets/logo.svg" alt="WillowWish" class="h-24 w-auto" />
          </div>
          <h1 class="text-3xl font-display font-bold text-foreground">Reset your password</h1>
          <p class="text-muted-foreground mt-2">We'll email you a link to set a new one</p>
        </div>

        @if (emailSent()) {
          <div class="card p-8 animate-slide-up text-center">
            <h2 class="text-xl font-display font-bold text-foreground mb-2">Check your email</h2>
            <p class="text-muted-foreground text-sm">We sent a password reset link to <strong class="text-foreground">{{ email }}</strong>.</p>
            <a routerLink="/auth/login" class="btn-primary btn-md mt-6 inline-flex">Back to Sign in</a>
          </div>
        } @else {
          <div class="card p-8 animate-slide-up">
            @if (errorMessage()) {
              <div class="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {{ errorMessage() }}
              </div>
            }

            <form (ngSubmit)="onSubmit()" class="space-y-5">
              <div class="space-y-1.5">
                <label class="text-sm font-medium text-foreground" for="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  [(ngModel)]="email"
                  name="email"
                  required
                  placeholder="you@example.com"
                  class="input"
                  [disabled]="loading()"
                />
              </div>

              <button type="submit" class="btn-primary btn-lg w-full" [disabled]="loading() || !email">
                @if (loading()) {
                  Sending...
                } @else {
                  Send reset link
                }
              </button>
            </form>

            <p class="text-center text-sm text-muted-foreground mt-6">
              Remembered your password?
              <a routerLink="/auth/login" class="text-primary font-medium hover:underline ml-1">Sign in</a>
            </p>
          </div>
        }
      </div>
    </div>
  `
})
export class ForgotPasswordComponent {
  email = '';
  loading = signal(false);
  emailSent = signal(false);
  errorMessage = signal('');

  constructor(private sb: SupabaseService, private toast: ToastService) {}

  async onSubmit() {
    if (!this.email) return;
    this.loading.set(true);
    this.errorMessage.set('');

    const { error } = await this.sb.resetPassword(this.email);
    this.loading.set(false);

    if (error) {
      this.errorMessage.set(error.message || 'Could not send reset link. Please try again.');
    } else {
      this.emailSent.set(true);
    }
  }
}
```

- [ ] **Step 2: Register the route as a guarded child of `/auth`**

In `src/app/app.routes.ts`, replace:

```ts
    children: [
      { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
      { path: 'register', loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ]
```

with:

```ts
    children: [
      { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
      { path: 'register', loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) },
      { path: 'forgot-password', loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ]
```

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds with no template/type errors.

- [ ] **Step 4: Manual verification**

Run `npm start`, go to `/auth/login`, click "Forgot password?", confirm it now loads the new form (previously fell through to the login redirect), submit an email, and confirm the "check your email" state appears.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/auth/forgot-password/forgot-password.component.ts src/app/app.routes.ts
git commit -m "feat: add forgot-password page wired to existing resetPassword() service method"
```

---

### Task 10: Add ResetPasswordComponent + route (excluded from guestGuard)

**Files:**
- Create: `src/app/features/auth/reset-password/reset-password.component.ts`
- Modify: `src/app/app.routes.ts`

**Interfaces:**
- Consumes: `SupabaseService.client.auth.updateUser({ password })` (Supabase SDK method, same one already used in `dashboard.component.ts` for `whatsapp_number` updates).

- [ ] **Step 1: Create the component**

Create `src/app/features/auth/reset-password/reset-password.component.ts`:

```ts
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-background flex items-center justify-center p-4">
      <div class="w-full max-w-md relative">
        <div class="text-center mb-8 animate-fade-in">
          <div class="inline-flex items-center justify-center mb-4">
            <img src="assets/logo.svg" alt="WillowWish" class="h-24 w-auto" />
          </div>
          <h1 class="text-3xl font-display font-bold text-foreground">Set a new password</h1>
        </div>

        <div class="card p-8 animate-slide-up">
          @if (errorMessage()) {
            <div class="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {{ errorMessage() }}
            </div>
          }

          <form (ngSubmit)="onSubmit()" class="space-y-5">
            <div class="space-y-1.5">
              <label class="text-sm font-medium text-foreground" for="password">New password</label>
              <input
                id="password"
                type="password"
                [(ngModel)]="password"
                name="password"
                required
                minlength="8"
                placeholder="Min. 8 characters"
                class="input"
                [disabled]="loading()"
              />
            </div>

            <button type="submit" class="btn-primary btn-lg w-full" [disabled]="loading() || password.length < 8">
              @if (loading()) {
                Saving...
              } @else {
                Save new password
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  `
})
export class ResetPasswordComponent {
  password = '';
  loading = signal(false);
  errorMessage = signal('');

  constructor(private sb: SupabaseService, private toast: ToastService, private router: Router) {}

  async onSubmit() {
    if (this.password.length < 8) return;
    this.loading.set(true);
    this.errorMessage.set('');

    const { error } = await this.sb.client.auth.updateUser({ password: this.password });
    this.loading.set(false);

    if (error) {
      this.errorMessage.set(error.message || 'Could not update password. Please try again.');
    } else {
      this.toast.success('Password updated!');
      this.router.navigate(['/dashboard']);
    }
  }
}
```

- [ ] **Step 2: Register it as a top-level route, outside `guestGuard`**

The recovery email link signs the user into a temporary session before they land here — if this route were a guarded child of `/auth` (like `login`/`register`), `guestGuard` would see `isAuthenticated() === true` and bounce them straight to `/dashboard` before they could set a new password. It must sit outside that guard.

In `src/app/app.routes.ts`, replace:

```ts
export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'auth',
    canActivate: [guestGuard],
```

with:

```ts
export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'auth/reset-password',
    loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
  },
  {
    path: 'auth',
    canActivate: [guestGuard],
```

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds with no template/type errors.

- [ ] **Step 4: Manual verification**

Since triggering a real recovery email requires a live Supabase project, verify structurally: confirm `auth/reset-password` is declared *before* the guarded `auth` block in the routes array (so it's matched first), and confirm navigating directly to `/auth/reset-password` while already signed in does **not** redirect to `/dashboard` (proving it isn't going through `guestGuard`).

- [ ] **Step 5: Commit**

```bash
git add src/app/features/auth/reset-password/reset-password.component.ts src/app/app.routes.ts
git commit -m "feat: add reset-password page, excluded from guestGuard for recovery-link sessions"
```

---

## Phase 4 — Price history: fix the pipeline, add the chart

### Task 11: Add idempotent migration for `price_history`

**Files:**
- Create: `supabase/migrations/0001_price_history.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0001_price_history.sql`:

```sql
create table if not exists public.price_history (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  price numeric not null,
  recorded_at timestamptz not null default now()
);

create index if not exists price_history_item_id_idx on public.price_history (item_id);

alter table public.price_history enable row level security;

drop policy if exists "Users view price history for their own items" on public.price_history;

create policy "Users view price history for their own items"
  on public.price_history
  for select
  using (
    exists (
      select 1 from public.items
      where items.id = price_history.item_id
      and items.user_id = auth.uid()
    )
  );
```

- [ ] **Step 2: Manual verification**

This cannot be applied automatically without Supabase CLI/DB credentials in this environment. Verification checklist: run this SQL in the target project's Supabase SQL editor (or `supabase db push` if you have the CLI linked locally), then confirm `select * from public.price_history limit 1;` runs without error and `select * from pg_policies where tablename = 'price_history';` shows the new policy.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0001_price_history.sql
git commit -m "feat: add idempotent migration for price_history table and RLS policy"
```

---

### Task 12: Write to `price_history` on price change

**Files:**
- Modify: `supabase/functions/scrape-product/index.ts`

**Interfaces:**
- Consumes: the `existing`/`patch`/`price` variables already computed in the `itemId` branch.
- Produces: a new row in `price_history` whenever the scraped price differs from the item's previously recorded `current_price`.

- [ ] **Step 1: Insert a price_history row when the price actually changes**

Replace:

```ts
      if (price > 0) {
        patch.current_price = price
        
        // If initial price is not set, set it now
        if (!existing?.initial_price) {
          patch.initial_price = price;
        }

        // Compare price change
        const oldPrice = existing?.current_price || existing?.initial_price || price;
        const itemName = existing?.product_name || title || 'Wishlist Item';
```

with:

```ts
      if (price > 0) {
        const isNewPricePoint = existing?.current_price == null || price !== existing.current_price
        patch.current_price = price

        // If initial price is not set, set it now
        if (!existing?.initial_price) {
          patch.initial_price = price;
        }

        if (isNewPricePoint) {
          await supabase.from('price_history').insert({ item_id: itemId, price })
        }

        // Compare price change
        const oldPrice = existing?.current_price || existing?.initial_price || price;
        const itemName = existing?.product_name || title || 'Wishlist Item';
```

- [ ] **Step 2: Manual verification checklist**

Code-review checklist: confirm the insert happens before the notification block (order doesn't matter functionally, but keep it readable), confirm it only fires when `isNewPricePoint` is true (so repeated polls at the same price don't spam the history table), and confirm `patch` (the `items` table update) is unaffected by this change — it's a pure addition.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/scrape-product/index.ts
git commit -m "feat: record price_history entries when scraped price changes"
```

---

### Task 13: Add price-history chart modal and wire it into item-card

**Files:**
- Create: `src/app/features/wishlist/price-history-modal/price-history-modal.component.ts`
- Modify: `src/app/features/wishlist/item-card/item-card.component.ts`
- Modify: `src/app/features/dashboard/dashboard.component.ts`

**Interfaces:**
- Consumes: `WishlistService.getPriceHistory(itemId: string): Promise<PriceHistoryEntry[]>` (already exists, `src/app/core/services/wishlist.service.ts:236-245`).
- Produces (this task): `PriceHistoryModalComponent` with `@Input({ required: true }) itemId!: string` and `@Output() close = new EventEmitter<void>()`. `ItemCardComponent` gains `@Output() viewHistory = new EventEmitter<WishlistItem>()`.

- [ ] **Step 1: Create the chart modal component**

Create `src/app/features/wishlist/price-history-modal/price-history-modal.component.ts`:

```ts
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { WishlistService } from '../../../core/services/wishlist.service';
import { PriceHistoryEntry } from '../../../core/models/wishlist.model';

Chart.register(...registerables);

@Component({
  selector: 'app-price-history-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay" (click)="onBackdropClick($event)">
      <div class="modal-content max-w-lg" (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-display font-bold text-foreground">Price History</h2>
          <button (click)="close.emit()" class="btn-ghost btn-icon">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        @if (loading) {
          <div class="py-10 text-center text-sm text-muted-foreground">Loading...</div>
        } @else if (entries.length === 0) {
          <div class="py-10 text-center text-sm text-muted-foreground">No price history recorded yet.</div>
        }
        <canvas #canvas height="220" [style.display]="!loading && entries.length > 0 ? 'block' : 'none'"></canvas>
      </div>
    </div>
  `
})
export class PriceHistoryModalComponent implements OnInit, OnDestroy {
  @Input({ required: true }) itemId!: string;
  @Output() close = new EventEmitter<void>();
  @ViewChild('canvas') canvasRef?: ElementRef<HTMLCanvasElement>;

  loading = true;
  entries: PriceHistoryEntry[] = [];
  private chart?: Chart;

  constructor(private wishlistSvc: WishlistService) {}

  async ngOnInit() {
    this.entries = await this.wishlistSvc.getPriceHistory(this.itemId);
    this.loading = false;
    if (this.entries.length > 0) {
      setTimeout(() => this.renderChart());
    }
  }

  private renderChart(): void {
    if (!this.canvasRef) return;
    this.chart = new Chart(this.canvasRef.nativeElement, {
      type: 'line',
      data: {
        labels: this.entries.map(e => new Date(e.recorded_at).toLocaleDateString()),
        datasets: [{
          label: 'Price (₹)',
          data: this.entries.map(e => e.price),
          borderColor: '#e0620a',
          backgroundColor: 'rgba(224, 98, 10, 0.1)',
          tension: 0.3,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: false } },
      },
    });
  }

  onBackdropClick(e: Event): void {
    if (e.target === e.currentTarget) this.close.emit();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
```

- [ ] **Step 2: Add a "View Price History" action to the item-card grid-view menu**

In `src/app/features/wishlist/item-card/item-card.component.ts`, replace:

```html
                <button (click)="onEdit($event)" class="flex items-center w-full px-3 py-2 hover:bg-muted text-foreground transition-colors gap-2">
                  <svg class="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                  </svg>
                  Edit
                </button>
                <hr class="border-border my-1" />
                @if (confirmingDelete()) {
                  <div class="px-2 py-1 space-y-1">
                    <p class="text-[10px] text-muted-foreground text-center">Are you sure?</p>
                    <div class="flex gap-1">
                      <button (click)="onDelete($event)" class="flex-1 text-center py-1 text-[10px] bg-destructive text-destructive-foreground rounded font-semibold hover:bg-destructive/80 transition-colors">Yes</button>
                      <button (click)="cancelDelete($event)" class="flex-1 text-center py-1 text-[10px] bg-muted text-foreground rounded hover:bg-muted/80 transition-colors">No</button>
                    </div>
                  </div>
                } @else {
                  <button (click)="confirmDelete($event)" class="flex items-center w-full px-3 py-2 hover:bg-muted text-destructive transition-colors gap-2">
                    <svg class="w-3.5 h-3.5 text-destructive" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                    Delete
                  </button>
                }
              </div>
            }
          </div>
        </div>

        <!-- Image -->
```

with:

```html
                <button (click)="onEdit($event)" class="flex items-center w-full px-3 py-2 hover:bg-muted text-foreground transition-colors gap-2">
                  <svg class="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                  </svg>
                  Edit
                </button>
                <button (click)="onViewHistory($event)" class="flex items-center w-full px-3 py-2 hover:bg-muted text-foreground transition-colors gap-2">
                  <svg class="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 3v18h18M7 15l4-4 4 4 5-6"/>
                  </svg>
                  Price History
                </button>
                <hr class="border-border my-1" />
                @if (confirmingDelete()) {
                  <div class="px-2 py-1 space-y-1">
                    <p class="text-[10px] text-muted-foreground text-center">Are you sure?</p>
                    <div class="flex gap-1">
                      <button (click)="onDelete($event)" class="flex-1 text-center py-1 text-[10px] bg-destructive text-destructive-foreground rounded font-semibold hover:bg-destructive/80 transition-colors">Yes</button>
                      <button (click)="cancelDelete($event)" class="flex-1 text-center py-1 text-[10px] bg-muted text-foreground rounded hover:bg-muted/80 transition-colors">No</button>
                    </div>
                  </div>
                } @else {
                  <button (click)="confirmDelete($event)" class="flex items-center w-full px-3 py-2 hover:bg-muted text-destructive transition-colors gap-2">
                    <svg class="w-3.5 h-3.5 text-destructive" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                    Delete
                  </button>
                }
              </div>
            }
          </div>
        </div>

        <!-- Image -->
```

Note: the identical "Edit"/"Delete" block also appears in the list-view actions menu further down the same file — repeat this same insertion (the "Price History" button) there too, immediately after that second "Edit" button and before its "Delete" section, so both grid and list views expose the action.

- [ ] **Step 3: Add the `viewHistory` output and handler to the component class**

Replace:

```ts
  @Input({ required: true }) item!: WishlistItem;
  @Input() viewMode: 'grid' | 'list' = 'grid';
  @Output() edit = new EventEmitter<WishlistItem>();
  @Output() deleted = new EventEmitter<string>();
```

with:

```ts
  @Input({ required: true }) item!: WishlistItem;
  @Input() viewMode: 'grid' | 'list' = 'grid';
  @Output() edit = new EventEmitter<WishlistItem>();
  @Output() deleted = new EventEmitter<string>();
  @Output() viewHistory = new EventEmitter<WishlistItem>();
```

Replace:

```ts
  onEdit(e: MouseEvent) {
    e.stopPropagation();
    this.edit.emit(this.item);
    this.showActionsMenu.set(false);
  }
```

with:

```ts
  onEdit(e: MouseEvent) {
    e.stopPropagation();
    this.edit.emit(this.item);
    this.showActionsMenu.set(false);
  }

  onViewHistory(e: MouseEvent) {
    e.stopPropagation();
    this.viewHistory.emit(this.item);
    this.showActionsMenu.set(false);
  }
```

- [ ] **Step 4: Wire the modal into the dashboard**

In `src/app/features/dashboard/dashboard.component.ts`, add the import:

Replace:

```ts
import { ItemCardComponent } from '../wishlist/item-card/item-card.component';
import { AddItemModalComponent } from '../wishlist/add-item-modal/add-item-modal.component';
```

with:

```ts
import { ItemCardComponent } from '../wishlist/item-card/item-card.component';
import { AddItemModalComponent } from '../wishlist/add-item-modal/add-item-modal.component';
import { PriceHistoryModalComponent } from '../wishlist/price-history-modal/price-history-modal.component';
```

Replace:

```ts
  imports: [
    CommonModule,
    FormsModule,
    ItemCardComponent,
    AddItemModalComponent,
  ],
```

with:

```ts
  imports: [
    CommonModule,
    FormsModule,
    ItemCardComponent,
    AddItemModalComponent,
    PriceHistoryModalComponent,
  ],
```

Replace the `<app-item-card ... />` element:

```html
                <app-item-card
                  [item]="item"
                  [viewMode]="viewMode()"
                  (edit)="onEditItem($event)"
                  (deleted)="onDeleted($event)"
                />
```

with:

```html
                <app-item-card
                  [item]="item"
                  [viewMode]="viewMode()"
                  (edit)="onEditItem($event)"
                  (deleted)="onDeleted($event)"
                  (viewHistory)="onViewHistory($event)"
                />
```

Replace the `<!-- Add/Edit Modal -->` block:

```html
      <!-- Add/Edit Modal -->
      @if (showAddModal()) {
        <app-add-item-modal
          [editItem]="editingItem()"
          (close)="closeModal()"
          (saved)="wishlistSvc.loadItems()"
        />
      }
```

with:

```html
      <!-- Add/Edit Modal -->
      @if (showAddModal()) {
        <app-add-item-modal
          [editItem]="editingItem()"
          (close)="closeModal()"
          (saved)="wishlistSvc.loadItems()"
        />
      }

      <!-- Price History Modal -->
      @if (historyItemId()) {
        <app-price-history-modal
          [itemId]="historyItemId()!"
          (close)="historyItemId.set(null)"
        />
      }
```

Replace the component class field declarations:

```ts
  showAddModal = signal(false);
  editingItem = signal<WishlistItem | null>(null);
```

with:

```ts
  showAddModal = signal(false);
  editingItem = signal<WishlistItem | null>(null);
  historyItemId = signal<string | null>(null);
```

Replace:

```ts
  onEditItem(item: WishlistItem) {
    this.editingItem.set(item);
    this.showAddModal.set(true);
  }
```

with:

```ts
  onEditItem(item: WishlistItem) {
    this.editingItem.set(item);
    this.showAddModal.set(true);
  }

  onViewHistory(item: WishlistItem) {
    this.historyItemId.set(item.id);
  }
```

- [ ] **Step 5: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds with no template/type errors.

- [ ] **Step 6: Manual verification**

Run `npm start`, open an item's actions menu (grid and list view), click "Price History". For an item with no recorded history, confirm the "No price history recorded yet" message appears. After Task 12 has been running for a while and an item has at least one `price_history` row, confirm the line chart renders.

- [ ] **Step 7: Commit**

```bash
git add src/app/features/wishlist/price-history-modal/price-history-modal.component.ts src/app/features/wishlist/item-card/item-card.component.ts src/app/features/dashboard/dashboard.component.ts
git commit -m "feat: add price history chart modal, wire into item-card actions menu"
```

---

## Phase 5 — Tag-based filtering

### Task 14: Add active-tag filtering to WishlistService

**Files:**
- Modify: `src/app/core/services/wishlist.service.ts`

**Interfaces:**
- Produces: `activeTag: Signal<string | null>` (readonly), `toggleTag(tag: string): void`. `filteredItems` now also filters by `activeTag()` when set.

- [ ] **Step 1: Add the signal**

Replace:

```ts
  private _items = signal<WishlistItem[]>([]);
  private _loading = signal(false);
  private _sortBy = signal<SortBy>('newest');
  private _filterBy = signal<FilterBy>('all');
  private _searchQuery = signal('');

  items = this._items.asReadonly();
  loading = this._loading.asReadonly();
  sortBy = this._sortBy.asReadonly();
  filterBy = this._filterBy.asReadonly();
  searchQuery = this._searchQuery.asReadonly();
```

with:

```ts
  private _items = signal<WishlistItem[]>([]);
  private _loading = signal(false);
  private _sortBy = signal<SortBy>('newest');
  private _filterBy = signal<FilterBy>('all');
  private _searchQuery = signal('');
  private _activeTag = signal<string | null>(null);

  items = this._items.asReadonly();
  loading = this._loading.asReadonly();
  sortBy = this._sortBy.asReadonly();
  filterBy = this._filterBy.asReadonly();
  searchQuery = this._searchQuery.asReadonly();
  activeTag = this._activeTag.asReadonly();
```

- [ ] **Step 2: Apply the tag filter inside `filteredItems`**

Replace:

```ts
    // Category filter
    switch (this._filterBy()) {
```

with:

```ts
    // Active tag filter
    const activeTag = this._activeTag();
    if (activeTag) {
      items = items.filter(i => i.tags?.some(t => t.toLowerCase() === activeTag.toLowerCase()));
    }

    // Category filter
    switch (this._filterBy()) {
```

- [ ] **Step 3: Add the toggle method**

Replace:

```ts
  setSearchQuery(query: string): void {
    this._searchQuery.set(query);
  }
```

with:

```ts
  setSearchQuery(query: string): void {
    this._searchQuery.set(query);
  }

  toggleTag(tag: string): void {
    this._activeTag.update(current => current === tag ? null : tag);
  }
```

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 5: Manual verification**

This is pure signal/computed logic with no DOM dependency — verify by temporarily adding a `console.log` in a browser dev session: call `wishlistSvc.toggleTag('electronics')` from the console, confirm `filteredItems()` narrows to items tagged `electronics`; call it again with the same tag, confirm it returns to the unfiltered set. Remove the temporary log before committing.

- [ ] **Step 6: Commit**

```bash
git add src/app/core/services/wishlist.service.ts
git commit -m "feat: add active-tag filtering to WishlistService"
```

---

### Task 15: Make tag chips clickable, show active-tag chip on dashboard

**Files:**
- Modify: `src/app/features/wishlist/item-card/item-card.component.ts`
- Modify: `src/app/features/dashboard/dashboard.component.ts`

**Interfaces:**
- Consumes: `WishlistService.toggleTag(tag: string)`, `WishlistService.activeTag` (from Task 14).
- Produces: `ItemCardComponent` gains `@Output() tagClick = new EventEmitter<string>()`.

- [ ] **Step 1: Emit `tagClick` from the grid-view tag chips**

Replace:

```html
          <!-- Tags -->
          @if (item.tags?.length) {
            <div class="flex gap-1.5 flex-wrap my-3">
              @for (tag of item.tags; track tag) {
                <span class="text-primary text-[10px] font-medium bg-primary/5 px-2 py-0.5 rounded-full hover:bg-primary/10 cursor-pointer">
                  #{{ tag }}
                </span>
              }
            </div>
          }
```

with:

```html
          <!-- Tags -->
          @if (item.tags?.length) {
            <div class="flex gap-1.5 flex-wrap my-3">
              @for (tag of item.tags; track tag) {
                <span (click)="onTagClick($event, tag)" class="text-primary text-[10px] font-medium bg-primary/5 px-2 py-0.5 rounded-full hover:bg-primary/10 cursor-pointer">
                  #{{ tag }}
                </span>
              }
            </div>
          }
```

- [ ] **Step 2: Emit `tagClick` from the list-view tag chips**

Replace:

```html
          <!-- Tags list -->
          @if (item.tags?.length) {
            <div class="flex gap-1 flex-wrap mt-1">
              @for (tag of item.tags; track tag) {
                <span class="text-primary text-[9px] font-medium bg-primary/5 px-1.5 py-0.2 rounded-full">
                  #{{ tag }}
                </span>
              }
            </div>
          }
```

with:

```html
          <!-- Tags list -->
          @if (item.tags?.length) {
            <div class="flex gap-1 flex-wrap mt-1">
              @for (tag of item.tags; track tag) {
                <span (click)="onTagClick($event, tag)" class="text-primary text-[9px] font-medium bg-primary/5 px-1.5 py-0.2 rounded-full cursor-pointer hover:bg-primary/10">
                  #{{ tag }}
                </span>
              }
            </div>
          }
```

- [ ] **Step 3: Add the output and handler to the component class**

Replace:

```ts
  @Output() edit = new EventEmitter<WishlistItem>();
  @Output() deleted = new EventEmitter<string>();
  @Output() viewHistory = new EventEmitter<WishlistItem>();
```

with:

```ts
  @Output() edit = new EventEmitter<WishlistItem>();
  @Output() deleted = new EventEmitter<string>();
  @Output() viewHistory = new EventEmitter<WishlistItem>();
  @Output() tagClick = new EventEmitter<string>();
```

Replace:

```ts
  onViewHistory(e: MouseEvent) {
    e.stopPropagation();
    this.viewHistory.emit(this.item);
    this.showActionsMenu.set(false);
  }
```

with:

```ts
  onViewHistory(e: MouseEvent) {
    e.stopPropagation();
    this.viewHistory.emit(this.item);
    this.showActionsMenu.set(false);
  }

  onTagClick(e: MouseEvent, tag: string) {
    e.stopPropagation();
    this.tagClick.emit(tag);
  }
```

- [ ] **Step 4: Wire the event and show an active-tag chip on the dashboard**

In `src/app/features/dashboard/dashboard.component.ts`, replace the `<app-item-card ... />` element:

```html
                <app-item-card
                  [item]="item"
                  [viewMode]="viewMode()"
                  (edit)="onEditItem($event)"
                  (deleted)="onDeleted($event)"
                  (viewHistory)="onViewHistory($event)"
                />
```

with:

```html
                <app-item-card
                  [item]="item"
                  [viewMode]="viewMode()"
                  (edit)="onEditItem($event)"
                  (deleted)="onDeleted($event)"
                  (viewHistory)="onViewHistory($event)"
                  (tagClick)="onTagClick($event)"
                />
```

Replace the search bar's wrapping div to add an active-tag chip beside it:

```html
          <div class="flex-1 relative max-w-sm">
```

with:

```html
          @if (activeTag()) {
            <button
              (click)="wishlistSvc.toggleTag(activeTag()!)"
              class="inline-flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary border border-primary/20 rounded-lg px-3 py-1.5 shrink-0"
            >
              #{{ activeTag() }}
              <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          }
          <div class="flex-1 relative max-w-sm">
```

Add the `activeTag` accessor and `onTagClick` handler to the component class — replace:

```ts
  get filterBy() {
    return this.wishlistSvc.filterBy;
  }
```

with:

```ts
  get filterBy() {
    return this.wishlistSvc.filterBy;
  }
  get activeTag() {
    return this.wishlistSvc.activeTag;
  }
```

Replace:

```ts
  onEditItem(item: WishlistItem) {
    this.editingItem.set(item);
    this.showAddModal.set(true);
  }

  onViewHistory(item: WishlistItem) {
    this.historyItemId.set(item.id);
  }
```

with:

```ts
  onEditItem(item: WishlistItem) {
    this.editingItem.set(item);
    this.showAddModal.set(true);
  }

  onViewHistory(item: WishlistItem) {
    this.historyItemId.set(item.id);
  }

  onTagClick(tag: string) {
    this.wishlistSvc.toggleTag(tag);
  }
```

- [ ] **Step 5: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds with no template/type errors.

- [ ] **Step 6: Manual verification**

Run `npm start`, click a tag chip on any item card, confirm the list narrows to items sharing that tag and an active-tag chip appears next to the search bar; click that chip's × to clear it, confirm the full list returns; click the same tag chip on an item twice in a row, confirm the second click clears the filter.

- [ ] **Step 7: Commit**

```bash
git add src/app/features/wishlist/item-card/item-card.component.ts src/app/features/dashboard/dashboard.component.ts
git commit -m "feat: make tag chips clickable to filter the wishlist by tag"
```

---

## Phase 6 — Wishlist sharing (per-item + whole-list)

### Task 16: Add sharing schema migration and model field

**Files:**
- Create: `supabase/migrations/0002_wishlist_sharing.sql`
- Modify: `src/app/core/models/wishlist.model.ts`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0002_wishlist_sharing.sql`:

```sql
alter table public.items
  add column if not exists share_token text unique;

create table if not exists public.wishlist_shares (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token text unique not null,
  created_at timestamptz not null default now()
);

alter table public.wishlist_shares enable row level security;

drop policy if exists "Users manage their own share link" on public.wishlist_shares;

create policy "Users manage their own share link"
  on public.wishlist_shares
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

No public/anonymous `select` policy is added on purpose — reads for shared links go through the `get-shared` edge function (Task 18) using the service-role key, not through client-side RLS, so an unguessable token is the only thing that gates access rather than a permissive RLS rule that would expose every shared row to anyone querying the REST API directly.

- [ ] **Step 2: Add `share_token` to the `WishlistItem` model**

In `src/app/core/models/wishlist.model.ts`, replace:

```ts
  is_purchased?: boolean;
  purchased_at?: string | null;
  notes?: string | null;
}
```

with:

```ts
  is_purchased?: boolean;
  purchased_at?: string | null;
  notes?: string | null;
  share_token?: string | null;
}
```

- [ ] **Step 3: Manual verification**

Same caveat as Task 11 — apply via the Supabase SQL editor or `supabase db push` against the real project, then confirm `select share_token from public.items limit 1;` and `select * from public.wishlist_shares limit 1;` both run without error, and `select * from pg_policies where tablename = 'wishlist_shares';` shows exactly the one owner-only policy (no public select policy).

- [ ] **Step 4: Verify the Angular build compiles**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0002_wishlist_sharing.sql src/app/core/models/wishlist.model.ts
git commit -m "feat: add share_token column and wishlist_shares table for wishlist sharing"
```

---

### Task 17: Create ShareService

**Files:**
- Create: `src/app/core/services/share.service.ts`

**Interfaces:**
- Consumes: `SupabaseService.client`, `SupabaseService.currentUser` (existing).
- Produces: `ShareService` with `getItemShareToken(item)`, `regenerateItemShareToken(itemId)`, `getWishlistShareToken()`, `regenerateWishlistShareToken()`, `fetchSharedItem(token)`, `fetchSharedWishlist(token)` — the last two call the `get-shared` edge function from Task 18 and are consumed by Tasks 20/21.

- [ ] **Step 1: Create the service**

Create `src/app/core/services/share.service.ts`:

```ts
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { environment } from '../../../environments/environment';
import { WishlistItem } from '../models/wishlist.model';

export type SharedItem = Pick<WishlistItem,
  'id' | 'product_name' | 'description' | 'image_url' | 'product_url' |
  'target_price' | 'current_price' | 'initial_price' | 'target_purchase_date' |
  'tags' | 'priority' | 'notes' | 'is_purchased' | 'created_at'
>;

@Injectable({ providedIn: 'root' })
export class ShareService {
  constructor(private sb: SupabaseService) {}

  async getItemShareToken(item: WishlistItem): Promise<{ token: string | null; error: any }> {
    if (item.share_token) return { token: item.share_token, error: null };
    return this.regenerateItemShareToken(item.id);
  }

  async regenerateItemShareToken(itemId: string): Promise<{ token: string | null; error: any }> {
    const token = crypto.randomUUID();
    const { error } = await this.sb.client.from('items').update({ share_token: token }).eq('id', itemId);
    if (error) return { token: null, error };
    return { token, error: null };
  }

  async getWishlistShareToken(): Promise<{ token: string | null; error: any }> {
    const user = this.sb.currentUser;
    if (!user) return { token: null, error: new Error('Not authenticated') };

    const { data: existing } = await this.sb.client
      .from('wishlist_shares')
      .select('token')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing?.token) return { token: existing.token, error: null };
    return this.regenerateWishlistShareToken();
  }

  async regenerateWishlistShareToken(): Promise<{ token: string | null; error: any }> {
    const user = this.sb.currentUser;
    if (!user) return { token: null, error: new Error('Not authenticated') };

    const token = crypto.randomUUID();
    const { error } = await this.sb.client
      .from('wishlist_shares')
      .upsert({ user_id: user.id, token });
    if (error) return { token: null, error };
    return { token, error: null };
  }

  async fetchSharedItem(token: string): Promise<SharedItem | null> {
    try {
      const res = await fetch(`${environment.supabaseUrl}/functions/v1/get-shared`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': environment.supabaseKey },
        body: JSON.stringify({ token, type: 'item' }),
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.item ?? null;
    } catch {
      return null;
    }
  }

  async fetchSharedWishlist(token: string): Promise<SharedItem[]> {
    try {
      const res = await fetch(`${environment.supabaseUrl}/functions/v1/get-shared`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': environment.supabaseKey },
        body: JSON.stringify({ token, type: 'wishlist' }),
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.items ?? [];
    } catch {
      return [];
    }
  }
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 3: Manual verification**

`getItemShareToken`/`getWishlistShareToken`/regenerate methods depend on the migration from Task 16 being applied to a real Supabase project — defer full verification to Task 19, where they're wired into the UI. For now, confirm the file compiles and the `SharedItem` type only includes the fields listed in the "everything you see" product decision (no field-stripping needed since it's a `Pick`, not an omit — double check it doesn't accidentally include `user_id`).

- [ ] **Step 4: Commit**

```bash
git add src/app/core/services/share.service.ts
git commit -m "feat: add ShareService for generating and fetching wishlist share links"
```

---

### Task 18: Create the `get-shared` edge function

**Files:**
- Create: `supabase/functions/get-shared/index.ts`

**Interfaces:**
- Consumes (HTTP): `POST { token: string, type: 'item' | 'wishlist' }`.
- Produces (HTTP): `{ item: SharedItem }` for `type: 'item'`, `{ items: SharedItem[] }` for `type: 'wishlist'`, or `{ error: string }` with a `400`/`404` status.

- [ ] **Step 1: Create the function**

Create `supabase/functions/get-shared/index.ts`:

```ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SHARED_ITEM_FIELDS =
  'id, product_name, description, image_url, product_url, target_price, current_price, initial_price, target_purchase_date, tags, priority, notes, is_purchased, created_at'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { token, type } = await req.json()
    if (!token || (type !== 'item' && type !== 'wishlist')) {
      throw new Error('token and a valid type ("item" or "wishlist") are required')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    if (type === 'item') {
      const { data, error } = await supabase
        .from('items')
        .select(SHARED_ITEM_FIELDS)
        .eq('share_token', token)
        .single()

      if (error || !data) {
        return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: corsHeaders })
      }
      return new Response(
        JSON.stringify({ item: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: share, error: shareError } = await supabase
      .from('wishlist_shares')
      .select('user_id')
      .eq('token', token)
      .single()

    if (shareError || !share) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: corsHeaders })
    }

    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select(SHARED_ITEM_FIELDS)
      .eq('user_id', share.user_id)
      .order('created_at', { ascending: false })

    if (itemsError) throw itemsError

    return new Response(
      JSON.stringify({ items: items ?? [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: corsHeaders })
  }
})
```

- [ ] **Step 2: Manual verification checklist (no local Deno/Supabase CLI available)**

Code-review checklist: confirm both branches select only the `SHARED_ITEM_FIELDS` list (no `user_id`, no `share_token` itself, so the token can't be re-harvested from the response), confirm the `wishlist` branch's `items` query filters by `share.user_id` (not by anything client-supplied), and confirm there's no code path that returns data without first matching an exact `token`. If you have access to a deployed instance:
```bash
curl -X POST https://<project>.supabase.co/functions/v1/get-shared \
  -H "Content-Type: application/json" \
  -H "apikey: <anon key>" \
  -d '{"token":"<a real item share_token>","type":"item"}'
```
Expected: `200` with `{"item": {...}}`. With a made-up token, expected: `404 {"error":"Not found"}`.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/get-shared/index.ts
git commit -m "feat: add get-shared edge function for public read-only wishlist/item views"
```

---

### Task 19: Add Share / Regenerate actions to item-card and dashboard

**Files:**
- Modify: `src/app/features/wishlist/item-card/item-card.component.ts`
- Modify: `src/app/features/dashboard/dashboard.component.ts`

**Interfaces:**
- Consumes: `ShareService.getItemShareToken`, `ShareService.regenerateItemShareToken`, `ShareService.getWishlistShareToken`, `ShareService.regenerateWishlistShareToken` (Task 17).

- [ ] **Step 1: Add a "Share" action to the item-card grid-view menu**

Replace:

```html
                <button (click)="onViewHistory($event)" class="flex items-center w-full px-3 py-2 hover:bg-muted text-foreground transition-colors gap-2">
                  <svg class="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 3v18h18M7 15l4-4 4 4 5-6"/>
                  </svg>
                  Price History
                </button>
                <hr class="border-border my-1" />
                @if (confirmingDelete()) {
```

with:

```html
                <button (click)="onViewHistory($event)" class="flex items-center w-full px-3 py-2 hover:bg-muted text-foreground transition-colors gap-2">
                  <svg class="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 3v18h18M7 15l4-4 4 4 5-6"/>
                  </svg>
                  Price History
                </button>
                <button (click)="onShare($event)" [disabled]="sharing()" class="flex items-center w-full px-3 py-2 hover:bg-muted text-foreground transition-colors gap-2">
                  <svg class="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342a3 3 0 100 2.684m9.632-9.026a3 3 0 10-2.684-2.684m0 12.026a3 3 0 102.684-2.684M6.316 10.658L15.684 5.658M6.316 13.342l9.368 5"/>
                  </svg>
                  {{ sharing() ? 'Copying link...' : 'Share' }}
                </button>
                <hr class="border-border my-1" />
                @if (confirmingDelete()) {
```

(Apply the same insertion in the list-view actions menu, immediately after its own "Price History" button from Task 13.)

- [ ] **Step 2: Add the `sharing` signal and `onShare` handler**

Replace:

```ts
  constructor(private wishlistSvc: WishlistService, private toast: ToastService) {}
```

with:

```ts
  sharing = signal(false);

  constructor(
    private wishlistSvc: WishlistService,
    private toast: ToastService,
    private shareSvc: ShareService,
  ) {}
```

Replace:

```ts
  onTagClick(e: MouseEvent, tag: string) {
    e.stopPropagation();
    this.tagClick.emit(tag);
  }
```

with:

```ts
  onTagClick(e: MouseEvent, tag: string) {
    e.stopPropagation();
    this.tagClick.emit(tag);
  }

  async onShare(e: MouseEvent) {
    e.stopPropagation();
    this.sharing.set(true);
    const { token, error } = await this.shareSvc.getItemShareToken(this.item);
    this.sharing.set(false);
    this.showActionsMenu.set(false);
    if (error || !token) {
      this.toast.error('Could not create share link');
      return;
    }
    const url = `${window.location.origin}/shared/item/${token}`;
    await navigator.clipboard.writeText(url);
    this.toast.success('Share link copied to clipboard!');
  }
```

Add the import at the top of the file — replace:

```ts
import { WishlistService } from '../../../core/services/wishlist.service';
import { ToastService } from '../../../core/services/toast.service';
```

with:

```ts
import { WishlistService } from '../../../core/services/wishlist.service';
import { ToastService } from '../../../core/services/toast.service';
import { ShareService } from '../../../core/services/share.service';
```

- [ ] **Step 3: Add a "Share my Wishlist" action to the dashboard sidebar**

Replace:

```html
          <button
            (click)="showAddModal.set(true)"
            class="flex items-center gap-4 p-3 w-full rounded-lg hover:bg-muted/50 transition-colors mt-8 text-primary"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span class="hidden lg:block text-base font-bold">Add Item</span>
          </button>
        </nav>
```

with:

```html
          <button
            (click)="showAddModal.set(true)"
            class="flex items-center gap-4 p-3 w-full rounded-lg hover:bg-muted/50 transition-colors mt-8 text-primary"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span class="hidden lg:block text-base font-bold">Add Item</span>
          </button>

          <button
            (click)="onShareWishlist()"
            [disabled]="sharingWishlist()"
            class="flex items-center gap-4 p-3 w-full rounded-lg hover:bg-muted/50 transition-colors"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8.684 13.342a3 3 0 100 2.684m9.632-9.026a3 3 0 10-2.684-2.684m0 12.026a3 3 0 102.684-2.684M6.316 10.658L15.684 5.658M6.316 13.342l9.368 5"
              />
            </svg>
            <span class="hidden lg:block text-base">{{ sharingWishlist() ? 'Copying...' : 'Share Wishlist' }}</span>
          </button>
        </nav>
```

Add the import — replace:

```ts
import { ItemCardComponent } from '../wishlist/item-card/item-card.component';
import { AddItemModalComponent } from '../wishlist/add-item-modal/add-item-modal.component';
import { PriceHistoryModalComponent } from '../wishlist/price-history-modal/price-history-modal.component';
```

with:

```ts
import { ItemCardComponent } from '../wishlist/item-card/item-card.component';
import { AddItemModalComponent } from '../wishlist/add-item-modal/add-item-modal.component';
import { PriceHistoryModalComponent } from '../wishlist/price-history-modal/price-history-modal.component';
import { ShareService } from '../../core/services/share.service';
```

Add the signal, constructor param, and handler — replace:

```ts
  historyItemId = signal<string | null>(null);
```

with:

```ts
  historyItemId = signal<string | null>(null);
  sharingWishlist = signal(false);
```

Replace:

```ts
  constructor(
    public wishlistSvc: WishlistService,
    public toastSvc: ToastService,
    private sb: SupabaseService,
    private router: Router,
    private cookieSvc: CookieService,
  ) {}
```

with:

```ts
  constructor(
    public wishlistSvc: WishlistService,
    public toastSvc: ToastService,
    private sb: SupabaseService,
    private router: Router,
    private cookieSvc: CookieService,
    private shareSvc: ShareService,
  ) {}
```

Replace:

```ts
  onTagClick(tag: string) {
    this.wishlistSvc.toggleTag(tag);
  }
```

with:

```ts
  onTagClick(tag: string) {
    this.wishlistSvc.toggleTag(tag);
  }

  async onShareWishlist() {
    this.sharingWishlist.set(true);
    const { token, error } = await this.shareSvc.getWishlistShareToken();
    this.sharingWishlist.set(false);
    if (error || !token) {
      this.toastSvc.error('Could not create share link');
      return;
    }
    const url = `${window.location.origin}/shared/list/${token}`;
    await navigator.clipboard.writeText(url);
    this.toastSvc.success('Wishlist share link copied to clipboard!');
  }
```

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds with no template/type errors.

- [ ] **Step 5: Manual verification**

This requires the Task 16 migration applied to a real Supabase project. With it applied: click "Share" on an item, confirm a toast confirms the link was copied and pasting it shows a UUID-shaped URL under `/shared/item/`; click "Share" again on the same item, confirm the same URL is produced (token reused, not regenerated). Click "Share Wishlist" in the sidebar, confirm a `/shared/list/<token>` URL is copied.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/wishlist/item-card/item-card.component.ts src/app/features/dashboard/dashboard.component.ts
git commit -m "feat: add share-link actions for individual items and the whole wishlist"
```

---

### Task 20: Create SharedItemComponent + route

**Files:**
- Create: `src/app/features/wishlist/shared-item/shared-item.component.ts`
- Modify: `src/app/app.routes.ts`

**Interfaces:**
- Consumes: `ShareService.fetchSharedItem(token: string)` (Task 17), `ActivatedRoute` for the `:token` param.

- [ ] **Step 1: Create the component**

Create `src/app/features/wishlist/shared-item/shared-item.component.ts`:

```ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ShareService, SharedItem } from '../../../core/services/share.service';

@Component({
  selector: 'app-shared-item',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-background flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        @if (loading()) {
          <div class="text-center text-muted-foreground">Loading...</div>
        } @else if (!item()) {
          <div class="text-center text-muted-foreground">This link is invalid or has expired.</div>
        } @else {
          <div class="card p-6">
            @if (item()!.image_url) {
              <img [src]="item()!.image_url" [alt]="item()!.product_name" class="w-full aspect-square object-contain bg-muted/30 rounded-lg mb-4" />
            }
            <h1 class="text-xl font-display font-bold text-foreground">{{ item()!.product_name || 'Unnamed Product' }}</h1>
            @if (item()!.description) {
              <p class="text-sm text-muted-foreground mt-2">{{ item()!.description }}</p>
            }
            <div class="mt-4 flex items-baseline gap-3">
              @if (item()!.current_price !== null) {
                <span class="text-2xl font-bold text-foreground">₹{{ item()!.current_price | number:'1.0-0' }}</span>
              }
              @if (item()!.target_price) {
                <span class="text-sm text-muted-foreground">Target: ₹{{ item()!.target_price | number:'1.0-0' }}</span>
              }
            </div>
            @if (item()!.notes) {
              <p class="text-sm text-muted-foreground italic mt-3">"{{ item()!.notes }}"</p>
            }
            @if (item()!.is_purchased) {
              <div class="mt-3 badge-muted">Already purchased</div>
            }
            <a [href]="item()!.product_url" target="_blank" rel="noopener noreferrer" class="btn-primary btn-md w-full mt-6">
              View Product
            </a>
          </div>
        }
      </div>
    </div>
  `
})
export class SharedItemComponent implements OnInit {
  loading = signal(true);
  item = signal<SharedItem | null>(null);

  constructor(private route: ActivatedRoute, private shareSvc: ShareService) {}

  async ngOnInit() {
    const token = this.route.snapshot.paramMap.get('token');
    if (token) {
      this.item.set(await this.shareSvc.fetchSharedItem(token));
    }
    this.loading.set(false);
  }
}
```

- [ ] **Step 2: Register the public route**

In `src/app/app.routes.ts`, replace:

```ts
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  { path: '**', redirectTo: '/auth/login' }
```

with:

```ts
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'shared/item/:token',
    loadComponent: () => import('./features/wishlist/shared-item/shared-item.component').then(m => m.SharedItemComponent)
  },
  { path: '**', redirectTo: '/auth/login' }
```

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds with no template/type errors.

- [ ] **Step 4: Manual verification**

Requires Tasks 16 and 18 deployed against a real Supabase project. With a real item share link (from Task 19), open it in an incognito window (no session) and confirm the product renders without requiring sign-in. Open a made-up token URL and confirm the "invalid or expired" message shows instead of an error page.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/wishlist/shared-item/shared-item.component.ts src/app/app.routes.ts
git commit -m "feat: add public shared-item view"
```

---

### Task 21: Create SharedWishlistComponent + route

**Files:**
- Create: `src/app/features/wishlist/shared-wishlist/shared-wishlist.component.ts`
- Modify: `src/app/app.routes.ts`

**Interfaces:**
- Consumes: `ShareService.fetchSharedWishlist(token: string)` (Task 17).

- [ ] **Step 1: Create the component**

Create `src/app/features/wishlist/shared-wishlist/shared-wishlist.component.ts`:

```ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ShareService, SharedItem } from '../../../core/services/share.service';

@Component({
  selector: 'app-shared-wishlist',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-background p-4 sm:p-8">
      <div class="max-w-5xl mx-auto">
        <h1 class="text-2xl font-display font-bold text-foreground mb-6">Shared Wishlist</h1>

        @if (loading()) {
          <div class="text-center text-muted-foreground py-16">Loading...</div>
        } @else if (items().length === 0) {
          <div class="text-center text-muted-foreground py-16">This link is invalid, expired, or the wishlist is empty.</div>
        } @else {
          <div class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            @for (item of items(); track item.id) {
              <div class="card p-3 flex flex-col">
                @if (item.image_url) {
                  <img [src]="item.image_url" [alt]="item.product_name" class="w-full aspect-square object-contain bg-muted/30 rounded-lg mb-3" />
                }
                <h3 class="font-semibold text-sm text-foreground truncate">{{ item.product_name || 'Unnamed Product' }}</h3>
                @if (item.current_price !== null) {
                  <span class="font-bold text-foreground mt-1">₹{{ item.current_price | number:'1.0-0' }}</span>
                }
                @if (item.is_purchased) {
                  <div class="badge-muted mt-2 self-start">Already purchased</div>
                }
                <a [href]="item.product_url" target="_blank" rel="noopener noreferrer" class="btn-secondary btn-sm w-full mt-3">
                  View Product
                </a>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class SharedWishlistComponent implements OnInit {
  loading = signal(true);
  items = signal<SharedItem[]>([]);

  constructor(private route: ActivatedRoute, private shareSvc: ShareService) {}

  async ngOnInit() {
    const token = this.route.snapshot.paramMap.get('token');
    if (token) {
      this.items.set(await this.shareSvc.fetchSharedWishlist(token));
    }
    this.loading.set(false);
  }
}
```

- [ ] **Step 2: Register the public route**

In `src/app/app.routes.ts`, replace:

```ts
  {
    path: 'shared/item/:token',
    loadComponent: () => import('./features/wishlist/shared-item/shared-item.component').then(m => m.SharedItemComponent)
  },
  { path: '**', redirectTo: '/auth/login' }
```

with:

```ts
  {
    path: 'shared/item/:token',
    loadComponent: () => import('./features/wishlist/shared-item/shared-item.component').then(m => m.SharedItemComponent)
  },
  {
    path: 'shared/list/:token',
    loadComponent: () => import('./features/wishlist/shared-wishlist/shared-wishlist.component').then(m => m.SharedWishlistComponent)
  },
  { path: '**', redirectTo: '/auth/login' }
```

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds with no template/type errors.

- [ ] **Step 4: Manual verification**

Requires Tasks 16 and 18 deployed. Open a real whole-list share link (from Task 19's "Share Wishlist" button) in an incognito window and confirm all of that user's items render in a grid without requiring sign-in. Open a made-up token and confirm the empty/invalid state shows.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/wishlist/shared-wishlist/shared-wishlist.component.ts src/app/app.routes.ts
git commit -m "feat: add public shared-wishlist view"
```

---

## Plan self-review notes

- **Spec coverage:** all 6 spec sections map 1:1 to the 6 phases above (Tasks 1–6 / 7–8 / 9–10 / 11–13 / 14–15 / 16–21).
- **Deployment caveat surfaced repeatedly on purpose:** neither the Deno nor Supabase CLI is available in this environment, so edge-function and migration tasks cannot be fully executed end-to-end here — each says so explicitly rather than claiming a false pass. Whoever has access to the live Supabase project needs to apply the two migrations and deploy `scrape-product` (updated) and `get-shared` (new) for Phases 2, 4, and 6 to work against real data.
- **Type/name consistency check:** `ShareService.SharedItem` (Task 17) matches the field list selected by `get-shared` (Task 18) and matches the fields rendered by `SharedItemComponent`/`SharedWishlistComponent` (Tasks 20/21). `ItemCardComponent`'s `@Output()`s accumulate correctly across Tasks 13/15/19 (`viewHistory`, `tagClick`, and the `onShare` method) with no renamed signals between tasks.
