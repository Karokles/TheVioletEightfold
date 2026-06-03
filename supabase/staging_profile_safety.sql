-- The Violet Eightfold - Supabase staging profile and RLS safety baseline
-- Run this in the Supabase SQL editor for the STAGING project only.
-- This script keeps app data server-side: the frontend uses Supabase Auth,
-- while application data reads/writes continue through the backend service role.

-- 1. Ensure the profile table has the columns the backend expects.
create table if not exists public.user_profiles (
  user_id text primary key,
  display_name text,
  language text,
  active_archetype text,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles
  add column if not exists display_name text,
  add column if not exists language text,
  add column if not exists active_archetype text,
  add column if not exists preferences jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_profiles_language_check'
      and conrelid = 'public.user_profiles'::regclass
  ) then
    alter table public.user_profiles
      add constraint user_profiles_language_check
      check (language is null or language in ('EN', 'DE'));
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'users'
  ) and not exists (
    select 1
    from pg_constraint
    where conname = 'user_profiles_user_id_fkey'
      and conrelid = 'public.user_profiles'::regclass
  ) then
    alter table public.user_profiles
      add constraint user_profiles_user_id_fkey
      foreign key (user_id) references public.users(id) on delete cascade;
  end if;
end $$;

create index if not exists idx_user_profiles_user_id
  on public.user_profiles(user_id);

-- 2. Keep updated_at current for profile updates.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;

create trigger set_user_profiles_updated_at
  before update on public.user_profiles
  for each row
  execute function public.set_updated_at();

-- 3. Enable RLS on user-owned app data tables.
-- RLS protects tables from browser/public access. The backend service role can
-- still read/write for the app, which is the desired staging mode right now.
alter table if exists public.users enable row level security;
alter table if exists public.user_profiles enable row level security;
alter table if exists public.council_sessions enable row level security;
alter table if exists public.council_messages enable row level security;
alter table if exists public.lore_entries enable row level security;
alter table if exists public.questlog_entries enable row level security;
alter table if exists public.soul_timeline_events enable row level security;
alter table if exists public.breakthroughs enable row level security;
alter table if exists public.audit_events enable row level security;
alter table if exists public.data_export_requests enable row level security;
alter table if exists public.data_deletion_requests enable row level security;

-- 4. Inspection queries for manual verification.
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'users',
    'user_profiles',
    'council_sessions',
    'council_messages',
    'lore_entries',
    'questlog_entries',
    'soul_timeline_events',
    'breakthroughs',
    'audit_events',
    'data_export_requests',
    'data_deletion_requests'
  )
order by tablename;

select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'user_profiles'
order by ordinal_position;

select
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 5. Future optional browser-side profile policies.
-- Keep these disabled while the app uses backend-only data access. If we later
-- let the frontend read/write profile rows directly, review first and then add
-- narrow policies like these:
--
-- create policy "user_profiles_select_own"
--   on public.user_profiles
--   for select
--   to authenticated
--   using (auth.uid()::text = user_id);
--
-- create policy "user_profiles_update_own"
--   on public.user_profiles
--   for update
--   to authenticated
--   using (auth.uid()::text = user_id)
--   with check (auth.uid()::text = user_id);
