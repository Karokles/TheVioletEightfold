# Deployment Plan - JWT Auth Migration

**Branch:** `fix/auth-restart-proof`  
**Date:** 2025-01-27  
**Goal:** Deploy restart-proof JWT authentication

---

## Files Changed

1. **`server/server.ts`**
   - Added JWT token generation on login
   - Updated authenticate middleware to verify JWT tokens
   - Added fail-fast check for JWT_SECRET in production
   - Updated `/auth/diagnose` to detect JWT format
   - Legacy token rejection with clear message

2. **`server/package.json`**
   - Added `jsonwebtoken` and `@types/jsonwebtoken` dependencies

3. **`services/aiService.ts`**
   - Enhanced 401 handling to support `legacy_token_invalid` reason
   - Improved error messages

4. **`server/scripts/smoke-test.js`**
   - Updated to verify JWT token format
   - Tests JWT detection in diagnose endpoint

5. **`AUTH_AUDIT_PHASE1.md`**
   - Audit documentation

---

## Environment Variables Required

### Render (Backend)

| Variable | Required | Value | Notes |
|----------|----------|-------|-------|
| `JWT_SECRET` | âœ… **YES** | Random secure string (min 32 chars) | **NEW - Must be set** |
| `OPENAI_API_KEY` | âœ… Yes | Your OpenAI API key | Existing |
| `ALLOWED_ORIGINS` | âœ… Yes | Comma-separated frontend URLs | Existing |
| `NODE_ENV` | âš ï¸ Recommended | `production` | Existing |
| `PORT` | âŒ No | Auto-set by Render | Existing |

**Generate JWT_SECRET:**
```bash
# Option 1: Using openssl
openssl rand -base64 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option 3: Using online generator
# Use a secure random string generator (32+ characters)
```

### Vercel (Frontend)

| Variable | Required | Value | Notes |
|----------|----------|-------|-------|
| `VITE_API_BASE_URL` | âœ… Yes | `https://thevioleteightfold-4224.onrender.com` | Existing |

**No new variables needed for frontend.**

---

## Step-by-Step Deployment Checklist

### Render (Backend) - Step 1

1. **Generate JWT_SECRET:**
   ```bash
   openssl rand -base64 32
   ```
   Save this value securely.

2. **Set Environment Variable:**
   - Go to Render Dashboard â†’ Your Service â†’ Environment
   - Add new variable:
     - Key: `JWT_SECRET`
     - Value: (paste the generated secret)
   - Click "Save Changes"

3. **Verify Environment Variables:**
   - âœ… `JWT_SECRET` is set
   - âœ… `OPENAI_API_KEY` is set
   - âœ… `ALLOWED_ORIGINS` is set (your Vercel frontend URL)
   - âœ… `NODE_ENV` is set to `production` (recommended)

4. **Redeploy:**
   - Push `fix/auth-restart-proof` branch to GitHub
   - Render will auto-deploy (if connected) OR
   - Manually trigger deployment in Render Dashboard

5. **Verify Deployment:**
   ```bash
   # Health check
   curl https://thevioleteightfold-4224.onrender.com/api/health
   
   # Should return:
   # {"status":"ok","uptime":...,"timestamp":"...","environment":"production","commitHash":"..."}
   ```

6. **Test Auth Diagnose:**
   ```bash
   curl https://thevioleteightfold-4224.onrender.com/api/auth/diagnose
   
   # Should return (no token):
   # {"hasAuthHeader":false,"authHeaderFormat":"missing",...}
   ```

7. **Test Login:**
   ```bash
   curl -X POST https://thevioleteightfold-4224.onrender.com/api/login \
     -H "Content-Type: application/json" \
     -d '{"username":"lion","secret":"<local-test-secret>"}'
   
   # Should return JWT token:
   # {"userId":"lion","token":"eyJhbGc..."}
   ```

8. **Run Smoke Test:**
   ```bash
   cd server
   npm run test:smoke:prod
   ```

### Vercel (Frontend) - Step 2

1. **Verify Environment Variable:**
   - Go to Vercel Dashboard â†’ Your Project â†’ Settings â†’ Environment Variables
   - Verify `VITE_API_BASE_URL` is set to `https://thevioleteightfold-4224.onrender.com`

2. **Redeploy:**
   - Push `fix/auth-restart-proof` branch to GitHub
   - Vercel will auto-deploy (if connected) OR
   - Manually trigger deployment in Vercel Dashboard

3. **Verify Deployment:**
   - Open frontend URL
   - Test login â†’ should get JWT token
   - Test Single Chat â†’ should work
   - Test Council Session â†’ should work
   - Test auto-logout: Wait for server restart â†’ make API call â†’ should auto-logout

---

## Migration Behavior

### Legacy Tokens (Old Random Hex Tokens)

**What happens:**
- Users with old tokens will get 401 with reason `legacy_token_invalid`
- Frontend will auto-clear token and show: "Legacy token format no longer supported. Please sign in again to get a new token."
- User re-logs in â†’ gets new JWT token â†’ works normally

**Timeline:**
- Immediate: All new logins get JWT tokens
- Legacy tokens rejected immediately with helpful message
- No data loss: Users just need to re-login once

### New JWT Tokens

**Characteristics:**
- Stateless: No server-side storage
- Restart-proof: Survive server restarts
- Expire in 7 days
- Cryptographically signed

---

## 5-Minute Runbook: If /api/council Returns 401

### Step 1: Check Backend Health (30 seconds)
```bash
curl https://thevioleteightfold-4224.onrender.com/api/health
```
- **If fails:** Server is down â†’ Check Render logs
- **If succeeds:** Continue

### Step 2: Check Auth Diagnose (30 seconds)
```bash
curl https://thevioleteightfold-4224.onrender.com/api/auth/diagnose
```
- **Check `verifyResult`:**
  - `ok` = Token valid
  - `expired` = Token expired (user needs to re-login)
  - `invalid_signature` = Token invalid (likely legacy token)
  - `legacy_token_invalid` = Old token format (user needs to re-login)
  - `missing_secret` = JWT_SECRET not set (deployment issue)

### Step 3: Test Login (1 minute)
```bash
curl -X POST https://thevioleteightfold-4224.onrender.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"lion","secret":"<local-test-secret>"}'
```
- **If fails:** Check credentials
- **If succeeds:** Check token format (should be JWT with 3 segments)

### Step 4: Test Council with New Token (1 minute)
```bash
TOKEN="your-jwt-token-from-step-3"
curl -X POST https://thevioleteightfold-4224.onrender.com/api/council \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"messages":[{"id":"1","role":"user","content":"test","timestamp":1234567890}],"userProfile":{"language":"EN"}}'
```
- **If 401:** Check error response `reason` field
- **If 200:** Auth works, issue is with frontend token

### Step 5: Check Render Logs (1 minute)
- Render Dashboard â†’ Your Service â†’ Logs
- Look for:
  - `[AUTH] JWT_SECRET required in production` â†’ JWT_SECRET not set
  - `[AUTH] JWT verification error` â†’ Token verification failed
  - `TokenExpiredError` â†’ Token expired (normal after 7 days)

### Step 6: Check Frontend (1 minute)
- Open browser console (F12)
- Check Network tab for API calls
- Look for 401 responses
- Check error response `reason` field:
  - `legacy_token_invalid` â†’ User has old token, needs to re-login
  - `expired` â†’ Token expired, user needs to re-login
  - `invalid_signature` â†’ Token invalid

### Most Likely Causes

1. **Legacy Token (Most Common After Migration)**
   - User has old random hex token
   - **Fix:** User re-logs in (frontend auto-handles this)

2. **JWT_SECRET Not Set**
   - Server refuses to start or returns 500
   - **Fix:** Set JWT_SECRET in Render environment variables

3. **Token Expired**
   - Token older than 7 days
   - **Fix:** User re-logs in (frontend auto-handles this)

4. **CORS Issue**
   - Frontend origin not in ALLOWED_ORIGINS
   - **Fix:** Add frontend URL to ALLOWED_ORIGINS

---

## Verification Steps

### Backend Verification
1. âœ… Health endpoint returns status
2. âœ… Auth diagnose detects JWT format
3. âœ… Login returns JWT token
4. âœ… Council endpoint accepts JWT token
5. âœ… Legacy tokens rejected with clear message

### Frontend Verification
1. âœ… Login works and stores JWT token
2. âœ… Single Chat works with JWT token
3. âœ… Council Session works with JWT token
4. âœ… Auto-logout on 401 (legacy_token_invalid, expired, etc.)
5. âœ… User-friendly error messages

### End-to-End Verification
1. âœ… Login â†’ Get JWT token
2. âœ… Use Single Chat â†’ Works
3. âœ… Use Council Session â†’ Works
4. âœ… Wait for server restart â†’ Token still works (restart-proof!)
5. âœ… Test legacy token â†’ Rejected with helpful message

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

## Success Criteria

âœ… **Backend:**
- JWT_SECRET set and validated
- JWT tokens generated on login
- JWT tokens verified in middleware
- Legacy tokens rejected with helpful message
- Tokens survive server restarts

âœ… **Frontend:**
- JWT tokens stored and used correctly
- Auto-logout on 401 (all reasons)
- User-friendly error messages
- Core flows work (Single Chat, Council Session)

âœ… **Testing:**
- Smoke test passes
- Manual testing confirms restart-proof behavior

---

**Status:** âœ… Ready for deployment






