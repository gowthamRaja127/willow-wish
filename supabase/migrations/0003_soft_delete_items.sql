alter table public.items
  add column if not exists is_deleted boolean not null default false;

create index if not exists items_is_deleted_idx on public.items (user_id, is_deleted);
