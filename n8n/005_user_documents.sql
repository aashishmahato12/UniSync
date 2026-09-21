-- Private documents uploaded directly by each UniSync user.
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('user-documents', 'user-documents', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.user_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null check (char_length(file_name) between 1 and 180),
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  storage_path text not null unique,
  category text not null check (category in ('Academic', 'Finance', 'Campus', 'General')),
  created_at timestamptz not null default now()
);

create index if not exists user_documents_owner_created_idx
  on public.user_documents (user_id, created_at desc);

alter table public.user_documents enable row level security;
grant select, insert, delete on table public.user_documents to authenticated;

drop policy if exists users_read_own_documents on public.user_documents;
create policy users_read_own_documents on public.user_documents
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists users_add_own_documents on public.user_documents;
create policy users_add_own_documents on public.user_documents
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists users_delete_own_documents on public.user_documents;
create policy users_delete_own_documents on public.user_documents
  for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists users_upload_own_document_files on storage.objects;
create policy users_upload_own_document_files on storage.objects
  for insert to authenticated with check (
    bucket_id = 'user-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists users_read_own_document_files on storage.objects;
create policy users_read_own_document_files on storage.objects
  for select to authenticated using (
    bucket_id = 'user-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists users_delete_own_document_files on storage.objects;
create policy users_delete_own_document_files on storage.objects
  for delete to authenticated using (
    bucket_id = 'user-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

commit;
