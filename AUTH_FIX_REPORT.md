# Authentication Fix Report

**Date:** 2025-01-27  
**Branch:** `fix/auth-401`  
**Issue:** 401 "Invalid token" for /api/council in production

---

## Root Cause (with Evidence)

### Primary Issue
**In-memory token storage loses tokens on server restart.**

**Evidence:**
1. **Token Generation** (`server/server.ts:247`):
   ```typescript
   const token = randomBytes(32).toString('hex');
   user.token = token;  // Stored in-memory
   ```

2. **Token Storage** (`server/server.ts:62-90`):
   - Tokens stored in `users[]` array (in-memory)
   - No database, no file persistence

3. **Token Verification** (`server/server.ts:152`):
   ```typescript
   const user = users.find(u => u.token === token);  // In-memory lookup
   ```

4. **Server Restart Impact:**
   - Render restarts servers (cold starts, deployments)
   - `users[]` array reset → all `user.token` values lost
   - Frontend still has old tokens in localStorage
   - Result: 401 "Invalid token" errors

### System Characteristics
- **NOT JWT:** System uses simple random hex strings (64 chars)
- **No expiration:** Tokens never expire (but become invalid on restart)
- **No secret:** No cryptographic signing (just random string lookup)
- **No persistence:** Tokens stored in-memory only

---

## Fixes Implemented

### 1. Diagnostics Endpoints ✅

**GET /api/health** (Enhanced)
- Returns: status, uptime, timestamp, environment, commitHash
- Public endpoint
- Helps verify server is running

**GET /auth/diagnose** (New - Public, Safe)
- Returns token diagnostics without exposing secrets:
  - `hasAuthHeader`: boolean
  - `authHeaderFormat`: "missing" | "bearer" | "raw" | "malformed"
  - `tokenParse`: "ok" | "missing" | "malformed"
  - `verifyResult`: "ok" | "expired" | "invalid_signature" | "invalid_claims" | "unknown"
- **Safe:** No tokens, no secrets, no PII exposed
- **Public:** No authentication required (for debugging)

**GET /api/auth/debug** (Protected)
- Detailed diagnostics for authenticated users
- Returns user info and token validation details

### 2. Structured Error Responses ✅

**All 401 responses now include:**
```json
{
  "error": "unauthorized",
  "reason": "invalid_signature" | "missing_token" | "malformed_token" | "empty_token",
  "message": "Human-readable message",
  "hint": "Helpful hint (optional)"
}
```

**Reasons:**
- `missing_token` - No Authorization header
- `malformed_token` - Invalid format
- `empty_token` - Token is empty
- `invalid_signature` - Token not found (likely expired due to restart)

### 3. Frontend 401 Handling ✅

**Enhanced Error Handling:**
- Detects 401 responses with `reason` field
- Checks for `invalid_*` reasons → triggers auto-logout
- Clears localStorage tokens
- Shows user-friendly message: "Session expired. Please sign in again."
- Prevents infinite retry loops

**Token Normalization:**
- Prevents double "Bearer " prefix
- Ensures consistent header format

### 4. Token Format Support ✅

**Backend accepts:**
- `Authorization: Bearer <token>` (standard)
- `Authorization: <token>` (legacy support)

**Frontend sends:**
- `Authorization: Bearer <token>` (normalized)

---

## Environment Variables

### Render (Backend) - Required

| Variable | Purpose | Required | Notes |
|----------|---------|----------|-------|
| `OPENAI_API_KEY` | OpenAI API calls | ✅ Yes | Must be set |
| `ALLOWED_ORIGINS` | CORS whitelist | ✅ Yes | Comma-separated frontend URLs |
| `NODE_ENV` | Environment | ⚠️ Optional | Recommended: `production` |
| `PORT` | Server port | ❌ No | Auto-set by Render |

**Note:** System does NOT use JWT, so no `JWT_SECRET` or `AUTH_SECRET` is needed.

### Vercel (Frontend) - Required

| Variable | Purpose | Required | Notes |
|----------|---------|----------|-------|
| `VITE_API_BASE_URL` | Backend URL | ✅ Yes | Must be set for production builds |

---

## Verification in Production (2 Minutes)

### Step 1: Health Check (30 seconds)
```bash
curl https://thevioleteightfold-4224.onrender.com/api/health
```
**Expected:**
```json
{
  "status": "ok",
  "uptime": 123,
  "timestamp": "2025-01-27T...",
  "environment": "production",
  "commitHash": "abc1234"
}
```

### Step 2: Auth Diagnose (30 seconds)
```bash
curl https://thevioleteightfold-4224.onrender.com/api/auth/diagnose
```
**Expected (no token):**
```json
{
  "hasAuthHeader": false,
  "authHeaderFormat": "missing",
  "tokenParse": "missing",
  "verifyResult": "unknown"
}
```

### Step 3: Test Login (30 seconds)
```bash
curl -X POST https://thevioleteightfold-4224.onrender.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"lion","secret":"TuerOhneWiederkehr2025"}'
```
**Expected:**
```json
{
  "userId": "lion",
  "token": "abc123..."
}
```

### Step 4: Test Council with Token (30 seconds)
```bash
TOKEN="your-token-from-step-3"
curl -X POST https://thevioleteightfold-4224.onrender.com/api/council \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"messages":[{"id":"1","role":"user","content":"test","timestamp":1234567890}],"userProfile":{"language":"EN"}}'
```
**Expected:** 200 OK with `{"reply":"..."}`

---

## Deployment Checklist

### Render (Backend)

**Environment Variables:**
- [ ] `OPENAI_API_KEY` - Set to your OpenAI API key
- [ ] `ALLOWED_ORIGINS` - Set to your Vercel frontend URL(s), comma-separated
- [ ] `NODE_ENV` - Set to `production` (optional but recommended)

**Redeploy Steps:**
1. Push `fix/auth-401` branch to GitHub
2. Render will auto-deploy (if connected) or manually trigger deployment
3. Verify health: `curl https://thevioleteightfold-4224.onrender.com/api/health`
4. Run smoke test: `cd server && npm run test:smoke:prod`

**Configuration:**
- Root Directory: `server`
- Build Command: `npm install && npm run build`
- Start Command: `npm start`

### Vercel (Frontend)

**Environment Variables:**
- [ ] `VITE_API_BASE_URL` - Set to `https://thevioleteightfold-4224.onrender.com`

**Redeploy Steps:**
1. Push `fix/auth-401` branch to GitHub
2. Vercel will auto-deploy (if connected) or manually trigger deployment
3. Verify frontend loads
4. Test login → API calls → verify works
5. Test auto-logout: Wait for server restart → make API call → verify auto-logout

**Configuration:**
- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`

---

## Runbook: If 401 Happens Again

### Step 1: Check Backend Health (30 seconds)
```bash
curl https://thevioleteightfold-4224.onrender.com/api/health
```
- **If fails:** Server is down → Check Render logs
- **If succeeds:** Continue to Step 2

### Step 2: Check Auth Diagnose (30 seconds)
```bash
curl https://thevioleteightfold-4224.onrender.com/api/auth/diagnose
```
- **If `verifyResult: "unknown"`:** No token sent (expected for public endpoint)
- **If other values:** Check format

### Step 3: Test with Valid Token (1 minute)
```bash
# Login to get token
TOKEN=$(curl -X POST https://thevioleteightfold-4224.onrender.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"lion","secret":"TuerOhneWiederkehr2025"}' | jq -r '.token')

# Test council endpoint
curl -X POST https://thevioleteightfold-4224.onrender.com/api/council \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"messages":[{"id":"1","role":"user","content":"test","timestamp":1234567890}],"userProfile":{"language":"EN"}}'
```
- **If 401:** Check error response `reason` field
- **If 200:** Auth works, issue is with frontend token

### Step 4: Check Render Logs (1 minute)
- Render Dashboard → Your Service → Logs
- Look for: `[AUTH] Token validation failed`
- Check: `users with tokens=X` (should be > 0 if users logged in)

### Step 5: Check Frontend (1 minute)
- Open browser console (F12)
- Check Network tab for API calls
- Look for 401 responses
- Verify: Frontend should auto-logout on 401

### Most Likely Cause
**Server restarted → tokens lost → users need to re-login**

**Solution:**
- Frontend now handles this automatically (auto-logout on 401)
- Users re-login (should work immediately)
- If persists: Check `ALLOWED_ORIGINS` matches frontend URL exactly

---

## Files Changed

1. `server/server.ts` - Diagnostics, structured errors, health endpoint
2. `services/aiService.ts` - Enhanced 401 handling with reason checking
3. `services/userService.ts` - Auth error handler (already exists)
4. `App.tsx` - Auth error handler registration (already exists)
5. `server/scripts/smoke-test.js` - Updated for new endpoints
6. `AUTH_MAP.md` - Audit map (new)
7. `AUTH_FIX_REPORT.md` - This file (new)

---

## Commits

1. **Diagnostics** - `/api/health` enhanced, `/auth/diagnose` added, structured errors
2. **Frontend 401** - Enhanced error handling with reason checking
3. **Smoke test** - Updated for new endpoints

---

## Success Criteria

✅ **Backend:**
- Health endpoint returns detailed status
- Auth diagnose endpoint provides safe diagnostics
- All 401 responses include structured `reason` field
- Token format validation handles edge cases

✅ **Frontend:**
- 401 errors trigger auto-logout
- Checks `reason` field for `invalid_*` patterns
- User-friendly error messages
- No infinite retry loops

✅ **Testing:**
- Smoke test covers all flows
- Can test against local and production
- Clear pass/fail output

---

**Status:** ✅ Ready for deployment




