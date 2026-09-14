-- UniSync payment receipt queue. Run once in the Supabase SQL Editor.
-- Requires 002_single_owner_access.sql. No email is sent by this migration.
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-receipts', 'payment-receipts', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.payment_receipt_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  payment_id text not null check (payment_id in (
    'admission', 'semester-1', 'semester-2', 'semester-3',
    'semester-4', 'semester-5', 'semester-6'
  )),
  payment_title text not null check (char_length(payment_title) between 1 and 120),
  amount numeric(12, 2) not null check (amount > 0 and amount <= 2000000),
  paid_on date not null,
  transaction_id text not null check (char_length(transaction_id) between 3 and 120),
  payment_type text not null check (payment_type in
    ('Mobile banking', 'Bank transfer', 'eSewa', 'Khalti', 'Other')),
  email_body text not null check (char_length(email_body) between 10 and 10000),
  receipt_path text not null check (char_length(receipt_path) between 40 and 300),
  receipt_name text not null check (char_length(receipt_name) between 1 and 180),
  receipt_mime text not null check (receipt_mime in
    ('application/pdf', 'image/jpeg', 'image/png')),
  signed_receipt_url text not null check (char_length(signed_receipt_url) between 80 and 2000),
  status text not null default 'queued' check (status in
    ('queued', 'processing', 'sent', 'failed')),
  gmail_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  processing_at timestamptz,
  sent_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (owner_id, transaction_id)
);

create index if not exists payment_receipt_jobs_status_created_idx
  on public.payment_receipt_jobs (status, created_at);

alter table public.payment_receipt_jobs enable row level security;

revoke all on table public.payment_receipt_jobs from public, anon, authenticated;
grant select, insert on table public.payment_receipt_jobs to authenticated;

drop policy if exists owner_reads_receipt_jobs on public.payment_receipt_jobs;
create policy owner_reads_receipt_jobs on public.payment_receipt_jobs
  for select to authenticated
  using (
    owner_id = (select auth.uid()) and exists (
      select 1 from public.app_users
      where email = (select auth.jwt() ->> 'email')
    )
  );

drop policy if exists owner_queues_receipt_jobs on public.payment_receipt_jobs;
create policy owner_queues_receipt_jobs on public.payment_receipt_jobs
  for insert to authenticated
  with check (
    owner_id = (select auth.uid()) and status = 'queued'
    and gmail_message_id is null and error_message is null
    and processing_at is null and sent_at is null
    and receipt_path like (select auth.uid())::text || '/%'
    and signed_receipt_url like
      'https://qozetqmklegcnjgxtgpd.supabase.co/storage/v1/object/sign/payment-receipts/%'
    and exists (
      select 1 from public.app_users
      where email = (select auth.jwt() ->> 'email')
    )
  );

drop policy if exists owner_uploads_payment_receipts on storage.objects;
create policy owner_uploads_payment_receipts on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'payment-receipts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.app_users
      where email = (select auth.jwt() ->> 'email')
    )
  );

drop policy if exists owner_reads_payment_receipts on storage.objects;
create policy owner_reads_payment_receipts on storage.objects
  for select to authenticated
  using (
    bucket_id = 'payment-receipts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.app_users
      where email = (select auth.jwt() ->> 'email')
    )
  );

-- Keep the live Send button off until the recipient, Gmail credential, and
-- workflow have been tested. Enable only after those steps are complete.
create table if not exists public.payment_receipt_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  recipient_label text,
  updated_at timestamptz not null default now()
);
insert into public.payment_receipt_settings (id, enabled)
values (true, false) on conflict (id) do nothing;
alter table public.payment_receipt_settings enable row level security;
revoke all on table public.payment_receipt_settings from public, anon, authenticated;
grant select on table public.payment_receipt_settings to authenticated;
drop policy if exists owner_reads_receipt_settings on public.payment_receipt_settings;
create policy owner_reads_receipt_settings on public.payment_receipt_settings
  for select to authenticated
  using (exists (
    select 1 from public.app_users
    where email = (select auth.jwt() ->> 'email')
  ));

-- Atomically claims one queued job. Only n8n's service role may call it.
create or replace function public.claim_next_payment_receipt()
returns setof public.payment_receipt_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.payment_receipt_jobs as job
  set status = 'processing',
      processing_at = now(),
      updated_at = now()
  where job.id = (
    select pending.id
    from public.payment_receipt_jobs as pending
    where pending.status = 'queued'
    order by pending.created_at
    for update skip locked
    limit 1
  )
  returning job.*;
end;
$$;

revoke all on function public.claim_next_payment_receipt() from public, anon, authenticated;
grant execute on function public.claim_next_payment_receipt() to service_role;

commit;
