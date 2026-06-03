# Data Model V1 Plan

This document defines the first canonical data model direction for The Violet Eightfold staging database. It keeps current staging data intact and avoids production changes.

## Goal

Create one clear source of truth for profile, soul, quest, council, and lore data before larger product features are built. The immediate focus is staging safety and consistency, not a full production migration.

## Canonical Profile Fields

Canonical fields are the official fields the app should read and write going forward. Older fields can remain temporarily, but they should not become new product dependencies.

| Canonical field | Current purpose | Legacy/related field |
| --- | --- | --- |
| `user_id` | Links the app profile to the app user/auth user | None |
| `display_name` | Name shown in the app UI, for example in Soul Blueprint | `public_name` |
| `language` | User interface/profile language | None |
| `active_archetype` | Current selected archetype focus | `archetype_preference` |
| `preferences` | Flexible JSON profile settings | `settings` |
| `created_at` | Creation timestamp | None |
| `updated_at` | Last profile update timestamp | None |

## Legacy Fields To Keep For Now

`public_name`, `timezone`, `onboarding_completed`, `archetype_preference`, and `settings` can stay in staging for now. They should not be deleted until the app has a full migration and backup plan.

Keeping them avoids breaking existing test data. Later, once the app only uses canonical fields, they can be deprecated or folded into `preferences`.

## App Data Areas

| Area | Canonical table | Current status |
| --- | --- | --- |
| Auth/app user | `users` plus Supabase `auth.users` | Working on staging |
| Profile | `user_profiles` | Working, needs normalization |
| Council sessions | `council_sessions` | Working |
| Council messages | `council_messages` | Working |
| Lore/memory | `lore_entries` | Working |
| Quest Log | `questlog_entries` | Prepared/partly persisted |
| Soul Blueprint timeline | `soul_timeline_events` | Prepared/partly persisted |
| Breakthroughs | `breakthroughs` | Prepared/partly persisted |
| DSGVO export | `data_export_requests` | Prepared table |
| DSGVO deletion | `data_deletion_requests` | Prepared table |
| Audit trail | `audit_events` | Prepared table |

## Staging Migration

Run [supabase/staging_data_model_v1.sql](supabase/staging_data_model_v1.sql) after the RLS safety baseline has passed.

This SQL file backfills canonical profile fields from legacy fields without deleting anything. It also prints verification output so we can confirm the profile rows and schema afterward.

## Why Not Delete Legacy Columns Yet

Deleting columns is easy to do and annoying to recover from. For staging, it is better to first establish which fields the app truly uses, then migrate values, then observe the app for a few sessions.

## Recommended Implementation Order

1. Run `staging_profile_safety.sql`.
2. Run `staging_data_model_v1.sql`.
3. Test login on staging.
4. Check Soul Blueprint display name.
5. Send one direct/council message.
6. Verify `user_profiles`, `council_sessions`, `council_messages`, and `lore_entries`.
7. Only then decide whether to disable local test login on staging.

## Next Code Phase

The next code phase should introduce repository interfaces for app data. A repository is a small backend layer that says "save profile" or "load questlog" without the rest of the server knowing whether the data comes from Supabase, local mock storage, or a disabled no-budget adapter.

This matters because it keeps local, staging, and production behavior separate. Local can remain free and mocked, staging can use Supabase, and production can be connected later without rewriting the whole app.
