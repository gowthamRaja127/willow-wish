alter table public.wishlist_shares
  add column if not exists item_ids uuid[];

comment on column public.wishlist_shares.item_ids is
  'Optional subset of items.id to include in this wishlist share link. Null/empty = share the whole wishlist (legacy behavior).';
