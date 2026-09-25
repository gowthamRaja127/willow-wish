-- target_purchase_date already exists as a plain date/timestamp column; widen
-- it to timestamptz (a no-op if it already is one) so a reminder can carry a
-- specific time-of-day, not just a day.
alter table public.items
  alter column target_purchase_date type timestamptz using target_purchase_date::timestamptz;

alter table public.items
  add column if not exists reminder_sent boolean not null default false;

create index if not exists items_reminder_due_idx
  on public.items (target_purchase_date)
  where reminder_sent = false and is_purchased = false;
