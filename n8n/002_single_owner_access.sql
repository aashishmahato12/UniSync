-- Run in the Supabase SQL Editor before deploying the sign-in UI.
-- Only the owner mailbox below can read notices and events. The n8n backend
-- secret/service role still bypasses RLS for intake; never use it in Vite.

begin;

create table if not exists public.app_users (
  email text primary key,
  created_at timestamptz not null default now()
);

insert into public.app_users (email)
values ('mahatoaashish5@gmail.com')
on conflict (email) do nothing;

alter table public.app_users enable row level security;
alter table public.college_notices enable row level security;
alter table public.college_events enable row level security;

-- Remove any previous broad read/write policies, including anonymous access.
do $$
declare policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('app_users', 'college_notices', 'college_events')
  loop
    execute format('drop policy %I on %I.%I',
      policy_record.policyname, policy_record.schemaname, policy_record.tablename);
  end loop;
end $$;

revoke all on table public.app_users from public, anon, authenticated;
revoke all on table public.college_notices from public, anon, authenticated;
revoke all on table public.college_events from public, anon, authenticated;

grant select on table public.app_users to authenticated;
grant select on table public.college_notices to authenticated;
grant select on table public.college_events to authenticated;
grant update (calendar_state, updated_at) on table public.college_events to authenticated;

create policy owner_reads_allowlist on public.app_users
  for select to authenticated
  using (email = (select auth.jwt() ->> 'email'));

create policy owner_reads_notices on public.college_notices
  for select to authenticated
  using (exists (
    select 1 from public.app_users
    where email = (select auth.jwt() ->> 'email')
  ));

create policy owner_reads_events on public.college_events
  for select to authenticated
  using (exists (
    select 1 from public.app_users
    where email = (select auth.jwt() ->> 'email')
  ));

create policy owner_updates_event_status on public.college_events
  for update to authenticated
  using (exists (
    select 1 from public.app_users
    where email = (select auth.jwt() ->> 'email')
  ))
  with check (exists (
    select 1 from public.app_users
    where email = (select auth.jwt() ->> 'email')
  ));

commit;
