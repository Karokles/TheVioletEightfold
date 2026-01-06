# Phase 1: Authentication Audit

**Date:** 2025-01-27  
**Branch:** `fix/auth-restart-proof`  
**Goal:** Make auth restart-proof with JWT

---

## Current Auth System Analysis

### Token Issuance (Login Route)

**Location:** `server/server.ts` (around line 280-310)

**Current Implementation:**
```typescript
// Token generation (line ~290)
const token = randomBytes(32).toString('hex');
user.token = token;  // Stored in-memory on user object
```

**Characteristics:**
- **Format:** Random hex string (64 chars)
- **NOT JWT:** Simple random string
- **Storage:** In-memory `users[]` array
- **Problem:** Lost on server restart

### Token Validation (Middleware)

**Location:** `server/server.ts:102-170` (authenticate function)

**Current Implementation:**
```typescript
// Line 159: In-memory lookup
const user = users.find(u => u.token === token);

if (!user) {
  return res.status(401).json({ 
    error: 'unauthorized',
    reason: 'invalid_signature',
    message: 'Invalid token'
  });
}
```

**Characteristics:**
- **Method:** In-memory array lookup
- **NOT cryptographic:** No signature verification
- **Problem:** Tokens lost on restart → all become invalid

### Token Storage

**Backend:**
- In-memory `users[]` array (line 62-90)
- Each user object has `token?: string` property
- No persistence, no database

**Frontend:**
- `localStorage.getItem('vc_auth_token')` - `services/userService.ts:14`
- `localStorage.getItem('vc_user_id')` - `services/userService.ts:13`
- Persists across browser sessions

### Protected Route: /api/council

**Location:** `server/server.ts` (around line 320)

**Protection:**
- Uses `authenticate` middleware
- Requires valid token in `Authorization: Bearer <token>` header
- Sets `req.user` from authenticated user object

### Frontend Token Usage

**Location:** `services/aiService.ts:23-34` (getAuthHeaders)

**Implementation:**
```typescript
'Authorization': `Bearer ${token}`
```

**Used in:**
- `sendMessageToArchetype()` - Single chat
- `startCouncilSession()` - Council session
- `sendMessageToCouncil()` - Council session continue

---

## Root Cause Confirmed

**Primary Issue:** In-memory token storage loses tokens on server restart.

**Evidence:**
1. Tokens generated as random hex strings (not JWT)
2. Tokens stored in-memory `users[]` array
3. No persistence layer
4. Render Free Tier spins down → server restarts → tokens lost

**Impact:**
- All users get 401 errors after restart
- Frontend still has tokens in localStorage
- Users must manually clear localStorage and re-login

---

## Solution: JWT-Based Stateless Tokens

**Plan:**
1. Install `jsonwebtoken` package
2. Generate JWT tokens on login (signed with JWT_SECRET)
3. Verify JWT tokens in middleware (cryptographic verification)
4. Tokens survive server restarts (stateless)
5. Fail-fast if JWT_SECRET missing in production

---

## Files to Change

1. `server/package.json` - Add jsonwebtoken dependency
2. `server/server.ts` - JWT token generation and verification
3. `services/aiService.ts` - Already handles 401 (may need minor updates)
4. `server/scripts/smoke-test.js` - Update for JWT format

---

**Next:** Phase 2 - Add diagnostics, then Phase 3 - Implement JWT

