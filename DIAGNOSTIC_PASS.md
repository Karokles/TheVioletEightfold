# Diagnostic Pass - Production Auth Issues

**Date:** 2025-01-27  
**Branch:** `fix/prod-auth-supabase`  
**Issue:** 401 "Invalid token" on POST /api/council

---

## Current Auth Flow Map

### Frontend Token Storage
- **Key:** `vc_auth_token` (localStorage)
- **Location:** `services/userService.ts:4,14,24`
- **Retrieval:** `getCurrentUser()` reads from localStorage

### Frontend Token Usage
- **Header Format:** `Authorization: Bearer <token>`
- **Location:** `services/aiService.ts:24-39` (getAuthHeaders function)
- **Normalization:** Removes double "Bearer " prefix
- **Used in:**
  - `sendMessageToArchetype()` → POST /api/council
  - `startCouncilSession()` → POST /api/council
  - `sendMessageToCouncil()` → POST /api/council
  - `login()` → POST /api/login (no auth header)

### Backend Token Verification
- **Middleware:** `authenticate()` in `server/server.ts:118-195`
- **Format Expected:** `Authorization: Bearer <token>` OR `Authorization: <token>` (legacy)
- **Verification:** JWT verification using `JWT_SECRET`
- **Error Responses:** Structured with `reason` field

### Backend Token Generation
- **Location:** `server/server.ts:404-448` (POST /api/login)
- **Format:** JWT (HS256, expires in 7 days)
- **Claims:** `userId`, `username`, `iat`, `exp`
- **Secret:** `JWT_SECRET` from env (required in production)

---

## API Endpoints

### Existing Endpoints
1. **GET /api/health** - Public health check
2. **GET /auth/diagnose** - Public auth diagnostics
3. **GET /api/auth/debug** - Protected auth debug
4. **POST /api/login** - Public login (returns JWT token)
5. **POST /api/council** - Protected (used for Single Chat, Council Session)

### Missing Endpoints (Referenced but don't exist)
- ❌ `/api/thoughtchamber` - Not found (Council Session uses /api/council)
- ❌ `/api/integrate` - Not found (Integration is stubbed in frontend)

**Note:** All flows currently use `/api/council` with different `userProfile` configurations.

---

## Root Cause Analysis

### Likely Causes of 401 "Invalid token"

1. **JWT_SECRET Mismatch**
   - Token signed with one secret, verified with another
   - **Check:** Verify JWT_SECRET is set correctly in Render

2. **Token Expired**
   - JWT tokens expire in 7 days
   - **Check:** User logged in > 7 days ago

3. **Token Format Issue**
   - Frontend might have old legacy token (random hex)
   - **Check:** Token should be JWT (3 dot-separated segments)

4. **CORS Issue**
   - Authorization header not allowed
   - **Check:** ALLOWED_ORIGINS includes Vercel domain

5. **User Not Found**
   - JWT valid but user doesn't exist in `users[]` array
   - **Check:** User ID from JWT matches user in array

---

## Environment Variables Status

### Render (Backend) - Current
- ✅ `JWT_SECRET` - Set (from user info)
- ✅ `OPENAI_API_KEY` - Set
- ✅ `SUPABASE_URL` - Set (NEW - for Supabase integration)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Set (NEW)
- ⚠️ `ALLOWED_ORIGINS` - Need to verify includes Vercel domain
- ✅ `NODE_ENV=production` - Set

### Vercel (Frontend) - Expected
- ✅ `VITE_API_BASE_URL` - Should be `https://thevioleteightfold-4224.onrender.com`

---

## Next Steps

1. ✅ Diagnostic complete
2. ⏳ Fix auth logging (add detailed logs without secrets)
3. ⏳ Enhance /api/health with Supabase connectivity check
4. ⏳ Fix Tailwind CDN issue
5. ⏳ Add Supabase integration (minimal, safe)
6. ⏳ Verify CORS configuration
7. ⏳ Test end-to-end

---

## Production Auth Debugging (README Section)

### Quick Debug Steps

1. **Check Backend Health:**
   ```bash
   curl https://thevioleteightfold-4224.onrender.com/api/health
   ```
   Should return: `{"status":"ok",...}`

2. **Check Auth Diagnose:**
   ```bash
   curl https://thevioleteightfold-4224.onrender.com/api/auth/diagnose
   ```
   Check `verifyResult` and `tokenLooksLikeJwt` fields

3. **Test Login:**
   ```bash
   curl -X POST https://thevioleteightfold-4224.onrender.com/api/login \
     -H "Content-Type: application/json" \
     -d '{"username":"lion","secret":"TuerOhneWiederkehr2025"}'
   ```
   Verify token is JWT format (3 segments)

4. **Check Render Logs:**
   - Look for `[AUTH]` prefixed logs
   - Check for JWT verification errors
   - Verify JWT_SECRET is set

5. **Check Frontend Console:**
   - Network tab: Check Authorization header format
   - Console: Look for 401 error responses with `reason` field

### Common Issues

- **401 with reason "invalid_signature"**: JWT_SECRET mismatch or token corrupted
- **401 with reason "expired"**: Token older than 7 days (user needs to re-login)
- **401 with reason "legacy_token_invalid"**: User has old random hex token (re-login)
- **401 with reason "missing_token"**: No Authorization header sent
- **CORS errors**: ALLOWED_ORIGINS doesn't include frontend domain






