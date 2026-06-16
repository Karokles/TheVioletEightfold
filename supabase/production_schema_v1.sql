-- The Violet Eightfold / Lazarus Engine - Production schema v1
-- Run this once in the Supabase SQL Editor for the PRODUCTION project.
--
-- The browser uses Supabase Auth only. App data is accessed through the
-- Render backend with the Supabase service-role key. RLS is enabled so the
-- anon/publishable key cannot read or write app data directly.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.users (
  id text primary key,
  username text not null,
  secret_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_users_username_lower
  on public.users (lower(username));

create table if not exists public.user_profiles (
  user_id text primary key references public.users(id) on delete cascade,
  display_name text,
  language text default 'EN',
  active_archetype text,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_language_check check (language is null or language in ('EN', 'DE'))
);

create index if not exists idx_user_profiles_user_id
  on public.user_profiles(user_id);

create table if not exists public.user_access (
  user_id text primary key references public.users(id) on delete cascade,
  tier text not null default 'free',
  active_until timestamptz,
  beta_activations integer not null default 0,
  beta_bonus_used boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_access_tier_check check (tier in ('free', 'paid_beta', 'founder', 'blocked')),
  constraint user_access_beta_activations_check check (beta_activations >= 0)
);

create index if not exists idx_user_access_tier
  on public.user_access(tier);

create table if not exists public.usage_counters (
  user_id text not null references public.users(id) on delete cascade,
  period_key text not null,
  feature text not null,
  count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, period_key, feature),
  constraint usage_counters_count_check check (count >= 0),
  constraint usage_counters_feature_check check (
    feature in (
      'single_voice_reply',
      'council_session',
      'blueprint_save',
      'cycle_day_6'
    )
  )
);

create index if not exists idx_usage_counters_period
  on public.usage_counters(period_key);

create table if not exists public.council_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  mode text not null,
  topic text,
  messages jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint council_sessions_mode_check check (mode in ('direct', 'council'))
);

create index if not exists idx_council_sessions_user_created
  on public.council_sessions(user_id, created_at desc);

create table if not exists public.council_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.council_sessions(id) on delete cascade,
  user_id text not null references public.users(id) on delete cascade,
  "role" text not null,
  archetype_id text,
  content text not null,
  sequence_index integer not null default 0,
  token_count integer,
  provider text,
  created_at timestamptz not null default now(),
  constraint council_messages_role_check check ("role" in ('user', 'assistant', 'system', 'model')),
  constraint council_messages_provider_check check (
    provider is null or provider in ('mock', 'real', 'disabled', 'planned')
  )
);

create index if not exists idx_council_messages_session_sequence
  on public.council_messages(session_id, sequence_index);

create index if not exists idx_council_messages_user_created
  on public.council_messages(user_id, created_at desc);

create table if not exists public.lore_entries (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  type text not null,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint lore_entries_type_check check (type in ('direct', 'council', 'thoughtchamber', 'integration'))
);

create index if not exists idx_lore_entries_user_created
  on public.lore_entries(user_id, created_at desc);

create table if not exists public.questlog_entries (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  title text not null,
  content text not null,
  tags text[] not null default '{}',
  related_archetypes text[] not null default '{}',
  source_session_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_questlog_entries_user_created
  on public.questlog_entries(user_id, created_at desc);

create table if not exists public.soul_timeline_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  label text not null,
  summary text not null,
  intensity integer,
  type text not null default 'EVENT',
  tags text[] not null default '{}',
  source_session_id text,
  created_at timestamptz not null default now(),
  constraint soul_timeline_events_intensity_check check (intensity is null or (intensity >= 1 and intensity <= 10))
);

create index if not exists idx_soul_timeline_events_user_created
  on public.soul_timeline_events(user_id, created_at desc);

create table if not exists public.breakthroughs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  title text not null,
  insight text not null,
  "trigger" text,
  action text,
  tags text[] not null default '{}',
  source_session_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_breakthroughs_user_created
  on public.breakthroughs(user_id, created_at desc);

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
  before update on public.users
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
create trigger set_user_profiles_updated_at
  before update on public.user_profiles
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_user_access_updated_at on public.user_access;
create trigger set_user_access_updated_at
  before update on public.user_access
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_usage_counters_updated_at on public.usage_counters;
create trigger set_usage_counters_updated_at
  before update on public.usage_counters
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_council_sessions_updated_at on public.council_sessions;
create trigger set_council_sessions_updated_at
  before update on public.council_sessions
  for each row
  execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.user_profiles enable row level security;
alter table public.user_access enable row level security;
alter table public.usage_counters enable row level security;
alter table public.council_sessions enable row level security;
alter table public.council_messages enable row level security;
alter table public.lore_entries enable row level security;
alter table public.questlog_entries enable row level security;
alter table public.soul_timeline_events enable row level security;
alter table public.breakthroughs enable row level security;

select
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'users',
    'user_profiles',
    'user_access',
    'usage_counters',
    'council_sessions',
    'council_messages',
    'lore_entries',
    'questlog_entries',
    'soul_timeline_events',
    'breakthroughs'
  )
order by table_name, ordinal_position;
