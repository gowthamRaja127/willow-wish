alter table public.items enable row level security;

drop policy if exists "Users select their own items" on public.items;
drop policy if exists "Users insert their own items" on public.items;
drop policy if exists "Users update their own items" on public.items;
drop policy if exists "Users delete their own items" on public.items;

create policy "Users select their own items"
  on public.items
  for select
  using (auth.uid() = user_id);

create policy "Users insert their own items"
  on public.items
  for insert
  with check (auth.uid() = user_id);

create policy "Users update their own items"
  on public.items
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete their own items"
  on public.items
  for delete
  using (auth.uid() = user_id);
