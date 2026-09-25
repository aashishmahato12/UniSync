-- Run after 009_private_self_signup.sql. Gmail tokens are only accessible to
-- the server service role; the browser receives connection status via /api/mail.
begin;

create table if not exists public.mail_connections (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  mailbox_email text not null,
  refresh_token_encrypted text not null,
  status text not null default 'connected'
    check (status in ('connected', 'reconnect_required')),
  last_synced_at timestamptz,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists mail_connections_mailbox_unique
  on public.mail_connections (lower(mailbox_email));
create index if not exists mail_connections_sync_order
  on public.mail_connections (last_synced_at nulls first)
  where status = 'connected';
alter table public.mail_connections enable row level security;
revoke all on table public.mail_connections from public, anon, authenticated;
grant select, insert, update, delete on table public.mail_connections to service_role;

create table if not exists public.mail_oauth_states (
  state_hash text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null
);
create index if not exists mail_oauth_states_expiry on public.mail_oauth_states(expires_at);
alter table public.mail_oauth_states enable row level security;
revoke all on table public.mail_oauth_states from public, anon, authenticated;
grant select, insert, delete on table public.mail_oauth_states to service_role;

create or replace function public.consume_mail_oauth_state(p_state_hash text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_owner uuid;
begin
  delete from public.mail_oauth_states
  where state_hash = p_state_hash and expires_at > now()
  returning owner_id into v_owner;
  return v_owner;
end $$;
revoke all on function public.consume_mail_oauth_state(text) from public, anon, authenticated;
grant execute on function public.consume_mail_oauth_state(text) to service_role;

-- Keep the original n8n credential working while connected users use their own.
create or replace function public.has_connected_mailbox()
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) = public.original_mailbox_owner_id()
    or exists (
      select 1 from public.mail_connections
      where owner_id = (select auth.uid()) and status = 'connected'
    )
$$;
revoke all on function public.has_connected_mailbox() from public, anon, authenticated;
grant execute on function public.has_connected_mailbox() to authenticated;

-- The old Gmail node has the original owner's credential. It must never claim
-- another user's email, even after that user connects their own mailbox.
do $optional_college_jobs$
begin
  if to_regclass('public.college_email_jobs') is not null then
    execute $sql$create or replace function public.claim_next_college_email()
      returns setof public.college_email_jobs
      language plpgsql security definer set search_path = '' as $fn$
      begin
        return query update public.college_email_jobs as job
        set status = 'processing', processing_at = now(), updated_at = now()
        where job.id = (
          select pending.id from public.college_email_jobs as pending
          where pending.status = 'queued'
            and pending.owner_id = public.original_mailbox_owner_id()
          order by pending.created_at for update skip locked limit 1
        ) returning job.*;
      end $fn$;$sql$;
    execute 'revoke all on function public.claim_next_college_email() from public, anon, authenticated';
    execute 'grant execute on function public.claim_next_college_email() to service_role';

    execute $sql$create or replace function public.claim_next_connected_college_email(p_owner uuid)
      returns setof public.college_email_jobs
      language plpgsql security definer set search_path = '' as $fn$
      begin
        return query update public.college_email_jobs as job
        set status = 'processing', processing_at = now(), updated_at = now()
        where job.id = (
          select pending.id from public.college_email_jobs as pending
          join public.mail_connections as connection on connection.owner_id = pending.owner_id
          where pending.status = 'queued' and pending.owner_id = p_owner
            and connection.status = 'connected'
          order by pending.created_at for update of pending skip locked limit 1
        ) returning job.*;
      end $fn$;$sql$;
    execute 'revoke all on function public.claim_next_connected_college_email(uuid) from public, anon, authenticated';
    execute 'grant execute on function public.claim_next_connected_college_email(uuid) to service_role';
  end if;
end $optional_college_jobs$;

-- Receipt delivery still uses the original owner's fixed n8n Gmail credential.
-- Connecting a new mailbox must not make that old workflow available to them.
do $optional_receipts$
begin
  if to_regclass('public.payment_receipt_jobs') is not null then
    execute 'drop policy if exists owner_queues_receipt_jobs on public.payment_receipt_jobs';
    execute $sql$create policy owner_queues_receipt_jobs on public.payment_receipt_jobs
      for insert to authenticated with check (
        owner_id = (select auth.uid())
        and lower((select auth.jwt() ->> 'email')) = 'mahatoaashish5@gmail.com'
        and status = 'queued' and gmail_message_id is null
        and error_message is null and processing_at is null and sent_at is null
        and receipt_path like (select auth.uid())::text || '/%'
        and signed_receipt_url like
          'https://qozetqmklegcnjgxtgpd.supabase.co/storage/v1/object/sign/payment-receipts/%'
      )$sql$;
    execute $sql$create or replace function public.claim_next_payment_receipt()
      returns setof public.payment_receipt_jobs
      language plpgsql security definer set search_path = '' as $fn$
      begin
        return query update public.payment_receipt_jobs as job
        set status = 'processing', processing_at = now(), updated_at = now()
        where job.id = (
          select pending.id from public.payment_receipt_jobs as pending
          where pending.status = 'queued'
            and pending.owner_id = public.original_mailbox_owner_id()
          order by pending.created_at for update skip locked limit 1
        ) returning job.*;
      end $fn$;$sql$;
    execute 'revoke all on function public.claim_next_payment_receipt() from public, anon, authenticated';
    execute 'grant execute on function public.claim_next_payment_receipt() to service_role';
  end if;
  if to_regclass('public.payment_receipt_settings') is not null then
    execute 'drop policy if exists owner_reads_receipt_settings on public.payment_receipt_settings';
    execute $sql$create policy owner_reads_receipt_settings on public.payment_receipt_settings
      for select to authenticated using (
        lower((select auth.jwt() ->> 'email')) = 'mahatoaashish5@gmail.com'
      )$sql$;
  end if;
end $optional_receipts$;

commit;
