-- Apply in the Supabase SQL Editor before enabling open sign-up in the app.
-- Existing Gmail intake belongs to the original connected mailbox. New users
-- receive private, initially empty inboxes until their own intake is connected.
begin;

-- A verified Supabase user may register only their own email.
alter table public.app_users enable row level security;
revoke all on table public.app_users from public, anon, authenticated;
grant select, insert on table public.app_users to authenticated;
drop policy if exists owner_reads_allowlist on public.app_users;
drop policy if exists users_read_own_account on public.app_users;
drop policy if exists users_create_own_account on public.app_users;
create policy users_read_own_account on public.app_users
  for select to authenticated
  using (lower(email) = lower((select auth.jwt() ->> 'email')));
create policy users_create_own_account on public.app_users
  for insert to authenticated
  with check (
    (select auth.uid()) is not null
    and lower(email) = lower((select auth.jwt() ->> 'email'))
  );

-- The existing n8n Gmail connection has one owner. Its service-role inserts
-- can keep omitting owner_id; a future per-user intake can supply it explicitly.
create or replace function public.original_mailbox_owner_id()
returns uuid language sql stable security definer set search_path = ''
as $$
  select id from auth.users
  where lower(email) = 'mahatoaashish5@gmail.com'
  limit 1
$$;
revoke all on function public.original_mailbox_owner_id() from public, anon, authenticated;
grant execute on function public.original_mailbox_owner_id() to service_role;
create or replace function public.has_connected_mailbox()
returns boolean language sql stable security definer set search_path = ''
as $$ select auth.uid() = public.original_mailbox_owner_id() $$;
revoke all on function public.has_connected_mailbox() from public, anon, authenticated;
grant execute on function public.has_connected_mailbox() to authenticated;

do $$
begin
  if public.original_mailbox_owner_id() is null then
    raise exception 'Original mailbox owner must sign in before this migration runs';
  end if;
end $$;

alter table public.college_notices
  add column if not exists owner_id uuid references auth.users(id);
alter table public.college_events
  add column if not exists owner_id uuid references auth.users(id);
alter table public.college_attachments
  add column if not exists owner_id uuid references auth.users(id);

update public.college_notices set owner_id = public.original_mailbox_owner_id() where owner_id is null;
update public.college_events set owner_id = public.original_mailbox_owner_id() where owner_id is null;
update public.college_attachments set owner_id = public.original_mailbox_owner_id() where owner_id is null;

alter table public.college_notices alter column owner_id set default public.original_mailbox_owner_id();
alter table public.college_events alter column owner_id set default public.original_mailbox_owner_id();
alter table public.college_attachments alter column owner_id set default public.original_mailbox_owner_id();
alter table public.college_notices alter column owner_id set not null;
alter table public.college_events alter column owner_id set not null;
alter table public.college_attachments alter column owner_id set not null;
create index if not exists college_notices_owner_received_idx on public.college_notices(owner_id, received_at desc);
create index if not exists college_events_owner_date_idx on public.college_events(owner_id, event_date);
create index if not exists college_attachments_owner_received_idx on public.college_attachments(owner_id, received_at desc);

-- Replace the old allowlist-wide read policies: merely creating an account
-- must never reveal the original student's messages, events, or attachments.
drop policy if exists owner_reads_notices on public.college_notices;
drop policy if exists owner_reads_events on public.college_events;
drop policy if exists owner_updates_event_status on public.college_events;
drop policy if exists owner_reads_college_attachments on public.college_attachments;
drop policy if exists users_read_own_notices on public.college_notices;
drop policy if exists users_read_own_events on public.college_events;
drop policy if exists users_update_own_event_status on public.college_events;
drop policy if exists users_read_own_college_attachments on public.college_attachments;
create policy users_read_own_notices on public.college_notices
  for select to authenticated using (owner_id = (select auth.uid()));
create policy users_read_own_events on public.college_events
  for select to authenticated using (owner_id = (select auth.uid()));
create policy users_update_own_event_status on public.college_events
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy users_read_own_college_attachments on public.college_attachments
  for select to authenticated using (owner_id = (select auth.uid()));

drop policy if exists owner_opens_college_attachments on storage.objects;
drop policy if exists users_open_own_college_attachments on storage.objects;
create policy users_open_own_college_attachments on storage.objects
  for select to authenticated using (
    bucket_id = 'college-attachments'
    and exists (
      select 1 from public.college_attachments
      where storage_path = name and owner_id = (select auth.uid())
    )
  );

-- Outgoing n8n still uses the original Gmail credential. Until each new
-- account can connect its own sender, prevent it from sending as that owner.
drop policy if exists users_queue_own_college_emails on public.college_email_jobs;
create policy users_queue_own_college_emails on public.college_email_jobs
  for insert to authenticated with check (
    owner_id = (select auth.uid())
    and public.has_connected_mailbox()
    and status = 'queued'
    and gmail_message_id is null and error_message is null
    and processing_at is null and sent_at is null
  );

drop policy if exists owner_queues_receipt_jobs on public.payment_receipt_jobs;
create policy owner_queues_receipt_jobs on public.payment_receipt_jobs
  for insert to authenticated with check (
    owner_id = (select auth.uid())
    and public.has_connected_mailbox()
    and status = 'queued'
    and gmail_message_id is null and error_message is null
    and processing_at is null and sent_at is null
    and receipt_path like (select auth.uid())::text || '/%'
    and signed_receipt_url like
      'https://qozetqmklegcnjgxtgpd.supabase.co/storage/v1/object/sign/payment-receipts/%'
  );
drop policy if exists owner_reads_receipt_settings on public.payment_receipt_settings;
create policy owner_reads_receipt_settings on public.payment_receipt_settings
  for select to authenticated using (public.has_connected_mailbox());

commit;
