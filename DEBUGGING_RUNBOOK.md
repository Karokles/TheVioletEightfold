# Debugging Runbook - Production Issues

**Last Updated:** 2025-01-27  
**Version:** 1.0

---

## Quick Diagnostic Flow

```
1. Is backend responding?
   ├─ NO → Check Render logs, verify service is running
   └─ YES → Continue to step 2

2. Is frontend loading?
   ├─ NO → Check Vercel build logs, verify build succeeded
   └─ YES → Continue to step 3

3. Are API calls failing?
   ├─ CORS errors → Check ALLOWED_ORIGINS env var
   ├─ 401 errors → Check auth token, verify user logged in
   ├─ 500 errors → Check backend logs, verify OPENAI_API_KEY
   └─ Network errors → Check VITE_API_BASE_URL, verify backend URL

4. Are features working?
   ├─ Single chat fails → Check backend logs, verify OpenAI API key
   ├─ Council session fails → Check backend logs, verify request format
   └─ Integration button does nothing → Expected (stubbed for MVP)
```

---

## Issue Categories

### 1. Backend Not Starting

#### Symptoms
- Render shows "Service Unavailable"
- Health check returns connection error
- Logs show startup errors

#### Diagnostic Steps
1. **Check Render Logs:**
   ```
   Render Dashboard → Your Service → Logs
   ```
   Look for:
   - "Server running on port XXXX" (success)
   - "ERROR: OPENAI_API_KEY..." (missing key)
   - "Cannot find module..." (build issue)
   - "EADDRINUSE" (port conflict)

2. **Verify Build Configuration:**
   - Root Directory: `server`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

3. **Check Environment Variables:**
   - `OPENAI_API_KEY` must be set
   - `ALLOWED_ORIGINS` should be set (comma-separated URLs)
   - `NODE_ENV` optional but recommended

#### Solutions
- **Missing OPENAI_API_KEY:**
  - Set in Render → Environment Variables
  - Redeploy service

- **Build Fails:**
  - Check `server/package.json` exists
  - Verify `npm run build` works locally
  - Check TypeScript compilation errors

- **Port Issues:**
  - Remove hardcoded PORT (use `process.env.PORT`)
  - Render sets PORT automatically

---

### 2. Frontend Build Fails

#### Symptoms
- Vercel deployment shows "Build Failed"
- Build logs show errors
- Frontend not accessible

#### Diagnostic Steps
1. **Check Vercel Build Logs:**
   ```
   Vercel Dashboard → Deployments → [Latest] → Build Logs
   ```
   Look for:
   - "VITE_API_BASE_URL is not set" (production check)
   - Module not found errors
   - TypeScript errors

2. **Verify Build Configuration:**
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Check Environment Variables:**
   - `VITE_API_BASE_URL` must be set for production builds

#### Solutions
- **Missing VITE_API_BASE_URL:**
  - Set in Vercel → Settings → Environment Variables
  - Redeploy (rebuild required)

- **Build Errors:**
  - Test locally: `npm run build`
  - Fix TypeScript/import errors
  - Commit and push to trigger rebuild

---

### 3. CORS Errors

#### Symptoms
- Browser console shows: "Access to fetch at '...' has been blocked by CORS policy"
- Network tab shows OPTIONS request failing
- API calls fail with CORS error

#### Diagnostic Steps
1. **Check Request Origin:**
   ```
   Browser DevTools → Network → [Request] → Headers → Request Headers → Origin
   ```
   Note the exact origin URL (e.g., `https://your-app.vercel.app`)

2. **Check Backend CORS Config:**
   ```bash
   # Check Render environment variables
   ALLOWED_ORIGINS=https://your-app.vercel.app
   ```
   Verify:
   - URL matches exactly (including `https://`)
   - No trailing slashes
   - Multiple origins comma-separated (no spaces)

3. **Test CORS Manually:**
   ```bash
   curl -H "Origin: https://your-app.vercel.app" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type,Authorization" \
        -X OPTIONS \
        https://thevioleteightfold-4224.onrender.com/api/council
   ```
   Should return CORS headers.

#### Solutions
- **Origin Not Allowed:**
  - Add frontend URL to `ALLOWED_ORIGINS` in Render
  - Format: `https://your-app.vercel.app` (no trailing slash)
  - Multiple: `https://app1.vercel.app,https://app2.vercel.app`
  - Redeploy backend

- **Credentials Issue:**
  - Verify `credentials: true` in CORS config (already set)
  - Verify frontend sends credentials (should be automatic)

---

### 4. Authentication Failures (401)

#### Symptoms
- API calls return 401 Unauthorized
- "Invalid token" errors
- User logged out unexpectedly

#### Diagnostic Steps
1. **Check Token Storage:**
   ```
   Browser DevTools → Application → Local Storage → [Your Domain]
   ```
   Look for:
   - `vc_auth_token` (should exist)
   - `vc_user_id` (should exist)

2. **Check Request Headers:**
   ```
   Browser DevTools → Network → [Request] → Headers → Request Headers
   ```
   Verify:
   - `Authorization: Bearer <token>` header exists
   - Token matches localStorage value

3. **Check Backend Logs:**
   - Look for "Unauthorized: Invalid token" messages
   - Verify user exists in backend `users[]` array

#### Solutions
- **Token Missing:**
  - User needs to log in again
  - Check if localStorage was cleared

- **Token Invalid:**
  - Backend may have restarted (tokens are in-memory)
  - User needs to log in again
  - Check if token was modified

- **User Not Found:**
  - Verify user exists in `server/server.ts` `users[]` array
  - Check username/secret match

---

### 5. API Calls Fail (500 Errors)

#### Symptoms
- API calls return 500 Internal Server Error
- Backend logs show errors
- Features don't work

#### Diagnostic Steps
1. **Check Backend Logs:**
   ```
   Render Dashboard → Logs
   ```
   Look for:
   - "OpenAI API key not configured"
   - "Council API error: ..."
   - Stack traces

2. **Verify OpenAI API Key:**
   - Check `OPENAI_API_KEY` is set in Render
   - Verify key is valid (not expired/revoked)
   - Check OpenAI account has credits

3. **Test OpenAI Connection:**
   ```bash
   curl -X POST https://api.openai.com/v1/chat/completions \
     -H "Authorization: Bearer YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"test"}]}'
   ```

#### Solutions
- **Missing API Key:**
  - Set `OPENAI_API_KEY` in Render environment variables
  - Redeploy backend

- **Invalid API Key:**
  - Generate new key in OpenAI dashboard
  - Update in Render
  - Redeploy

- **OpenAI Errors:**
  - Check OpenAI status page
  - Verify account has credits
  - Check rate limits

---

### 6. Frontend Calls Wrong Backend URL

#### Symptoms
- Network tab shows requests to `localhost:3001`
- API calls fail with connection errors
- Console shows "VITE_API_BASE_URL is not set"

#### Diagnostic Steps
1. **Check Environment Variable:**
   ```
   Vercel Dashboard → Settings → Environment Variables
   ```
   Verify:
   - `VITE_API_BASE_URL` is set
   - Value is correct Render URL
   - No typos

2. **Check Build Output:**
   ```
   Vercel Dashboard → Deployments → [Latest] → Build Logs
   ```
   Look for:
   - "VITE_API_BASE_URL is not set" error (should fail build)
   - Or verify URL is embedded in build

3. **Check Runtime:**
   ```
   Browser DevTools → Console
   ```
   Look for:
   - Errors about API base URL
   - Network requests showing wrong URL

#### Solutions
- **Variable Not Set:**
  - Set `VITE_API_BASE_URL` in Vercel
  - Redeploy (rebuild required)

- **Wrong URL:**
  - Update `VITE_API_BASE_URL` to correct Render URL
  - Format: `https://thevioleteightfold-4224.onrender.com` (no trailing slash)
  - Redeploy

---

### 7. Data Isolation Issues

#### Symptoms
- User sees another user's data
- Data persists across users incorrectly
- localStorage contains wrong user data

#### Diagnostic Steps
1. **Check localStorage Keys:**
   ```
   Browser DevTools → Application → Local Storage
   ```
   Verify keys are user-scoped:
   - `user_${userId}_lore`
   - `user_${userId}_stats`
   - Not: `lore`, `stats` (unscoped)

2. **Check Backend userId Usage:**
   - Verify backend uses `req.user.id` (not `req.body.userId`)
   - Check authentication middleware sets `req.user`

3. **Test with Multiple Users:**
   - Login as user1, create data
   - Logout, login as user2
   - Verify user2 doesn't see user1's data

#### Solutions
- **Unscoped Keys:**
  - Fix `userService.ts` to use `getUserScopedKey()`
  - Clear localStorage and test again

- **Backend userId Issue:**
  - Verify `server/server.ts` uses `req.user.id`
  - Check authentication middleware

---

## Common Error Messages

### "VITE_API_BASE_URL is not set"
**Cause:** Environment variable missing in Vercel  
**Fix:** Set `VITE_API_BASE_URL` in Vercel environment variables and redeploy

### "Unauthorized: Missing or invalid token"
**Cause:** No auth token in request  
**Fix:** User needs to log in

### "Unauthorized: Invalid token"
**Cause:** Token doesn't match any user (backend restarted or token invalid)  
**Fix:** User needs to log in again

### "OpenAI API key not configured"
**Cause:** `OPENAI_API_KEY` not set in Render  
**Fix:** Set environment variable in Render and redeploy

### "Not allowed by CORS"
**Cause:** Frontend origin not in `ALLOWED_ORIGINS`  
**Fix:** Add frontend URL to `ALLOWED_ORIGINS` in Render

### "messages array is required"
**Cause:** Request body missing `messages` field  
**Fix:** Check frontend code sends correct request format

---

## Testing Commands

### Backend Health Check
```bash
curl https://thevioleteightfold-4224.onrender.com/api/health
# Expected: {"status":"ok"}
```

### Test Login
```bash
curl -X POST https://thevioleteightfold-4224.onrender.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"lion","secret":"TuerOhneWiederkehr2025"}'
# Expected: {"userId":"lion","token":"..."}
```

### Test Council Endpoint (with auth)
```bash
TOKEN="your-token-here"
curl -X POST https://thevioleteightfold-4224.onrender.com/api/council \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "messages": [{"id":"1","role":"user","content":"Hello","timestamp":1234567890}],
    "userProfile": {"language":"EN"}
  }'
# Expected: {"reply":"..."}
```

### Test CORS
```bash
curl -H "Origin: https://your-frontend.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type,Authorization" \
     -X OPTIONS \
     https://thevioleteightfold-4224.onrender.com/api/council \
     -v
# Should return CORS headers
```

---

## Escalation Path

1. **Check logs** (Render/Vercel)
2. **Verify environment variables**
3. **Test endpoints manually** (curl commands above)
4. **Check GitHub issues** (if applicable)
5. **Contact support** (Render/Vercel)

---

## Prevention Checklist

- [ ] Environment variables set before deployment
- [ ] CORS origins configured correctly
- [ ] Backend health check passes
- [ ] Frontend builds successfully
- [ ] Test login works
- [ ] Test API calls work
- [ ] Monitor logs for 24 hours after deployment






