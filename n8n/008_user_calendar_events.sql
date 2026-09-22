-- Private calendar events created by each UniSync user.
begin;

create table if not exists public.user_calendar_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  event_date date not null,
  start_time time,
  location text check (location is null or char_length(location) <= 180),
  category text not null default 'College event'
    check (category in ('Exam', 'Deadline', 'College event', 'Holiday')),
  description text not null default '' check (char_length(description) <= 1200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_calendar_events_owner_date_idx
  on public.user_calendar_events (owner_id, event_date, start_time);

alter table public.user_calendar_events enable row level security;
grant select, insert, update, delete on table public.user_calendar_events to authenticated;

drop policy if exists users_read_own_calendar_events on public.user_calendar_events;
create policy users_read_own_calendar_events on public.user_calendar_events
  for select to authenticated using (owner_id = (select auth.uid()));

drop policy if exists users_add_own_calendar_events on public.user_calendar_events;
create policy users_add_own_calendar_events on public.user_calendar_events
  for insert to authenticated with check (owner_id = (select auth.uid()));

drop policy if exists users_update_own_calendar_events on public.user_calendar_events;
create policy users_update_own_calendar_events on public.user_calendar_events
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists users_delete_own_calendar_events on public.user_calendar_events;
create policy users_delete_own_calendar_events on public.user_calendar_events
  for delete to authenticated using (owner_id = (select auth.uid()));

commit;
