# CORS Preflight Fix

**Date:** 2025-01-27  
**Issue:** OPTIONS preflight requests blocked by authenticate middleware  
**Status:** ✅ Fixed

---

## Problem

Browser blocks calls from `https://the-violet-eightfold42.vercel.app` to `https://thevioleteightfold-4224.onrender.com/api/me` and `/api/council`:

```
Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header
```

**Root Cause:** The `authenticate` middleware was blocking OPTIONS requests (preflight) because they don't include an Authorization header.

---

## Fix

### 1. Skip Authentication for OPTIONS Requests ✅

**File:** `server/server.ts:182-186`

**Change:**
```typescript
const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void | Response => {
  // Skip authentication for OPTIONS requests (preflight)
  if (req.method === 'OPTIONS') {
    return next();
  }
  
  // ... rest of authentication logic
};
```

**Why:** OPTIONS requests are preflight requests sent by the browser automatically. They don't include Authorization headers and should not be authenticated.

### 2. CORS Middleware Order ✅

**Current Order (Correct):**
1. `app.use(cors(corsOptions))` - Line 120
2. `app.options('*', cors(corsOptions))` - Line 123
3. `app.use(express.json())` - Line 125
4. Routes with `authenticate` middleware

**Result:** CORS headers are set BEFORE authentication, so OPTIONS requests get proper CORS headers.

---

## Changed Files

1. **`server/server.ts`**
   - Added OPTIONS skip in authenticate middleware (line 184-186)

2. **`server/env.example`**
   - Updated ALLOWED_ORIGINS example with correct order

---

## Environment Variables

### Render (Backend)

**Variable:** `ALLOWED_ORIGINS`

**Value:**
```
https://the-violet-eightfold42.vercel.app,http://localhost:5173
```

**Note:** Default dev origins (`http://localhost:3000`, `http://localhost:5173`) are automatically included. You only need to specify production origins.

---

## Test Commands

### Preflight OPTIONS Test for /api/me

```bash
curl -X OPTIONS https://thevioleteightfold-4224.onrender.com/api/me \
  -H "Origin: https://the-violet-eightfold42.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization" \
  -v
```

**Expected Response:**
```
< HTTP/1.1 204 No Content
< Access-Control-Allow-Origin: https://the-violet-eightfold42.vercel.app
< Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS
< Access-Control-Allow-Headers: Content-Type,Authorization,x-auth-token
< Access-Control-Max-Age: 86400
< Vary: Origin
```

**Status Code:** `204 No Content` (not 401!)

### Preflight OPTIONS Test for /api/council

```bash
curl -X OPTIONS https://thevioleteightfold-4224.onrender.com/api/council \
  -H "Origin: https://the-violet-eightfold42.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Authorization,Content-Type" \
  -v
```

**Expected Response:**
```
< HTTP/1.1 204 No Content
< Access-Control-Allow-Origin: https://the-violet-eightfold42.vercel.app
< Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS
< Access-Control-Allow-Headers: Content-Type,Authorization,x-auth-token
< Access-Control-Max-Age: 86400
< Vary: Origin
```

**Status Code:** `204 No Content` (not 401!)

### Actual Request Test (after preflight passes)

**GET /api/me:**
```bash
TOKEN="<your-jwt-token>"
curl -X GET https://thevioleteightfold-4224.onrender.com/api/me \
  -H "Origin: https://the-violet-eightfold42.vercel.app" \
  -H "Authorization: Bearer $TOKEN" \
  -v
```

**Expected:**
```
< HTTP/1.1 200 OK
< Access-Control-Allow-Origin: https://the-violet-eightfold42.vercel.app
< Content-Type: application/json
```

**POST /api/council:**
```bash
TOKEN="<your-jwt-token>"
curl -X POST https://thevioleteightfold-4224.onrender.com/api/council \
  -H "Origin: https://the-violet-eightfold42.vercel.app" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"id":"1","role":"user","content":"Hello","timestamp":1234567890}],"userProfile":{"language":"EN"}}' \
  -v
```

**Expected:**
```
< HTTP/1.1 200 OK
< Access-Control-Allow-Origin: https://the-violet-eightfold42.vercel.app
< Content-Type: application/json
```

---

## Render Deployment Steps

1. **Update Environment Variable:**
   - Go to: Render Dashboard → Your Service → Environment
   - Update `ALLOWED_ORIGINS`:
     ```
     https://the-violet-eightfold42.vercel.app,http://localhost:5173
     ```
   - **Note:** Default dev origins are automatically included

2. **Save and Redeploy:**
   - Click "Save Changes"
   - Render will auto-redeploy (or click "Manual Deploy")

3. **Verify:**
   - Check Render logs for: `[STARTUP] CORS allowed origins: ...`
   - Test preflight requests (see commands above)
   - Test actual requests from frontend
   - Browser console should show no CORS errors

---

## Verification Checklist

- [ ] Render logs show: `[STARTUP] CORS allowed origins: ...`
- [ ] OPTIONS to `/api/me` returns 204 (not 401)
- [ ] OPTIONS to `/api/council` returns 204 (not 401)
- [ ] OPTIONS responses include `Access-Control-Allow-Origin` header
- [ ] OPTIONS responses include `Access-Control-Allow-Methods` header
- [ ] OPTIONS responses include `Access-Control-Allow-Headers` header
- [ ] Actual GET to `/api/me` includes CORS headers
- [ ] Actual POST to `/api/council` includes CORS headers
- [ ] Frontend can make requests without CORS errors
- [ ] Browser console shows no CORS errors

---

## Key Changes

1. ✅ `authenticate` middleware now skips OPTIONS requests
2. ✅ CORS middleware is BEFORE all routes
3. ✅ `app.options('*', cors(corsOptions))` handles all preflight requests
4. ✅ `credentials: false` (no cookies)
5. ✅ `maxAge: 86400` (24h preflight caching)
6. ✅ Startup log shows allowed origins

---

**Status:** ✅ Ready for Deployment

**Last Updated:** 2025-01-27

