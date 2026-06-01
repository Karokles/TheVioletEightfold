# No-Budget Production-Prep Mode

This app is now structured so local development can run without paid API, database, storage, or payment usage. Real providers remain server-side and can be enabled later with explicit environment flags and credentials.

## Runtime Modes

- `APP_ENV=local`: working without budget now. AI is mocked, database writes are disabled, payment checks are mocked, and no real API key is required.
- `APP_ENV=staging`: mocked safely by default. Enable real services one at a time with test credentials.
- `APP_ENV=production`: requires paid service later for real AI/database/payment. Missing credentials fail safely through disabled/mock service responses instead of crashing the whole server.

## Feature Flags

- `AI_PROVIDER_ENABLED`: enables real OpenAI calls only when `OPENAI_API_KEY` is also present.
- `DATABASE_ENABLED`: enables Supabase only when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are also present.
- `PAYMENT_ENABLED`: keeps payment checks server-side; currently blocked until credentials/budget exist.
- `AUTH_STRICT_MODE`: requires `JWT_SECRET` when true; local mode can run with a development-only fallback.
- `USAGE_LIMITS_ENABLED`: enforces in-memory weekly limits in no-budget mode.

## Feature Status

- Login with preconfigured local users: working without budget now.
- Frontend routes and local UI state: working without budget now.
- Direct archetype chat: mocked safely when AI is disabled; requires paid service later for real AI.
- Council sessions: mocked safely when AI is disabled; requires paid service later for real AI.
- Meaning analysis / quest extraction: mocked safely with empty structured results; requires paid service later for real AI extraction.
- Supabase persistence: working without budget now as disabled no-op; requires paid service later for durable multi-device storage.
- Payment/paywall entitlement checks: mocked safely via `/api/payment/status`; blocked until credentials/budget exist.
- Usage limits: working without budget now with in-memory counters; requires database later for production-grade enforcement.
- Strict auth: working without budget now when disabled locally; blocked until `JWT_SECRET` exists when `AUTH_STRICT_MODE=true`.

## Safe Connection Path

1. Local: keep all paid feature flags false.
2. Staging: set `APP_ENV=staging`, add test credentials, enable one flag at a time.
3. Production: set `APP_ENV=production`, `AUTH_STRICT_MODE=true`, add `JWT_SECRET`, then enable AI/database/payment only after budget and provider credentials are ready.
