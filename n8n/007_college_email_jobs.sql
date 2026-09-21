-- Secure queue for student emails to verified Herald College addresses.
begin;

create table if not exists public.college_email_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recipient text not null check (recipient ~* '^[^[:space:]@]+@heraldcollege\.edu\.np$'),
  subject text not null check (char_length(subject) between 3 and 180),
  message text not null check (char_length(message) between 10 and 10000),
  status text not null default 'queued' check (status in ('queued','processing','sent','failed')),
  gmail_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  processing_at timestamptz,
  sent_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists college_email_jobs_status_created_idx on public.college_email_jobs (status, created_at);
alter table public.college_email_jobs enable row level security;
revoke all on table public.college_email_jobs from public, anon, authenticated;
grant select, insert on table public.college_email_jobs to authenticated;

drop policy if exists users_read_own_college_emails on public.college_email_jobs;
create policy users_read_own_college_emails on public.college_email_jobs
  for select to authenticated using (owner_id = (select auth.uid()));

drop policy if exists users_queue_own_college_emails on public.college_email_jobs;
create policy users_queue_own_college_emails on public.college_email_jobs
  for insert to authenticated with check (
    owner_id = (select auth.uid()) and status = 'queued'
    and gmail_message_id is null and error_message is null
    and processing_at is null and sent_at is null
  );

create or replace function public.claim_next_college_email()
returns setof public.college_email_jobs
language plpgsql security definer set search_path = public as $$
begin
  return query update public.college_email_jobs as job
  set status = 'processing', processing_at = now(), updated_at = now()
  where job.id = (
    select pending.id from public.college_email_jobs as pending
    where pending.status = 'queued' order by pending.created_at
    for update skip locked limit 1
  ) returning job.*;
end;
$$;
revoke all on function public.claim_next_college_email() from public, anon, authenticated;
grant execute on function public.claim_next_college_email() to service_role;

commit;
