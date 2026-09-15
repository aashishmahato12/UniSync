-- Run once after 001_college_core.sql.
-- Stores the plain-text email body so the owner can read it inside UniSync.
alter table public.college_notices
  add column if not exists body_text text;

comment on column public.college_notices.body_text is
  'Plain-text body from the original Herald College email, capped by the n8n intake workflow.';
