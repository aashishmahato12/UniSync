-- Run after 004_college_attachments.sql. Text stays in the owner-only table.
alter table public.college_attachments
  add column if not exists extracted_text text,
  add column if not exists extraction_status text not null default 'Pending'
    check (extraction_status in ('Pending', 'Ready', 'No text')),
  add column if not exists extracted_at timestamptz;

create index if not exists college_attachments_extraction_idx
  on public.college_attachments (extraction_status, received_at desc);
