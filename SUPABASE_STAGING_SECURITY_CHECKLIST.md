# Supabase Staging Security Checklist

This checklist describes the current safe staging shape for Supabase Auth, profile data, and app data persistence. It is not a production launch approval; it is the next controlled step before deeper data model work.

## Current Goal

Staging should allow real email/password authentication and real database writes without changing production. Local development remains no-budget safe, and production remains unchanged until explicitly promoted.

## Key Concepts

**RLS / Row Level Security**

RLS is a PostgreSQL security feature that controls row access inside the database. For this app, RLS should be enabled early so a future frontend mistake does not accidentally expose all user data.

**Service-role-only app data**

The frontend may use Supabase Auth with the publishable key, but app data should still go through the backend. The backend uses the Supabase service role on Render, which keeps sensitive database access server-side.

**Policies**

Policies are the actual RLS rules, for example "a logged-in user may read only their own profile row." We are not enabling browser-side app-data policies yet because the current architecture does not need direct frontend database reads.

## Staging Setup Status

| Area | Current target | Why it matters |
| --- | --- | --- |
| Supabase Auth | Enabled on staging | Allows real email/password accounts while production remains stable. |
| Local test users | Still allowed on staging for fallback, optional to disable later | Useful while auth and persistence are still being tested. |
| App data writes | Backend only | Keeps service role secret out of Vercel and browser code. |
| RLS | Enabled on app data tables | Prevents accidental public table access if frontend keys are misused. |
| Browser table access | Disabled/not used | Reduces DSGVO and security risk during early development. |
| AI | Mocked/disabled | Avoids real API cost and user-data transfer to paid AI services. |
| Payment | Disabled | No payment provider data or cost surface yet. |

## SQL To Run

Run [supabase/staging_profile_safety.sql](supabase/staging_profile_safety.sql) in the Supabase SQL editor for the staging project only.

This script checks and prepares `user_profiles`, enables RLS on the current app-data tables, and prints inspection queries at the end. It does not enable production, payment, storage, or real AI.

## Manual Verification

1. Confirm Supabase project is the staging project.
2. Run the SQL script once in the SQL editor.
3. Check that every listed public table returns `rowsecurity = true`.
4. Check that `user_profiles` has `user_id`, `display_name`, `language`, `active_archetype`, `preferences`, `created_at`, and `updated_at`.
5. Sign in on the staging frontend.
6. Open Soul Blueprint and confirm the display name still appears.
7. Send one council/direct message and confirm the app does not crash.
8. Check Supabase tables for the expected user-owned rows.

## Tables Covered

| Table | Purpose | Current access strategy |
| --- | --- | --- |
| `users` | Internal app user record | Backend service role only. |
| `user_profiles` | Display name, language, active archetype, preferences | Backend service role only. |
| `council_sessions` | Chat/session container rows | Backend service role only. |
| `council_messages` | Individual user/assistant/system messages | Backend service role only. |
| `lore_entries` | Structured memory/lore summaries | Backend service role only. |
| `questlog_entries` | Quest Log state from meaning analysis | Backend service role only. |
| `soul_timeline_events` | Soul Blueprint timeline state | Backend service role only. |
| `breakthroughs` | Breakthrough state from meaning analysis | Backend service role only. |
| `audit_events` | Future security and DSGVO audit trail | Backend service role only. |
| `data_export_requests` | Future DSGVO export workflow | Backend service role only. |
| `data_deletion_requests` | Future DSGVO deletion workflow | Backend service role only. |

## Known Limitations

- Supabase Auth users live in `auth.users`, while app profile data lives in `public.user_profiles`.
- Direct browser-side profile editing is not enabled yet.
- Export/delete workflows are structurally prepared but not implemented as user-facing flows.
- We still need a proper production migration plan before using Supabase production data.

## Recommended Next Step

After the SQL check passes, implement a small data model v1 migration plan:

1. Define canonical schema for users, profiles, sessions, messages, lore, questlog, timeline, and breakthroughs.
2. Add backend repository interfaces so Supabase and mock/local adapters are cleanly separated.
3. Add audit event writes for profile update, login success, council write, export request, and deletion request.
4. Add DSGVO export/delete service endpoints behind auth.
5. Only after that, decide whether local test login should be disabled on staging.
