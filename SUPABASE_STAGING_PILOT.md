# Supabase Staging Pilot

This document records the current database pilot for The Violet Eightfold. The goal is to test durable persistence safely in staging while local development and production remain no-budget safe.

## Environment Split

| Environment | Database state | Purpose |
| --- | --- | --- |
| Local | Disabled by default with `DATABASE_ENABLED=false` | Build, run, and smoke-test without paid services or credentials. |
| Staging | Enabled only through Render environment variables | Test real Supabase writes with mock AI and no payment provider. |
| Production | Disabled until explicitly prepared | Keep launch surface stable while the staging schema is still being validated. |

The frontend does not talk directly to Supabase. All database writes go through the backend so service role credentials stay server-side.

## Current Staging Project

- Project: `the-violet-eightfold-staging`
- URL: `https://xoniejusrizilmgptugs.supabase.co`
- Provider usage: Supabase Free staging pilot
- Auth provider: not enabled yet
- Storage: not enabled yet
- Edge Functions: not enabled yet

Required Render staging variables:

- `APP_ENV=staging`
- `DATABASE_ENABLED=true`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AI_PROVIDER_ENABLED=false`
- `PAYMENT_ENABLED=false`
- `LOCAL_AUTH_ENABLED=true`
- `AUTH_STRICT_MODE=false`
- `USAGE_LIMITS_ENABLED=true`

## Tables

| Table | Current status | Notes |
| --- | --- | --- |
| `users` | Working in staging | Upserted on local test-user login. |
| `user_profiles` | Prepared | Intended for durable profile preferences and archetype state. |
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

Login writes or updates one row in `users`.

`POST /api/council` writes:

- one `council_sessions` row
- one or more `council_messages` rows
- one `lore_entries` row

These writes are best effort. If Supabase is disabled or unavailable, the endpoint still returns the mock response instead of crashing the app.

## Safety Rules

- No frontend route may require Supabase credentials.
- `SUPABASE_SERVICE_ROLE_KEY` belongs only in backend provider settings such as Render, never in Vercel or frontend `.env` files.
- AI remains mocked unless `AI_PROVIDER_ENABLED=true` and a real API key exists.
- Payment remains disabled unless `PAYMENT_ENABLED=true` and a real payment adapter exists.
- Production database stays disabled until schema, RLS, auth, export, and deletion behavior are reviewed.

## Manual Staging Test

1. Deploy the `staging` branch to Render and Vercel.
2. Open the staging frontend.
3. Log in with the staging test user.
4. Send one council or direct archetype message.
5. In Supabase Table Editor, check:
   - `users` contains the user id.
   - `council_sessions` contains a new session.
   - `council_messages` contains the individual message rows.
   - `lore_entries` contains the exchange summary.

## Next Steps

1. Add durable `user_profiles` reads and writes.
2. Decide whether existing local UI state should migrate into staging persistence gradually or stay local until auth is hardened.
3. Add export/delete service interfaces before production data collection.
4. Add audit events for login, council writes, export requests, and deletion requests.
5. Review RLS policies before any browser-side Supabase access is introduced.
