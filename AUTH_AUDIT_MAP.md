# Authentication System Audit Map

**Date:** 2025-01-27  
**Branch:** `stabilize-auth-prod`  
**Issue:** 401 "Invalid token" errors in production

---

## ROOT CAUSE IDENTIFIED

**Critical Finding:** The system uses **in-memory token storage** (NOT JWT). Tokens are lost when the server restarts.

### Token Lifecycle Problem:
1. **Token Issuance:** `randomBytes(32).toString('hex')` - stored in-memory on user object
2. **Token Storage:** In-memory `users[]` array (lost on server restart)
3. **Token Verification:** Looks up token in in-memory array
4. **Problem:** Render restarts servers (cold starts, deployments) → all tokens invalidated

---

## 1. TOKEN ISSUANCE (Backend)

### Location
- **File:** `server/server.ts`
- **Route:** `POST /api/login` (lines 123-150)

### Implementation
```typescript
// Line 139: Token generation
const token = randomBytes(32).toString('hex');
user.token = token;  // Stored in-memory on user object
```

### Characteristics
- **Algorithm:** None (not JWT, just random hex string)
- **Secret:** None (no signing)
- **Expiration:** None (tokens never expire)
- **Payload:** None (just a random string)
- **Storage:** In-memory `users[]` array (line 62-90)

### Environment Variables Used
- None for token generation
- `NODE_ENV` used for error message sanitization only

---

## 2. TOKEN VERIFICATION (Backend)

### Location
- **File:** `server/server.ts`
- **Middleware:** `authenticate()` function (lines 99-115)

### Implementation
```typescript
const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers?.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.substring(7);  // Extract token after "Bearer "
  const user = users.find(u => u.token === token);  // Lookup in in-memory array

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  req.user = user;
  next();
};
```

### Token Location Expected
- **Header:** `Authorization: Bearer <token>`
- **Format:** Must start with "Bearer " (single space)
- **Extraction:** `substring(7)` - removes "Bearer " prefix

### Verification Method
- **Type:** In-memory lookup (NOT cryptographic verification)
- **Storage:** `users[]` array (line 62-90)
- **Problem:** Array is reset on server restart → all tokens become invalid

---

## 3. FRONTEND TOKEN STORAGE

### Location
- **File:** `services/userService.ts`
- **Keys:** 
  - `vc_auth_token` (line 4)
  - `vc_user_id` (line 5)

### Implementation
```typescript
// Storage (line 23-25)
export const setCurrentUser = (userId: string, token: string) => {
  localStorage.setItem(USER_ID_KEY, userId);      // 'vc_user_id'
  localStorage.setItem(AUTH_TOKEN_KEY, token);   // 'vc_auth_token'
};

// Retrieval (line 12-21)
export const getCurrentUser = (): User | null => {
  const userId = localStorage.getItem(USER_ID_KEY);
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  
  if (!userId || !token) {
    return null;
  }
  
  return { id: userId, token };
};
```

### Storage Type
- **Backend:** localStorage (persists across browser sessions)
- **No expiration:** Tokens stored indefinitely
- **No refresh:** No token refresh mechanism

---

## 4. FRONTEND TOKEN USAGE

### Location
- **File:** `services/aiService.ts`
- **Function:** `getAuthHeaders()` (lines 23-34)

### Implementation
```typescript
const getAuthHeaders = () => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${user.token}`,  // Format: "Bearer <token>"
  };
};
```

### Header Format
- **Format:** `Authorization: Bearer <token>`
- **Space:** Single space between "Bearer" and token
- **Used in:** All API calls (`sendMessageToArchetype`, `startCouncilSession`, `sendMessageToCouncil`)

### Error Handling
- **Current:** Throws error if user not authenticated
- **Missing:** No 401 handling to clear invalid tokens
- **Missing:** No retry logic or auto-logout

---

## 5. PROTECTED ROUTE: /api/council

### Location
- **File:** `server/server.ts`
- **Route:** `POST /api/council` (line 153)
- **Protection:** `authenticate` middleware (line 153)

### Protection Flow
1. Request arrives → `authenticate` middleware runs
2. Extracts token from `Authorization: Bearer <token>` header
3. Looks up token in in-memory `users[]` array
4. If found: sets `req.user` and continues
5. If not found: returns 401 "Unauthorized: Invalid token"

### User Identity
- **Source:** `req.user.id` (from authenticated user object)
- **Validation:** Server-side only (not from request body)
- **Status:** ✅ Secure (fixed in previous stabilization)

---

## 6. ENVIRONMENT VARIABLES

### Backend (server/server.ts)
| Variable | Used For | Required | Default |
|----------|----------|----------|---------|
| `PORT` | Server port | No | `3001` |
| `NODE_ENV` | Error sanitization, CORS | No | `development` |
| `OPENAI_API_KEY` | OpenAI API calls | Yes | None (fails gracefully) |
| `ALLOWED_ORIGINS` | CORS whitelist | No | `['http://localhost:3000']` |

### Frontend (services/aiService.ts)
| Variable | Used For | Required | Default |
|----------|----------|----------|---------|
| `VITE_API_BASE_URL` | Backend URL | Yes (prod) | `http://localhost:3001` |
| `VITE_API_URL` | Backend URL (alt) | No | None |

### Missing Variables
- ❌ **No `JWT_SECRET`** - System doesn't use JWT
- ❌ **No `AUTH_SECRET`** - System doesn't use cryptographic tokens
- ❌ **No `TOKEN_EXPIRY`** - Tokens never expire
- ❌ **No `DATABASE_URL`** - No database (in-memory only)

---

## 7. CORE FLOWS & AUTHENTICATION

### Flow 1: Single Chat ("Einzelgespräch")
- **Component:** `components/ChatInterface.tsx`
- **Service:** `services/aiService.ts::sendMessageToArchetype()`
- **Backend:** `POST /api/council` (protected by `authenticate`)
- **Auth:** Uses `getAuthHeaders()` → `Authorization: Bearer <token>`
- **Status:** ✅ Works when token is valid, ❌ Fails with 401 when token invalid

### Flow 2: Council Session (ThoughtChamber)
- **Component:** `components/CouncilSession.tsx`
- **Service:** `services/aiService.ts::startCouncilSession()` / `sendMessageToCouncil()`
- **Backend:** `POST /api/council` (protected by `authenticate`)
- **Auth:** Uses `getAuthHeaders()` → `Authorization: Bearer <token>`
- **Status:** ✅ Works when token is valid, ❌ Fails with 401 when token invalid

### Flow 3: Questlog Integration
- **Component:** `components/CouncilSession.tsx` → "Integrate" button
- **Handler:** `handleIntegrateAndAdjourn()` (line 151-167)
- **Backend:** ❌ No backend endpoint (stubbed for MVP)
- **Status:** ⚠️ Stubbed - just closes session, no actual integration
- **Note:** Would need auth if backend endpoint added

---

## 8. ERROR HANDLING CURRENT STATE

### Backend (server/server.ts)
- **401 Missing Token:** `"Unauthorized: Missing or invalid token"`
- **401 Invalid Token:** `"Unauthorized: Invalid token"`
- **500 Errors:** Sanitized in production (line 201-203)

### Frontend (services/aiService.ts)
- **Network Errors:** Caught and logged (line 80-90, 133-143, 187-197)
- **401 Errors:** ❌ **NOT HANDLED** - No token clearing, no auto-logout
- **User Experience:** Error message shown, but user stays "logged in" with invalid token

---

## 9. TOKEN LIFECYCLE ISSUES

### Current Problems
1. **No Persistence:** Tokens lost on server restart
2. **No Expiration:** Tokens never expire (security risk)
3. **No Refresh:** No token refresh mechanism
4. **No Invalidation:** No way to invalidate tokens
5. **No Migration:** Old tokens become invalid after restart with no UX handling

### Impact
- **Production:** Render restarts → all users get 401 errors
- **User Experience:** Users see "Invalid token" but stay "logged in"
- **Workaround:** Users must manually clear localStorage and re-login

---

## 10. FILES INVOLVED IN AUTH

### Backend
- `server/server.ts` - Token issuance, verification, protected routes

### Frontend
- `services/userService.ts` - Token storage/retrieval (localStorage)
- `services/aiService.ts` - Token usage in API calls
- `components/LoginScreen.tsx` - Login flow (calls `login()`)
- `App.tsx` - Auth state management

---

## 11. DIAGNOSTIC GAPS

### Missing Diagnostics
- ❌ No `/health` endpoint with auth status
- ❌ No `/auth/debug` endpoint for token diagnostics
- ❌ No logging of token validation failures
- ❌ No frontend detection of 401 → auto-logout

---

## SUMMARY: ROOT CAUSE

**Primary Issue:** In-memory token storage loses tokens on server restart.

**Secondary Issues:**
1. No frontend handling of 401 errors (no auto-logout)
2. No token expiration (security risk)
3. No diagnostics endpoints

**Fix Strategy:**
1. Add diagnostics endpoints (`/health`, `/auth/debug`)
2. Add frontend 401 handling (clear token, force re-login)
3. Improve error messages
4. Add token format validation
5. Consider token persistence (future improvement)

---

## NEXT STEPS

1. ✅ Audit complete
2. ⏳ Add diagnostics endpoints
3. ⏳ Add frontend 401 handling
4. ⏳ Improve error messages
5. ⏳ Test end-to-end
6. ⏳ Deploy and verify






