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
