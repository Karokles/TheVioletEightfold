# Environment Matrix

Use this as the source of truth for local, staging, and production.

## Local

- Branch: any local branch
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- Frontend env:
  - `VITE_APP_ENV=local`
  - `VITE_API_BASE_URL=http://localhost:3001`
  - `VITE_AUTH_MODE=local` for offline/dev, or `supabase` only when deliberately testing real auth
- Backend env:
  - `APP_ENV=local`
  - `NODE_ENV=development`
  - `DATABASE_ENABLED=false`
  - `PAYMENT_ENABLED=false`
  - `SUPABASE_AUTH_ENABLED=false`
  - `LOCAL_AUTH_ENABLED=true`

## Staging

- Branch: `staging`
- Frontend: Vercel Preview URL only
- Backend: `https://thevioleteightfold-stage-24.onrender.com`
- Supabase: staging project
- Stripe: test mode
- Frontend env in Vercel Preview:
  - `VITE_APP_ENV=staging`
  - `VITE_API_BASE_URL=https://thevioleteightfold-stage-24.onrender.com`
  - `VITE_AUTH_MODE=supabase`
  - `VITE_SUPABASE_URL=<staging-supabase-url>`
  - `VITE_SUPABASE_PUBLISHABLE_KEY=<staging-publishable-key>`
- Backend env on Render staging:
  - `APP_ENV=staging`
  - `NODE_ENV=production`
  - `DATABASE_ENABLED=true`
  - `PAYMENT_ENABLED=true`
  - `SUPABASE_AUTH_ENABLED=true`
  - `AUTH_STRICT_MODE=true`
  - `USAGE_LIMITS_ENABLED=true`
  - `DEBUG_ENDPOINTS_ENABLED=true`
  - `LOCAL_AUTH_ENABLED=false`
  - `SUPABASE_URL=<staging-supabase-url>`
  - `SUPABASE_SERVICE_ROLE_KEY=<staging-service-role-key>`
  - `STRIPE_SECRET_KEY=sk_test_...`
  - `STRIPE_WEBHOOK_SECRET=whsec_...`
  - `FRONTEND_APP_URL=<vercel-staging-preview-url>`
  - `ALLOWED_ORIGINS=<vercel-staging-preview-url>`

## Production

- Branch: `main`
- Frontend: `https://app.lazarus-engine.eu`
- Backend: `https://api.lazarus-engine.eu`
- Supabase: production project
- Stripe: live mode when payments are public
- Frontend env in Vercel Production:
  - `VITE_APP_ENV=production`
  - `VITE_API_BASE_URL=https://api.lazarus-engine.eu`
  - `VITE_AUTH_MODE=supabase`
  - `VITE_SUPABASE_URL=<production-supabase-url>`
  - `VITE_SUPABASE_PUBLISHABLE_KEY=<production-publishable-key>`
- Backend env on Render production:
  - `APP_ENV=production`
  - `NODE_ENV=production`
  - `AI_PROVIDER_ENABLED=true`
  - `DATABASE_ENABLED=true`
  - `PAYMENT_ENABLED=true`
  - `SUPABASE_AUTH_ENABLED=true`
  - `AUTH_STRICT_MODE=true`
  - `USAGE_LIMITS_ENABLED=true`
  - `DEBUG_ENDPOINTS_ENABLED=false`
  - `LOCAL_AUTH_ENABLED=false`
  - `SUPABASE_URL=<production-supabase-url>`
  - `SUPABASE_SERVICE_ROLE_KEY=<production-service-role-key>`
  - `ADMIN_IDENTIFIERS=lionceaunicolai@yahoo.de`
  - `FOUNDER_ACCESS_IDENTIFIERS=lionceaunicolai@yahoo.de`
  - `FRONTEND_APP_URL=https://app.lazarus-engine.eu`
  - `ALLOWED_ORIGINS=https://app.lazarus-engine.eu,https://the-violet-eightfold42.vercel.app,https://the-violet-eightfold-git-main-the-violet-eightfolds-projects.vercel.app`
  - `STRIPE_SECRET_KEY=sk_live_...`
  - `STRIPE_WEBHOOK_SECRET=whsec_...`
  - `STRIPE_BETA_PRICE_ID=price_...`

## DNS

- `app.lazarus-engine.eu` CNAME -> Vercel production domain.
- `api.lazarus-engine.eu` CNAME -> `thevioleteightfold-4224.onrender.com`.
- Staging should not use a public custom domain unless we intentionally add one.

## Verification

After changing env vars or DNS:

1. Redeploy Render production.
2. Redeploy Vercel production from `main`.
3. Confirm `https://api.lazarus-engine.eu/api/health` returns `200`.
4. Confirm the production frontend bundle contains `https://api.lazarus-engine.eu` and the production Supabase URL, not the staging API or staging Supabase URL.
