# Supabase Staging Pilot

This document records the current database pilot for The Violet Eightfold. The goal is to test durable persistence safely in staging while local development and production remain no-budget safe.

## Environment Split

| Environment | Database state | Purpose |
| --- | --- | --- |
| Local | Disabled by default with `DATABASE_ENABLED=false` | Build, run, and smoke-test without paid services or credentials. |
| Staging | Enabled only through Render environment variables | Test real Supabase writes with mock AI and no payment provider. |
| Production | Disabled until explicitly prepared | Keep launch surface stable while the staging schema is still being validated. |

The frontend may talk directly to Supabase Auth using the publishable key. All app data writes still go through the backend so service role credentials stay server-side.

## Current Staging Project

- Project: `the-violet-eightfold-staging`
- URL: `https://xoniejusrizilmgptugs.supabase.co`
- Provider usage: Supabase Free staging pilot
- Auth provider: Supabase Auth prepared for staging email/password testing
- Storage: not enabled yet
- Edge Functions: not enabled yet

Required Render staging variables:

- `APP_ENV=staging`
- `DATABASE_ENABLED=true`
- `SUPABASE_AUTH_ENABLED=true` or unset in staging, where it defaults to enabled when Supabase credentials exist
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AI_PROVIDER_ENABLED=false`
- `PAYMENT_ENABLED=false`
- `LOCAL_AUTH_ENABLED=true`
- `AUTH_STRICT_MODE=false`
- `USAGE_LIMITS_ENABLED=true`
- `FOUNDER_ACCESS_IDENTIFIERS` for accounts that should bypass usage caps, e.g. `lionceau*`
- `OFFLINE_ONLY_IDENTIFIERS` for personal accounts that should keep sensitive app state local and skip database persistence, e.g. `lionceau*`

Required Vercel staging variables:

- `VITE_API_BASE_URL`
- `VITE_AUTH_MODE=supabase`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Tables

| Table | Current status | Notes |
| --- | --- | --- |
| `users` | Working in staging | Upserted on local test-user login. |
| `user_profiles` | Working in staging | Stores display name, language, active archetype, and profile preferences. |
| `council_sessions` | Working in staging | Stores one container row per council or direct chat exchange. |
| `council_messages` | Working in staging | Stores individual message rows linked to a session. |
| `lore_entries` | Working in staging | Stores summarized structured content for later retrieval. |
| `questlog_entries` | Prepared | Backend adapter exists, broader UI persistence still needs review. |
| `soul_timeline_events` | Prepared | Backend adapter exists, broader UI persistence still needs review. |
| `breakthroughs` | Prepared | Backend adapter exists, broader UI persistence still needs review. |
| `audit_events` | Prepared | Needed for security, data access, and DSGVO traceability later. |
| `data_export_requests` | Prepared | Needed for DSGVO export workflow later. |
| `data_deletion_requests` | Prepared | Needed for DSGVO deletion workflow later. |

## What Writes Today

Local test-user login writes or updates one row in `users`.

Supabase Auth sign-in creates or updates the matching `users` row through the backend when a protected API route is called.

`GET /api/profile` and `PUT /api/profile` read and update the authenticated user's `user_profiles` row.

Accounts matched by `OFFLINE_ONLY_IDENTIFIERS` do not write app data to Supabase. Their lore, cycle, blueprint, communication preferences, and meaning state stay browser-local. The backend still authenticates the request and returns safe responses, but skips profile, council, lore, and meaning persistence.

`POST /api/council` writes:

- one `council_sessions` row
- one or more `council_messages` rows
- one `lore_entries` row

These writes are best effort. If Supabase is disabled or unavailable, the endpoint still returns the mock response instead of crashing the app.

## Safety Rules

- Frontend Supabase Auth may use only the publishable key.
- `SUPABASE_SERVICE_ROLE_KEY` belongs only in backend provider settings such as Render, never in Vercel or frontend `.env` files.
- AI remains mocked unless `AI_PROVIDER_ENABLED=true` and a real API key exists.
- Payment remains disabled unless `PAYMENT_ENABLED=true` and a real payment adapter exists.
- Production database stays disabled until schema, RLS, auth, export, and deletion behavior are reviewed.

## Manual Staging Test

1. Deploy the `staging` branch to Render and Vercel.
2. Open the staging frontend.
3. Create a staging account with email and password.
4. Confirm the email address.
5. Sign in with the confirmed account.
6. Send one council or direct archetype message.
7. In Supabase Table Editor, check:
   - `auth.users` contains the confirmed user.
   - `users` contains the Supabase user id.
   - `user_profiles` contains the display name.
   - `council_sessions` contains a new session.
   - `council_messages` contains the individual message rows.
   - `lore_entries` contains the exchange summary.

Fallback test:

3. Log in with the staging test user while `LOCAL_AUTH_ENABLED=true`.
4. Send one council or direct archetype message.
5. In Supabase Table Editor, check:
   - `users` contains the user id.
   - `council_sessions` contains a new session.
   - `council_messages` contains the individual message rows.
   - `lore_entries` contains the exchange summary.

## Next Steps

1. Decide whether existing local UI state should migrate into staging persistence gradually or stay local until auth is hardened.
2. Add export/delete service interfaces before production data collection.
3. Add audit events for login, council writes, profile updates, export requests, and deletion requests.
4. Review RLS policies before any browser-side Supabase data access is introduced.
5. Optionally disable `LOCAL_AUTH_ENABLED` on staging after Supabase Auth is verified.
