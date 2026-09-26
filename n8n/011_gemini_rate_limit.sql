-- Shared rolling limit for the Gemini calls made by mail extraction and AI chat.
-- Keep below a 15 RPM project quota so other Gemini workflows have headroom.
begin;

create table if not exists public.gemini_rate_slots (
  id bigint generated always as identity primary key,
  called_at timestamptz not null default now()
);
create index if not exists gemini_rate_slots_called_at_idx
  on public.gemini_rate_slots (called_at);
alter table public.gemini_rate_slots enable row level security;
revoke all on table public.gemini_rate_slots from public, anon, authenticated;

create or replace function public.claim_gemini_rate_slot()
returns boolean language plpgsql security definer set search_path = '' as $fn$
declare
  now_at timestamptz;
  recent_count integer;
begin
  -- Serialize claims from concurrent serverless requests before counting.
  perform pg_catalog.pg_advisory_xact_lock(62348190371);
  now_at := pg_catalog.clock_timestamp();
  delete from public.gemini_rate_slots where called_at <= now_at - interval '60 seconds';
  select count(*) into recent_count from public.gemini_rate_slots;
  if recent_count >= 12 then return false; end if;
  insert into public.gemini_rate_slots (called_at) values (now_at);
  return true;
end;
$fn$;
revoke all on function public.claim_gemini_rate_slot() from public, anon, authenticated;
grant execute on function public.claim_gemini_rate_slot() to service_role;

commit;
