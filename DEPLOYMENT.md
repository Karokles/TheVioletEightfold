# Deployment Guide

**Repository:** Karokles/TheVioletEightfold  
**Frontend:** Vercel  
**Backend:** Render  
**Database:** Supabase Postgres

---

## Environment Variables

### Render (Backend)

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | ✅ Yes | Set to `production` |
| `JWT_SECRET` | ✅ Yes | Random secure string (min 32 chars) for JWT signing |
| `OPENAI_API_KEY` | ✅ Yes | OpenAI API key for GPT-4o-mini |
| `SUPABASE_URL` | ⚠️ Optional | Supabase project URL (feature flag: falls back if missing) |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ Optional | Supabase service role key (feature flag: falls back if missing) |
| `ALLOWED_ORIGINS` | ✅ Yes | Comma-separated frontend URLs (e.g., `https://your-app.vercel.app,http://localhost:3000`) |
| `PORT` | ❌ No | Auto-set by Render |

**Note:** All secrets (JWT_SECRET, OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY) are server-side only and never exposed to frontend builds.

**Generate JWT_SECRET:**
```bash
openssl rand -base64 32
```

### Vercel (Frontend)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | ✅ Yes | Backend URL (e.g., `https://thevioleteightfold-4224.onrender.com`) |

---

## API Base URL Configuration

### Frontend
The frontend uses `VITE_API_BASE_URL` environment variable:
- **Production:** Must be set to Render backend URL
- **Development:** Falls back to `http://localhost:3001` if not set

**Location:** `services/aiService.ts:6-19`

### Backend CORS
Backend CORS is configured via `ALLOWED_ORIGINS`:
- Comma-separated list of allowed origins
- Must include Vercel deployment domain(s)
- Must include `http://localhost:3000` for local dev

**Location:** `server/server.ts:40-61`

---

## Deployment Steps

### 1. Backend (Render)

1. **Set Environment Variables:**
   - Go to Render Dashboard → Your Service → Environment
   - Add all required variables (see table above)
   - Ensure `ALLOWED_ORIGINS` includes your Vercel domain

2. **Deploy:**
   - Push branch to GitHub
   - Render auto-deploys (if connected) OR
   - Manually trigger deployment

3. **Verify:**
   ```bash
   curl https://thevioleteightfold-4224.onrender.com/api/health
   curl https://thevioleteightfold-4224.onrender.com/api/auth/health
   ```

### 2. Frontend (Vercel)

1. **Set Environment Variables:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add `VITE_API_BASE_URL` = `https://thevioleteightfold-4224.onrender.com`

2. **Deploy:**
   - Push branch to GitHub
   - Vercel auto-deploys (if connected) OR
   - Manually trigger deployment

3. **Verify:**
   - Open frontend URL
   - Test login → should get JWT token
   - Test Single Chat → should work
   - Test Council Session → should work

---

## Health Check Endpoints

### `/api/health` (Public)
Returns general server health:
```json
{
  "status": "ok",
  "uptime": 12345,
  "timestamp": "2025-01-27T...",
  "environment": "production",
  "commitHash": "abc123",
  "jwtSecretSet": true,
  "supabaseStatus": "configured"
}
```

### `/api/auth/health` (Public)
Returns auth-specific diagnostics:
```json
{
  "ok": true,
  "hasJwtSecret": true,
  "hasSupabase": true,
  "build": "abc123"
}
```

---

## Troubleshooting

### 401 "Invalid token" Errors

1. **Check JWT_SECRET:**
   ```bash
   curl https://thevioleteightfold-4224.onrender.com/api/auth/health
   ```
   Verify `hasJwtSecret: true`

2. **Check Token Format:**
   - Token should be JWT (3 dot-separated segments)
   - Frontend sends: `Authorization: Bearer <token>`
   - Backend accepts: `Authorization: Bearer <token>`, `Authorization: <token>`, or `x-auth-token: <token>`

3. **Check CORS:**
   - Verify `ALLOWED_ORIGINS` includes frontend domain
   - Check browser console for CORS errors

4. **Check Render Logs:**
   - Look for `[AUTH]` prefixed logs
   - Check for JWT verification errors
   - Verify tokenHash and error type

### CORS Errors

1. **Verify ALLOWED_ORIGINS:**
   - Must include exact Vercel domain (e.g., `https://the-violet-eightfold.vercel.app`)
   - Must include `http://localhost:3000` for local dev
   - No trailing slashes

2. **Check Headers:**
   - Backend allows: `Content-Type`, `Authorization`, `x-auth-token`
   - Preflight requests should return 200

### Supabase Connection Issues

1. **Check Environment Variables:**
   - `SUPABASE_URL` must be set
   - `SUPABASE_SERVICE_ROLE_KEY` must be set
   - Both must be valid

2. **Check Health Endpoint:**
   ```bash
   curl https://thevioleteightfold-4224.onrender.com/api/health
   ```
   Verify `supabaseStatus: "configured"`

3. **Check Logs:**
   - Look for `[SUPABASE]` prefixed logs
   - Errors are logged but don't fail requests (feature flag)

---

## Testing Checklist

### Backend
- [ ] Health endpoint returns `status: "ok"`
- [ ] Auth health endpoint returns `ok: true, hasJwtSecret: true`
- [ ] Login returns JWT token
- [ ] Council endpoint accepts JWT token
- [ ] Integration endpoint creates lore entries
- [ ] Legacy tokens rejected with clear message

### Frontend
- [ ] Login works and stores JWT token
- [ ] Single Chat works with JWT token
- [ ] Council Session works with JWT token
- [ ] Integration button calls backend and persists to Supabase
- [ ] Auto-logout on 401 (all reasons)
- [ ] User-friendly error messages

### Supabase
- [ ] Users table: users created on login
- [ ] Council sessions: sessions created on /api/council calls
- [ ] Lore entries: entries created for direct, council, and integration types
- [ ] User-specific scoping: different users don't see each other's entries

---

## Manual Test Steps

1. **Login:**
   - Use test user credentials
   - Verify token is JWT format (3 segments)
   - Check localStorage: `vc_auth_token` and `vc_user_id`

2. **Single Chat:**
   - Select archetype
   - Send message
   - Verify response received
   - Check Supabase: lore entry created (if configured)

3. **Council Session:**
   - Start session with topic
   - Send messages
   - Verify responses received
   - Check Supabase: council session and lore entries created (if configured)

4. **Integration:**
   - Complete council session
   - Click "Integrate" button
   - Verify session history persisted to Supabase (if configured)
   - Check lore entry created with type "integration"

5. **Auth Error Handling:**
   - Manually clear token from localStorage
   - Make API call
   - Verify auto-logout and re-login prompt

---

## Rollback Plan

If issues occur:

1. **Revert to Previous Version:**
   ```bash
   git revert HEAD
   git push
   ```

2. **Or Deploy Previous Branch:**
   - Switch Render to previous branch/commit
   - Redeploy

3. **Remove JWT_SECRET:**
   - Remove JWT_SECRET from Render environment variables
   - System will fall back to dev mode (not recommended for production)

**Note:** After rollback, users with JWT tokens will need to re-login (legacy tokens will work again).

---

**Last Updated:** 2025-01-27
