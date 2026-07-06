# Card Grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user drag one item card onto another to group them (e.g. "Outfit 1"), rendered as a single collapsed tile that expands in place to show its members.

**Architecture:** New `item_groups` table + `items.group_id` column. `WishlistService` gains a `tiles` computed signal that collapses filtered items into either standalone-item tiles or group tiles. A new `GroupTileComponent` renders the collapsed/expanded states, reusing the existing `ItemCardComponent` for members when expanded. Desktop-only native HTML5 drag-and-drop (`draggable`, `dragover`, `drop`) creates/extends groups.

**Tech Stack:** Angular 17 standalone components + signals, Supabase Postgres/RLS, native HTML5 Drag and Drop API (no library).

## Global Constraints

- Follow the existing standalone-component + signal pattern (`signal()`, `.asReadonly()`, `computed()`) — no NgModules, no new state library.
- Grouping is purely organizational: a grouped item keeps all its own fields and still counts individually in stats/search/tag-filtering.
- **Mobile/touch grouping (long-press to multi-select) is explicitly OUT OF SCOPE for this plan** — this plan ships desktop drag-and-drop only. Do not attempt to add touch handling; it's a separate follow-up.
- SQL migrations must be idempotent (`create table if not exists`, `add column if not exists`, `drop policy if exists` before `create policy`).
- Neither Deno nor Supabase CLI is available in this environment — migration tasks are verified by careful proofread, not execution. **Also note:** a prior migration in this repo (soft-delete) was shipped in application code before being applied to the live database, which broke the app in production — do NOT assume any migration in this plan has been applied; the app must keep working even before a human runs these migrations. Since this plan only ADDS new nullable/optional concepts (`group_id`, `item_groups` table) that nothing existing queries by, this risk doesn't apply the same way it did for the soft-delete filter — but Task 2's `tiles` computed must tolerate `groups()` being empty (no group rows loaded yet) and must not break `filteredItems()`/existing rendering if group data fails to load.
- No unit test suite exists in this repo. Verification is `ng build` succeeding plus explicit manual-verification steps.

---

### Task 1: Add item_groups table and items.group_id column

**Files:**
- Create: `supabase/migrations/0004_item_groups.sql`
- Modify: `src/app/core/models/wishlist.model.ts`

**Interfaces:**
- Produces: `ItemGroup` interface (`id`, `user_id`, `name`, `created_at`), `WishlistItem.group_id?: string | null`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0004_item_groups.sql`:

```sql
create table if not exists public.item_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.item_groups enable row level security;

drop policy if exists "Users manage their own groups" on public.item_groups;

create policy "Users manage their own groups"
  on public.item_groups
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.items
  add column if not exists group_id uuid references public.item_groups(id) on delete set null;
```

- [ ] **Step 2: Add the `ItemGroup` interface and `group_id` field**

In `src/app/core/models/wishlist.model.ts`, replace:

```ts
  notes?: string | null;
  share_token?: string | null;
  is_deleted?: boolean;
}
```

with:

```ts
  notes?: string | null;
  share_token?: string | null;
  is_deleted?: boolean;
  group_id?: string | null;
}

export interface ItemGroup {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}
```

- [ ] **Step 3: Proofread the SQL for idempotency**

Confirm: `create table if not exists`, `add column if not exists`, and `drop policy if exists` before `create policy` are all present (matches the pattern in `0001_price_history.sql`/`0002_wishlist_sharing.sql`). Confirm `on delete set null` on `group_id` (so deleting a group doesn't cascade-delete its items).

- [ ] **Step 4: Verify the Angular build compiles**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0004_item_groups.sql src/app/core/models/wishlist.model.ts
git commit -m "feat: add item_groups table and items.group_id column for card grouping"
```

---

### Task 2: Add group CRUD and the `tiles` computed to WishlistService

**Files:**
- Modify: `src/app/core/services/wishlist.service.ts`

**Interfaces:**
- Consumes: `ItemGroup` (Task 1).
- Produces: `groups: Signal<ItemGroup[]>` (readonly), `tiles: Signal<WishlistTile[]>`, `loadGroups(): Promise<void>`, `createGroup(name: string, itemIds: string[]): Promise<{ error: any }>`, `addToGroup(groupId: string, itemIds: string[]): Promise<{ error: any }>`, `removeFromGroup(itemId: string): Promise<{ error: any }>`. `WishlistTile` type exported from this file: `{ type: 'item'; item: WishlistItem } | { type: 'group'; group: ItemGroup; items: WishlistItem[] }`.

- [ ] **Step 1: Add the `WishlistTile` type and `groups` signal**

In `src/app/core/services/wishlist.service.ts`, replace the import line:

```ts
import {
  WishlistItem, AddItemPayload, UpdateItemPayload,
  PriceHistoryEntry, WishlistStats, SortBy, FilterBy
} from '../models/wishlist.model';
```

with:

```ts
import {
  WishlistItem, AddItemPayload, UpdateItemPayload,
  PriceHistoryEntry, WishlistStats, SortBy, FilterBy, ItemGroup
} from '../models/wishlist.model';

export type WishlistTile =
  | { type: 'item'; item: WishlistItem }
  | { type: 'group'; group: ItemGroup; items: WishlistItem[] };
```

Replace:

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

with:

```ts
  private _items = signal<WishlistItem[]>([]);
  private _loading = signal(false);
  private _sortBy = signal<SortBy>('newest');
  private _filterBy = signal<FilterBy>('all');
  private _searchQuery = signal('');
  private _activeTag = signal<string | null>(null);
  private _groups = signal<ItemGroup[]>([]);

  items = this._items.asReadonly();
  loading = this._loading.asReadonly();
  sortBy = this._sortBy.asReadonly();
  filterBy = this._filterBy.asReadonly();
  searchQuery = this._searchQuery.asReadonly();
  activeTag = this._activeTag.asReadonly();
  groups = this._groups.asReadonly();
```

- [ ] **Step 2: Add the `tiles` computed**

Immediately after the closing `});` of the existing `stats = computed<WishlistStats>(() => { ... });` block, add:

```ts
  tiles = computed<WishlistTile[]>(() => {
    const filtered = this.filteredItems();
    const allItems = this._items();
    const groups = this._groups();
    const seenGroups = new Set<string>();
    const result: WishlistTile[] = [];

    for (const item of filtered) {
      if (item.group_id) {
        if (seenGroups.has(item.group_id)) continue;
        seenGroups.add(item.group_id);
        const group = groups.find(g => g.id === item.group_id);
        if (!group) {
          result.push({ type: 'item', item });
          continue;
        }
        const members = allItems.filter(i => i.group_id === item.group_id);
        result.push({ type: 'group', group, items: members });
      } else {
        result.push({ type: 'item', item });
      }
    }
    return result;
  });
```

This walks the already-filtered/sorted item list; the first grouped item encountered emits a group tile (with its FULL membership pulled from the unfiltered `_items` list, not just the filtered subset — a group shows completely if any one member matches the active filter/search), and subsequent members of the same group are skipped since they're already represented by that tile. If `group_id` points at a group that hasn't loaded yet (e.g. `loadGroups()` hasn't resolved), the item falls back to rendering as a standalone tile rather than disappearing.

- [ ] **Step 3: Add `loadGroups()` and the three mutation methods**

Immediately after the existing `loadItems()` method's closing `}`, add:

```ts
  async loadGroups(): Promise<void> {
    const user = this.sb.currentUser;
    if (!user) return;

    const { data, error } = await this.sb.client
      .from('item_groups')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return;
    this._groups.set(data ?? []);
  }

  async createGroup(name: string, itemIds: string[]): Promise<{ error: any }> {
    const user = this.sb.currentUser;
    if (!user) return { error: new Error('Not authenticated') };

    try {
      const { data: group, error: groupError } = await this.sb.client
        .from('item_groups')
        .insert({ user_id: user.id, name })
        .select()
        .single();

      if (groupError) throw groupError;

      const { error: itemsError } = await this.sb.client
        .from('items')
        .update({ group_id: group.id })
        .in('id', itemIds);

      if (itemsError) throw itemsError;

      this._groups.update(groups => [group, ...groups]);
      this._items.update(items =>
        items.map(i => itemIds.includes(i.id) ? { ...i, group_id: group.id } : i)
      );
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  async addToGroup(groupId: string, itemIds: string[]): Promise<{ error: any }> {
    try {
      const { error } = await this.sb.client
        .from('items')
        .update({ group_id: groupId })
        .in('id', itemIds);

      if (error) throw error;
      this._items.update(items =>
        items.map(i => itemIds.includes(i.id) ? { ...i, group_id: groupId } : i)
      );
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  async removeFromGroup(itemId: string): Promise<{ error: any }> {
    try {
      const item = this._items().find(i => i.id === itemId);
      const groupId = item?.group_id;
      if (!groupId) return { error: null };

      const { error } = await this.sb.client
        .from('items')
        .update({ group_id: null })
        .eq('id', itemId);

      if (error) throw error;
      this._items.update(items =>
        items.map(i => i.id === itemId ? { ...i, group_id: null } : i)
      );

      const remaining = this._items().filter(i => i.group_id === groupId);
      if (remaining.length <= 1) {
        for (const r of remaining) {
          await this.sb.client.from('items').update({ group_id: null }).eq('id', r.id);
        }
        await this.sb.client.from('item_groups').delete().eq('id', groupId);
        this._items.update(items =>
          items.map(i => i.group_id === groupId ? { ...i, group_id: null } : i)
        );
        this._groups.update(groups => groups.filter(g => g.id !== groupId));
      }
      return { error: null };
    } catch (error) {
      return { error };
    }
  }
```

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 5: Manual verification**

No unit test suite exists — verify by reasoning through the `tiles` computed by hand: (a) two items with the same `group_id`, both present in `filteredItems()` — expect exactly one `{type:'group'}` tile in the result, containing both. (b) one item with a `group_id` that doesn't exist in `groups()` — expect it to fall back to a standalone `{type:'item'}` tile, not be dropped. (c) no groups at all — expect `tiles()` to equal `filteredItems()` mapped 1:1 to `{type:'item'}` tiles, so existing behavior is unchanged until Task 6 wires groups into the UI.

- [ ] **Step 6: Commit**

```bash
git add src/app/core/services/wishlist.service.ts
git commit -m "feat: add group CRUD methods and tiles computed to WishlistService"
```

---

### Task 3: Create GroupTileComponent (collapsed + expanded states)

**Files:**
- Create: `src/app/features/wishlist/group-tile/group-tile.component.ts`

**Interfaces:**
- Consumes: `ItemGroup`, `WishlistItem` (Task 1), `ItemCardComponent` (existing, reused for expanded members).
- Produces: `GroupTileComponent` with `@Input({ required: true }) group!: ItemGroup`, `@Input({ required: true }) items!: WishlistItem[]`, `@Input() viewMode: 'grid' | 'list' = 'grid'`, `@Output() edit`, `@Output() deleted`, `@Output() viewHistory`, `@Output() tagClick` (all `EventEmitter`s re-emitting the same-named events from the member `ItemCardComponent`s), `@Output() removeFromGroup = new EventEmitter<string>()`, `@Output() droppedOnGroup = new EventEmitter<string>()` (emits the dragged item's id when something is dropped on the collapsed tile).

- [ ] **Step 1: Create the component**

Create `src/app/features/wishlist/group-tile/group-tile.component.ts`:

```ts
import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WishlistItem, ItemGroup } from '../../../core/models/wishlist.model';
import { ItemCardComponent } from '../item-card/item-card.component';

@Component({
  selector: 'app-group-tile',
  standalone: true,
  imports: [CommonModule, ItemCardComponent],
  template: `
    @if (!expanded()) {
      <div
        class="bg-card border border-border rounded-xl overflow-hidden flex flex-col h-full cursor-pointer hover:border-primary/40 transition-colors"
        (click)="expanded.set(true)"
        (dragover)="onDragOver($event)"
        (drop)="onDrop($event)"
      >
        <div class="relative w-full aspect-square bg-muted/30 p-3">
          <div class="grid grid-cols-2 gap-1 w-full h-full">
            @for (item of items.slice(0, 3); track item.id) {
              <div class="bg-muted/50 rounded-lg overflow-hidden flex items-center justify-center">
                @if (item.image_url) {
                  <img [src]="item.image_url" [alt]="item.product_name" class="object-contain w-full h-full p-1" />
                } @else {
                  <svg class="w-6 h-6 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                }
              </div>
            }
          </div>
        </div>
        <div class="p-3.5 flex flex-col gap-1">
          <h3 class="font-semibold text-sm text-foreground truncate">{{ group.name }}</h3>
          <p class="text-xs text-muted-foreground">{{ items.length }} item{{ items.length === 1 ? '' : 's' }}</p>
        </div>
      </div>
    } @else {
      <div class="bg-card border border-primary/30 rounded-xl overflow-hidden flex flex-col col-span-2 row-span-2">
        <div class="flex items-center justify-between p-3 border-b border-border/40">
          <h3 class="font-semibold text-sm text-foreground">{{ group.name }}</h3>
          <button (click)="expanded.set(false)" class="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="p-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
          @for (item of items; track item.id) {
            <div class="flex flex-col gap-1">
              <app-item-card
                [item]="item"
                [viewMode]="viewMode"
                (edit)="edit.emit($event)"
                (deleted)="deleted.emit($event)"
                (viewHistory)="viewHistory.emit($event)"
                (tagClick)="tagClick.emit($event)"
              />
              <button (click)="removeFromGroup.emit(item.id)" class="text-xs text-destructive hover:underline self-start px-1">
                Remove from group
              </button>
            </div>
          }
        </div>
      </div>
    }
  `
})
export class GroupTileComponent {
  @Input({ required: true }) group!: ItemGroup;
  @Input({ required: true }) items!: WishlistItem[];
  @Input() viewMode: 'grid' | 'list' = 'grid';
  @Output() edit = new EventEmitter<WishlistItem>();
  @Output() deleted = new EventEmitter<string>();
  @Output() viewHistory = new EventEmitter<WishlistItem>();
  @Output() tagClick = new EventEmitter<string>();
  @Output() removeFromGroup = new EventEmitter<string>();
  @Output() droppedOnGroup = new EventEmitter<string>();

  expanded = signal(false);

  onDragOver(e: DragEvent): void {
    e.preventDefault();
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    const draggedId = e.dataTransfer?.getData('text/plain');
    if (draggedId) this.droppedOnGroup.emit(draggedId);
  }
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds with no template/type errors.

- [ ] **Step 3: Manual verification**

This component isn't wired into the dashboard yet (Task 6 does that) — verify only that it compiles standalone and that `ItemCardComponent`'s existing `@Output()`s (`edit`, `deleted`, `viewHistory`, `tagClick`) match the names/types used in this template exactly (re-check `src/app/features/wishlist/item-card/item-card.component.ts`'s `@Output()` declarations if unsure).

- [ ] **Step 4: Commit**

```bash
git add src/app/features/wishlist/group-tile/group-tile.component.ts
git commit -m "feat: add GroupTileComponent with collapsed and expanded states"
```

---

### Task 4: Add drag-and-drop to ItemCardComponent

**Files:**
- Modify: `src/app/features/wishlist/item-card/item-card.component.ts`

**Interfaces:**
- Produces: `@Output() droppedItemId = new EventEmitter<string>()` on `ItemCardComponent` — emits the dragged item's id when something is dropped on this card. The card itself becomes draggable via native `draggable="true"`.

- [ ] **Step 1: Make the grid-view root card draggable and add drop handling**

Replace:

```html
      <div class="bg-card border border-border rounded-xl overflow-hidden flex flex-col h-full relative group">
        <!-- Header -->
```

with:

```html
      <div
        class="bg-card border border-border rounded-xl overflow-hidden flex flex-col h-full relative group"
        draggable="true"
        (dragstart)="onDragStart($event)"
        (dragover)="onDragOver($event)"
        (drop)="onDrop($event)"
      >
        <!-- Header -->
```

- [ ] **Step 2: Same for the list-view root row**

Replace:

```html
      <div class="bg-card border border-border rounded-xl p-3 flex items-center gap-4 w-full relative group">
        <!-- Thumbnail -->
```

with:

```html
      <div
        class="bg-card border border-border rounded-xl p-3 flex items-center gap-4 w-full relative group"
        draggable="true"
        (dragstart)="onDragStart($event)"
        (dragover)="onDragOver($event)"
        (drop)="onDrop($event)"
      >
        <!-- Thumbnail -->
```

- [ ] **Step 3: Add the output and handler methods**

Replace:

```ts
  @Output() edit = new EventEmitter<WishlistItem>();
  @Output() deleted = new EventEmitter<string>();
  @Output() viewHistory = new EventEmitter<WishlistItem>();
  @Output() tagClick = new EventEmitter<string>();
```

with:

```ts
  @Output() edit = new EventEmitter<WishlistItem>();
  @Output() deleted = new EventEmitter<string>();
  @Output() viewHistory = new EventEmitter<WishlistItem>();
  @Output() tagClick = new EventEmitter<string>();
  @Output() droppedItemId = new EventEmitter<string>();
```

Replace:

```ts
  onImgError(e: Event) {
    (e.target as HTMLImageElement).style.display = 'none';
  }
```

with:

```ts
  onImgError(e: Event) {
    (e.target as HTMLImageElement).style.display = 'none';
  }

  onDragStart(e: DragEvent): void {
    e.dataTransfer?.setData('text/plain', this.item.id);
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    const draggedId = e.dataTransfer?.getData('text/plain');
    if (draggedId && draggedId !== this.item.id) {
      this.droppedItemId.emit(draggedId);
    }
  }
```

Note: this file's item-card image `onImgError` handler may already be named differently (`this.hasImgError.set(true)`) if a prior unrelated fix changed it — if the exact `onImgError` block above doesn't match what's in the file, locate the actual `onImgError` method by name instead and add the three new drag methods immediately after it, unchanged.

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds with no template/type errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/wishlist/item-card/item-card.component.ts
git commit -m "feat: add native drag-and-drop handlers to ItemCardComponent"
```

---

### Task 5: Add a group-name prompt modal

**Files:**
- Create: `src/app/features/wishlist/group-name-modal/group-name-modal.component.ts`

**Interfaces:**
- Produces: `GroupNameModalComponent` with `@Output() confirmed = new EventEmitter<string>()`, `@Output() close = new EventEmitter<void>()`.

- [ ] **Step 1: Create the component**

Create `src/app/features/wishlist/group-name-modal/group-name-modal.component.ts`:

```ts
import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-group-name-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="onBackdropClick($event)">
      <div class="modal-content max-w-sm" (click)="$event.stopPropagation()">
        <h2 class="text-lg font-display font-bold text-foreground mb-4">Name this group</h2>
        <form (ngSubmit)="onSubmit()">
          <input
            type="text"
            [(ngModel)]="name"
            name="groupName"
            placeholder="e.g. Outfit 1"
            class="input mb-4"
            autofocus
          />
          <div class="flex gap-3">
            <button type="button" (click)="close.emit()" class="btn-secondary btn-md flex-1">Cancel</button>
            <button type="submit" class="btn-primary btn-md flex-1" [disabled]="!name.trim()">Create Group</button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class GroupNameModalComponent {
  @Output() confirmed = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  name = '';

  onSubmit(): void {
    if (!this.name.trim()) return;
    this.confirmed.emit(this.name.trim());
  }

  onBackdropClick(e: Event): void {
    if (e.target === e.currentTarget) this.close.emit();
  }
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds with no template/type errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/wishlist/group-name-modal/group-name-modal.component.ts
git commit -m "feat: add group-name prompt modal"
```

---

### Task 6: Wire tiles, drag-drop, and group tiles into the dashboard

**Files:**
- Modify: `src/app/features/dashboard/dashboard.component.ts`

**Interfaces:**
- Consumes: `WishlistService.tiles` (Task 2), `GroupTileComponent` (Task 3), `ItemCardComponent`'s `droppedItemId` output (Task 4), `GroupNameModalComponent` (Task 5).

- [ ] **Step 1: Import the new components and call `loadGroups()`**

Replace:

```ts
import { ItemCardComponent } from '../wishlist/item-card/item-card.component';
import { AddItemModalComponent } from '../wishlist/add-item-modal/add-item-modal.component';
import { PriceHistoryModalComponent } from '../wishlist/price-history-modal/price-history-modal.component';
import { ShareService } from '../../core/services/share.service';
```

with:

```ts
import { ItemCardComponent } from '../wishlist/item-card/item-card.component';
import { AddItemModalComponent } from '../wishlist/add-item-modal/add-item-modal.component';
import { PriceHistoryModalComponent } from '../wishlist/price-history-modal/price-history-modal.component';
import { GroupTileComponent } from '../wishlist/group-tile/group-tile.component';
import { GroupNameModalComponent } from '../wishlist/group-name-modal/group-name-modal.component';
import { ShareService } from '../../core/services/share.service';
```

Replace:

```ts
  imports: [
    CommonModule,
    FormsModule,
    ItemCardComponent,
    AddItemModalComponent,
    PriceHistoryModalComponent,
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
    GroupTileComponent,
    GroupNameModalComponent,
  ],
```

Find the `ngOnInit()` method's line `await this.wishlistSvc.loadItems();` and replace it with:

```ts
    await this.wishlistSvc.loadItems();
    await this.wishlistSvc.loadGroups();
```

- [ ] **Step 2: Replace the item grid's `@for` loop to iterate tiles**

Replace:

```html
            <div [class]="viewMode() === 'grid' ? 'p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4' : 'p-4 flex flex-col gap-4'">
              @for (item of filteredItems(); track item.id) {
                <app-item-card
                  [item]="item"
                  [viewMode]="viewMode()"
                  (edit)="onEditItem($event)"
                  (deleted)="onDeleted($event)"
                  (viewHistory)="onViewHistory($event)"
                  (tagClick)="onTagClick($event)"
                />
              }
            </div>
```

with:

```html
            <div [class]="viewMode() === 'grid' ? 'p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4' : 'p-4 flex flex-col gap-4'">
              @for (tile of wishlistSvc.tiles(); track tile.type === 'item' ? tile.item.id : tile.group.id) {
                @if (tile.type === 'item') {
                  <app-item-card
                    [item]="tile.item"
                    [viewMode]="viewMode()"
                    (edit)="onEditItem($event)"
                    (deleted)="onDeleted($event)"
                    (viewHistory)="onViewHistory($event)"
                    (tagClick)="onTagClick($event)"
                    (droppedItemId)="onDroppedOnItem($event, tile.item)"
                  />
                } @else {
                  <app-group-tile
                    [group]="tile.group"
                    [items]="tile.items"
                    [viewMode]="viewMode()"
                    (edit)="onEditItem($event)"
                    (deleted)="onDeleted($event)"
                    (viewHistory)="onViewHistory($event)"
                    (tagClick)="onTagClick($event)"
                    (removeFromGroup)="onRemoveFromGroup($event)"
                    (droppedOnGroup)="onDroppedOnGroup($event, tile.group.id)"
                  />
                }
              }
            </div>
```

- [ ] **Step 3: Add the group-name modal to the template**

Replace:

```html
      <!-- Price History Modal -->
      @if (historyItemId()) {
        <app-price-history-modal
          [itemId]="historyItemId()!"
          (close)="historyItemId.set(null)"
        />
      }
```

with:

```html
      <!-- Price History Modal -->
      @if (historyItemId()) {
        <app-price-history-modal
          [itemId]="historyItemId()!"
          (close)="historyItemId.set(null)"
        />
      }

      <!-- Group Name Modal -->
      @if (pendingGroupItemIds()) {
        <app-group-name-modal
          (confirmed)="onGroupNameConfirmed($event)"
          (close)="pendingGroupItemIds.set(null)"
        />
      }
```

- [ ] **Step 4: Add the signal and handler methods to the component class**

Replace:

```ts
  historyItemId = signal<string | null>(null);
  sharingWishlist = signal(false);
```

with:

```ts
  historyItemId = signal<string | null>(null);
  sharingWishlist = signal(false);
  pendingGroupItemIds = signal<[string, string] | null>(null);
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

  onDroppedOnItem(draggedId: string, targetItem: WishlistItem) {
    if (targetItem.group_id) {
      this.wishlistSvc.addToGroup(targetItem.group_id, [draggedId]).then(({ error }) => {
        if (error) this.toastSvc.error('Could not add to group');
      });
      return;
    }
    this.pendingGroupItemIds.set([draggedId, targetItem.id]);
  }

  onDroppedOnGroup(draggedId: string, groupId: string) {
    this.wishlistSvc.addToGroup(groupId, [draggedId]).then(({ error }) => {
      if (error) this.toastSvc.error('Could not add to group');
    });
  }

  async onGroupNameConfirmed(name: string) {
    const ids = this.pendingGroupItemIds();
    this.pendingGroupItemIds.set(null);
    if (!ids) return;
    const { error } = await this.wishlistSvc.createGroup(name, ids);
    if (error) this.toastSvc.error('Could not create group');
    else this.toastSvc.success(`Grouped into "${name}"`);
  }

  async onRemoveFromGroup(itemId: string) {
    const { error } = await this.wishlistSvc.removeFromGroup(itemId);
    if (error) this.toastSvc.error('Could not remove from group');
  }
```

- [ ] **Step 5: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds with no template/type errors.

- [ ] **Step 6: Manual verification**

Run `npm start`, add at least 2 items, drag one item card onto another — confirm the group-name modal appears; enter a name and confirm — confirm both items disappear from the flat grid and a single collapsed group tile appears in their place, showing the name and "2 items". Click the tile — confirm it expands to show both items as normal item cards with a "Remove from group" button under each. Click "Remove from group" on one — confirm that item leaves the group (since only 1 member remains, the group itself should be deleted per Task 2's `removeFromGroup` logic, so the last item reverts to being a standalone tile). Drag a third item onto the still-collapsed group tile (before removing anything) — confirm it joins the group without prompting for a name again.

- [ ] **Step 7: Commit**

```bash
git add src/app/features/dashboard/dashboard.component.ts
git commit -m "feat: wire card grouping into the dashboard grid"
```

---

## Plan self-review notes

- **Spec coverage:** data model (Task 1), group CRUD + tile collapsing logic (Task 2), collapsed/expanded rendering (Task 3), desktop drag-and-drop (Task 4), naming prompt (Task 5), dashboard wiring (Task 6) — covers every in-scope section of the design spec. Mobile long-press is explicitly deferred per Global Constraints, matching the scoping decision made with the user given context constraints.
- **Type consistency:** `WishlistTile` (Task 2) is consumed identically in Task 6's template (`tile.type === 'item'` / `tile.group` / `tile.items`). `GroupTileComponent`'s `@Output()` names (Task 3) match what Task 6 binds to (`removeFromGroup`, `droppedOnGroup`). `ItemCardComponent.droppedItemId` (Task 4) matches Task 6's `(droppedItemId)="onDroppedOnItem($event, tile.item)"` binding.
- **Known follow-up (not in this plan):** mobile/touch grouping (long-press to multi-select + Group button), and reflecting groups in the `get-shared` public view (currently out of scope per the design spec — shared items/wishlists render exactly as before, ungrouped).
