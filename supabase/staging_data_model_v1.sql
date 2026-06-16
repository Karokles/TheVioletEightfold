-- The Violet Eightfold - Staging data model v1 normalization
-- Run this in the Supabase SQL editor for the STAGING project only.
-- This migration keeps old profile columns intact and backfills canonical fields.

-- Canonical profile fields used by the current app/backend:
-- - display_name
-- - language
-- - active_archetype
-- - preferences
--
-- Legacy/older staging fields kept for now:
-- - public_name
-- - timezone
-- - onboarding_completed
-- - archetype_preference
-- - settings

-- 1. Backfill canonical fields from older fields where possible.
update public.user_profiles
set
  display_name = coalesce(nullif(display_name, ''), nullif(public_name, '')),
  active_archetype = coalesce(nullif(active_archetype, ''), nullif(archetype_preference, '')),
  preferences = case
    when preferences is null or preferences = '{}'::jsonb then coalesce(settings, '{}'::jsonb)
    else preferences
  end,
  updated_at = now()
where
  (display_name is null or display_name = '')
  or (active_archetype is null or active_archetype = '')
  or preferences is null
  or preferences = '{}'::jsonb;

-- 2. Keep defaults aligned with the canonical app fields.
alter table public.user_profiles
  alter column preferences set default '{}'::jsonb,
  alter column preferences set not null,
  alter column language set default 'EN';

-- 3. Ensure language stays inside the current app language set.
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

-- 4. Verification: profile rows and canonical/legacy field comparison.
select
  user_id,
  display_name,
  public_name,
  language,
  active_archetype,
  archetype_preference,
  preferences,
  settings,
  updated_at
from public.user_profiles
order by updated_at desc
limit 42;

-- 5. Verification: current profile schema.
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'user_profiles'
order by ordinal_position;
