-- The Violet Eightfold - Staging access and usage model v1
-- Run this in the Supabase SQL editor for the STAGING project.
-- Frontend must not receive service role credentials; app data writes stay backend-only.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.user_access (
  user_id text primary key,
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
    where conname = 'user_access_user_id_fkey'
      and conrelid = 'public.user_access'::regclass
  ) then
    alter table public.user_access
      add constraint user_access_user_id_fkey
      foreign key (user_id) references public.users(id) on delete cascade;
  end if;
end $$;

create table if not exists public.usage_counters (
  user_id text not null,
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
    where conname = 'usage_counters_user_id_fkey'
      and conrelid = 'public.usage_counters'::regclass
  ) then
    alter table public.usage_counters
      add constraint usage_counters_user_id_fkey
      foreign key (user_id) references public.users(id) on delete cascade;
  end if;
end $$;

create index if not exists idx_usage_counters_period
  on public.usage_counters(period_key);

create index if not exists idx_user_access_tier
  on public.user_access(tier);

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

alter table if exists public.user_access enable row level security;
alter table if exists public.usage_counters enable row level security;

select
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('user_access', 'usage_counters')
order by table_name, ordinal_position;
