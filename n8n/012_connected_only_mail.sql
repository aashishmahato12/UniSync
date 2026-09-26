-- Every account, including the original owner, now needs its own connected
-- Gmail entry before it can queue college email. Run after the old senders
-- are unpublished and the UniSync app update is deployed.
begin;

create or replace function public.has_connected_mailbox()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.mail_connections
    where owner_id = (select auth.uid()) and status = 'connected'
  )
$$;
revoke all on function public.has_connected_mailbox() from public, anon, authenticated;
grant execute on function public.has_connected_mailbox() to authenticated;

-- If an old n8n sender is accidentally republished, it cannot claim the
-- original owner's jobs once that owner has connected Gmail to UniSync.
create or replace function public.claim_next_college_email()
returns setof public.college_email_jobs
language plpgsql security definer set search_path = '' as $$
begin
  return query update public.college_email_jobs as job
  set status = 'processing', processing_at = now(), updated_at = now()
  where job.id = (
    select pending.id from public.college_email_jobs as pending
    where pending.status = 'queued'
      and pending.owner_id = public.original_mailbox_owner_id()
      and not exists (
        select 1 from public.mail_connections as connection
        where connection.owner_id = pending.owner_id and connection.status = 'connected'
      )
    order by pending.created_at for update skip locked limit 1
  ) returning job.*;
end $$;
revoke all on function public.claim_next_college_email() from public, anon, authenticated;
grant execute on function public.claim_next_college_email() to service_role;

create or replace function public.claim_next_payment_receipt()
returns setof public.payment_receipt_jobs
language plpgsql security definer set search_path = '' as $$
begin
  return query update public.payment_receipt_jobs as job
  set status = 'processing', processing_at = now(), updated_at = now()
  where job.id = (
    select pending.id from public.payment_receipt_jobs as pending
    where pending.status = 'queued'
      and pending.owner_id = public.original_mailbox_owner_id()
      and not exists (
        select 1 from public.mail_connections as connection
        where connection.owner_id = pending.owner_id and connection.status = 'connected'
      )
    order by pending.created_at for update skip locked limit 1
  ) returning job.*;
end $$;
revoke all on function public.claim_next_payment_receipt() from public, anon, authenticated;
grant execute on function public.claim_next_payment_receipt() to service_role;

commit;
