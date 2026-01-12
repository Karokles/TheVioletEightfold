# Auth Flow Audit - Production Stabilization

**Date:** 2025-01-27  
**Branch:** `fix/auth-supabase-stabilization`  
**Goal:** Fix 401 "Invalid token" errors in production

---

## TASK A — FULL AUDIT

### 1. Token Creation (Login Endpoint)

**Location:** `server/server.ts:422-472` (POST /api/login)

**Flow:**
1. User provides `username` and `secret`
2. Secret is hashed with SHA256
3. User is looked up in in-memory `users[]` array
4. JWT token is generated using `jwt.sign()`:
   - Algorithm: HS256 (default)
   - Secret: `JWT_SECRET_FINAL` (from env `JWT_SECRET` or dev fallback)
   - Claims: `{ userId, username }`
   - Expiry: `7d` (7 days)
   - Issuer: `'violet-eightfold'`

**Issue Found:**
- ✅ JWT_SECRET validation exists (fails fast in production if missing)
- ⚠️ Uses `JWT_SECRET_FINAL` which has dev fallback - could cause secret mismatch

### 2. Frontend Token Storage

**Location:** `services/userService.ts:4,12-30`

**Storage Keys:**
- `vc_auth_token` - JWT token value
- `vc_user_id` - User ID

**Flow:**
- `setCurrentUser(userId, token)` - Stores both in localStorage
- `getCurrentUser()` - Retrieves both from localStorage
- `clearCurrentUser()` - Removes both from localStorage

**Status:** ✅ Correct

### 3. Token Attachment to API Requests

**Location:** `services/aiService.ts:24-41` (getAuthHeaders function)

**Format:**
- Header: `Authorization: Bearer <token>`
- Normalization: Removes any existing "Bearer " prefix to prevent double prefix
- Used in:
  - `sendMessageToArchetype()` → POST /api/council
  - `startCouncilSession()` → POST /api/council
  - `sendMessageToCouncil()` → POST /api/council
  - `integrateSession()` → POST /api/integrate

**Status:** ✅ Correct format

### 4. Backend Token Validation

**Location:** `server/server.ts:119-225` (authenticate middleware)

**Flow:**
1. Extract `Authorization` header
2. Normalize: Handle "Bearer Bearer <token>" edge case
3. Extract token (supports both `Bearer <token>` and raw `<token>`)
4. Check if token is JWT (3 dot-separated segments)
5. If JWT:
   - Verify with `jwt.verify(token, JWT_SECRET_FINAL)`
   - Extract `userId` from decoded claims
   - Lookup user in `users[]` array
   - Attach `req.user`
6. If legacy token: Reject with `legacy_token_invalid` reason

**Issues Found:**
- ✅ Supports both `Bearer <token>` and raw `<token>` formats
- ⚠️ Uses `JWT_SECRET_FINAL` (same as signing) - should be consistent
- ✅ Detailed error logging with reason codes
- ✅ User lookup from in-memory array (could fail if user not in array)

---

## Auth Flow Map

```
Frontend Storage (localStorage)
  ├─ Key: 'vc_auth_token' → JWT token string
  └─ Key: 'vc_user_id' → User ID string

Frontend Request (services/aiService.ts)
  └─ Header: Authorization: Bearer <token>
     └─ Token normalized: Removes double "Bearer " prefix

Backend Middleware (server/server.ts:authenticate)
  ├─ Extract: req.headers.authorization
  ├─ Normalize: Handle "Bearer Bearer <token>" edge case
  ├─ Extract token: Supports "Bearer <token>" or raw "<token>"
  └─ Verify: jwt.verify(token, JWT_SECRET_FINAL, { algorithm: 'HS256' })
     ├─ Decode: Extract { userId, username, iat, exp }
     ├─ Lookup: users.find(u => u.id === decoded.userId)
     └─ Attach: req.user = user

JWT Signing (server/server.ts:POST /api/login)
  └─ jwt.sign({ userId, username }, JWT_SECRET_FINAL, { expiresIn: '7d', issuer: 'violet-eightfold' })
     └─ Algorithm: HS256 (default)
     └─ Secret: JWT_SECRET from env (or dev fallback)
```

---

## Root Cause Analysis: Why Production Gets "Invalid token"

### Most Likely Causes:

1. **JWT_SECRET Mismatch** ⚠️ HIGH PROBABILITY
   - Token signed with one secret, verified with another
   - Could happen if:
     - JWT_SECRET changed between deployments
     - Dev fallback used in one environment but not the other
     - Secret has trailing whitespace or encoding issues

2. **Stale Token in Browser** ⚠️ MEDIUM PROBABILITY
   - User has old token from previous deployment
   - Old token signed with old secret
   - Frontend doesn't auto-clear on 401 (needs fix)

3. **Token Expired** ⚠️ LOW PROBABILITY (7 day expiry)
   - Token older than 7 days
   - Should return `reason: 'expired'` (not "Invalid token")

4. **User Not in Array** ⚠️ MEDIUM PROBABILITY
   - JWT valid but user not found in `users[]` array
   - Could happen if:
     - Server restarted (in-memory array reset)
     - User ID changed
     - User deleted from array

5. **CORS Preflight** ❌ LOW PROBABILITY
   - Would see CORS error, not 401
   - Backend does reach endpoint (gets 401 response)

6. **Clock Skew** ❌ VERY LOW PROBABILITY
   - JWT exp validation is lenient by default
   - Would show as expired, not invalid signature

---

## Current Issues to Fix:

1. ✅ **Auth logging** - Already implemented (tokenHash, path, error type)
2. ⚠️ **Auto-logout on 401** - Partially implemented, needs verification
3. ⚠️ **JWT_SECRET consistency** - Uses JWT_SECRET_FINAL (should be fine if env var set)
4. ⚠️ **Multiple header formats** - Already supports Bearer and raw, but should also support x-auth-token
5. ⚠️ **/api/auth/health endpoint** - Needs to be created
6. ⚠️ **User lookup failure** - Should handle gracefully (user might not be in array after restart)

---

## Next Steps:

1. Enhance authenticate middleware to accept `x-auth-token` header
2. Add `/api/auth/health` endpoint
3. Ensure frontend auto-clears token on 401 (verify implementation)
4. Add manual logout if not existing
5. Ensure JWT_SECRET is required in production (already done)
6. Add Supabase persistence (separate task)
7. Fix Tailwind CDN (separate task)
8. Verify CORS configuration




