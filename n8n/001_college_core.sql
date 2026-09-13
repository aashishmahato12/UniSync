-- Run once in the Supabase SQL Editor before activating the n8n workflow.
-- The browser has no direct access until authentication and RLS policies are added.

create extension if not exists pgcrypto;

create table if not exists public.college_notices (
  id uuid primary key default gen_random_uuid(),
  gmail_message_id text not null unique,
  gmail_thread_id text,
  subject text not null,
  sender text not null,
  received_at timestamptz,
  summary text not null,
  category text not null default 'General'
    check (category in ('Payments','Exams','Academics','Campus life','General')),
  priority text not null default 'Normal'
    check (priority in ('High','Normal')),
  attachment_names jsonb not null default '[]'::jsonb,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.college_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  gmail_message_id text not null references public.college_notices(gmail_message_id) on delete cascade,
  title text not null,
  event_date date not null,
  start_time time,
  end_time time,
  location text,
  category text not null default 'College event'
    check (category in ('Exam','Deadline','College event','Holiday')),
  description text not null default '',
  calendar_state text not null default 'Pending'
    check (calendar_state in ('Pending','Added','Ignored')),
  google_calendar_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists college_events_date_idx on public.college_events(event_date);
create index if not exists college_notices_received_idx on public.college_notices(received_at desc);

alter table public.college_notices enable row level security;
alter table public.college_events enable row level security;

-- No anon/authenticated policies yet. The n8n Supabase secret key can write;
-- the public web app cannot read private college mail until user auth is added.
