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
