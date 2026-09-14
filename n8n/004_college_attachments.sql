-- Private Herald College email attachments. Apply after 002_single_owner_access.sql.
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('college-attachments', 'college-attachments', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.college_attachments (
  id uuid primary key default gen_random_uuid(),
  gmail_message_id text not null,
  attachment_index integer not null check (attachment_index between 0 and 49),
  file_name text not null check (char_length(file_name) between 1 and 180),
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  size_bytes bigint check (size_bytes is null or (size_bytes > 0 and size_bytes <= 10485760)),
  storage_path text not null unique,
  sender text not null,
  subject text not null,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  unique (gmail_message_id, attachment_index)
);

create index if not exists college_attachments_received_idx
  on public.college_attachments (received_at desc);

alter table public.college_attachments enable row level security;
revoke all on table public.college_attachments from public, anon, authenticated;
grant select on table public.college_attachments to authenticated;

drop policy if exists owner_reads_college_attachments on public.college_attachments;
create policy owner_reads_college_attachments on public.college_attachments
  for select to authenticated
  using (exists (
    select 1 from public.app_users
    where email = (select auth.jwt() ->> 'email')
  ));

drop policy if exists owner_opens_college_attachments on storage.objects;
create policy owner_opens_college_attachments on storage.objects
  for select to authenticated
  using (
    bucket_id = 'college-attachments'
    and exists (
      select 1 from public.app_users
      where email = (select auth.jwt() ->> 'email')
    )
  );

commit;
