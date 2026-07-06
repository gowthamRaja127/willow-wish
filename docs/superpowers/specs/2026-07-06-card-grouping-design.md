# Card Grouping

**Date:** 2026-07-06
**Status:** Approved (no objections raised to the presented design)

## Goal

Let a user drag multiple wishlist items into a named group (e.g. "Outfit 1"
from a shirt, pant, and shoe), shown collapsed at the same footprint as a
normal card, expanding in place on click to reveal its contents.

## Data model

New table `item_groups`:
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `name text not null`
- `created_at timestamptz not null default now()`

New nullable column `items.group_id uuid references item_groups(id) on delete set null`.
RLS on `item_groups`: owner-only, same pattern as `wishlist_shares`.

Grouping is purely organizational: a grouped item keeps all its own fields
(price tracking, tags, purchase status) and still counts individually in
stats, search, and tag filtering. A group has no independent price/stats —
it is a container, not a new kind of item.

## Interaction model

**Desktop:** drag card A onto card B → a name prompt appears → on confirm,
both items get `group_id` set to a newly created group. Dragging a further
card onto the collapsed group tile adds it to the existing group (same
`group_id` assignment, no new-group prompt).

**Mobile/touch:** long-press a card to enter selection mode; tapping other
cards toggles their selection; a "Group" action button (shown while in
selection mode) triggers the same name prompt and assignment. Long-pressing
an already-grouped card's tile while in selection mode, then tapping other
cards, adds them to that existing group instead of creating a new one.

**Removing a card from a group:** a "Remove from group" action inside the
expanded group view sets that item's `group_id` back to `null`. If a group
drops to 0 or 1 remaining members, delete the (now-pointless) group row and
clear the last member's `group_id`.

## Collapsed tile

Same grid slot/footprint as a normal item card. Shows:
- A stacked preview of up to 3 member item thumbnails (overlapping, like a
  small fan of images)
- The group name
- Item count (e.g. "3 items")

## Expansion

Clicking the collapsed tile expands it in place — the tile grows to span
more grid columns/rows and renders the full item cards of its members
(same `ItemCardComponent` used everywhere else, so existing actions — edit,
delete, price history, share, tags — all keep working unchanged on grouped
items). Clicking again (or a close affordance on the expanded tile)
collapses it back.

## Filtering, sorting, search

Existing filters/search continue to match against individual items,
including ones inside a collapsed group — a match inside a group does not
auto-expand it; the group tile still shows with its full original
membership, on the reasoning that partial rendering of a group is more
confusing than not filtering inside groups at all. Sorting applies to
top-level tiles: a group tile sorts by the group's own `created_at`, not by
any aggregate of its members'.

## Out of scope for this pass

- Groups belonging to more than one type of collection (e.g. nested groups)
- Any change to sharing (a shared item/wishlist link renders items exactly
  as before — grouping is a dashboard-only concept for this pass, not
  reflected in `get-shared`'s response shape)
- Reordering members within an expanded group
