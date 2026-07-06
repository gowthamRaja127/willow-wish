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
