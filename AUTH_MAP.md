# Authentication System Map

**Date:** 2025-01-27  
**Branch:** `fix/auth-401`  
**Issue:** 401 "Invalid token" for /api/council in production

---

## STEP 0: AUDIT MAP (NO CODE CHANGES)

### Backend Routes Related to Auth and Council

| Route | Method | Protection | File | Lines |
|-------|--------|------------|------|-------|
| `/api/health` | GET | Public | `server/server.ts` | 169-179 |
| `/api/auth/debug` | GET | `authenticate` | `server/server.ts` | 180-220 |
| `/api/login` | POST | Public | `server/server.ts` | 231-260 |
| `/api/council` | POST | `authenticate` | `server/server.ts` | 261-306 |

### Token Issuance (Login)

**Location:** `server/server.ts:231-260`

**Implementation:**
```typescript
// Line 247: Token generation
const token = randomBytes(32).toString('hex');
user.token = token;  // Stored in-memory on user object
```

**Characteristics:**
- **NOT JWT** - Simple random hex string (64 chars)
- **No expiration** - Tokens never expire
- **No secret** - No cryptographic signing
- **Storage:** In-memory `users[]` array (line 62-90)
- **Problem:** Tokens lost on server restart

**Environment Variables:**
- ❌ No `JWT_SECRET` - System doesn't use JWT
- ❌ No `AUTH_SECRET` - System doesn't use cryptographic tokens
- ❌ No `TOKEN_SECRET` - Not used

### Token Verification (Middleware)

**Location:** `server/server.ts:99-168` (authenticate middleware)

**Implementation:**
```typescript
// Line 141: Extract token
const token = authHeader.substring(7).trim();  // Remove "Bearer "

// Line 152: Lookup in-memory
const user = users.find(u => u.token === token);

// Line 158: Return 401 if not found
if (!user) {
  return res.status(401).json({ 
    error: 'Unauthorized: Invalid token',
    code: 'INVALID_TOKEN'
  });
}
```

**Token Location Expected:**
- Header: `Authorization: Bearer <token>`
- Format: Must start with "Bearer " (single space)
- Legacy: Also accepts `Authorization: <token>` (without Bearer)

**Verification Method:**
- **Type:** In-memory lookup (NOT cryptographic)
- **Storage:** `users[]` array (line 62-90)
- **Problem:** Array reset on server restart → all tokens invalid

**Current Error Response:**
```json
{
  "error": "Unauthorized: Invalid token",
  "code": "INVALID_TOKEN",
  "hint": "Token may have expired due to server restart. Please log in again."
}
```

### Frontend Token Storage

**Location:** `services/userService.ts`

**Storage Keys:**
- `vc_auth_token` (line 4) - Token value
- `vc_user_id` (line 5) - User ID

**Storage Type:**
- `localStorage` (persists across browser sessions)
- No expiration handling

**Functions:**
- `getCurrentUser()` (line 12-21) - Retrieves token from localStorage
- `setCurrentUser()` (line 23-26) - Stores token in localStorage
- `clearCurrentUser()` (line 28-31) - Removes token from localStorage

### Frontend Authorization Header

**Location:** `services/aiService.ts:23-34` (getAuthHeaders function)

**Implementation:**
```typescript
// Line 39: Format header
'Authorization': `Bearer ${token}`
```

**Normalization:**
- Line 33-36: Removes any existing "Bearer " prefix to prevent double prefix
- Ensures single "Bearer " prefix

**Used In:**
- `sendMessageToArchetype()` - Single chat
- `startCouncilSession()` - Council session start
- `sendMessageToCouncil()` - Council session continue

### Environment Variables

**Backend (`server/server.ts`):**
| Variable | Used For | Required | Current Status |
|----------|----------|----------|----------------|
| `PORT` | Server port | No | Defaults to 3001 |
| `NODE_ENV` | Error sanitization | No | Optional |
| `OPENAI_API_KEY` | OpenAI API | Yes | ✅ Validated |
| `ALLOWED_ORIGINS` | CORS whitelist | No | Defaults to localhost |

**Missing (Not Used):**
- ❌ `JWT_SECRET` - System doesn't use JWT
- ❌ `AUTH_SECRET` - System doesn't use cryptographic tokens
- ❌ `TOKEN_SECRET` - Not used

**Frontend (`services/aiService.ts`):**
| Variable | Used For | Required | Current Status |
|----------|----------|----------|----------------|
| `VITE_API_BASE_URL` | Backend URL | Yes (prod) | ✅ Validated in prod builds |
| `VITE_API_URL` | Backend URL (alt) | No | Fallback |

### Protected Route: /api/council

**Location:** `server/server.ts:261`

**Protection:**
- Middleware: `authenticate` (line 261)
- Flow: Request → authenticate → extract token → lookup user → set req.user → continue

**User Identity:**
- Source: `req.user.id` (from authenticated user object)
- Validation: Server-side only (secure)

### Core Flows

**Flow 1: Single Chat ("Einzelgespräch")**
- Component: `components/ChatInterface.tsx`
- Service: `services/aiService.ts::sendMessageToArchetype()`
- Backend: `POST /api/council` with `userProfile.activeArchetype` set
- Auth: Uses `getAuthHeaders()` → `Authorization: Bearer <token>`

**Flow 2: Council Session (ThoughtChamber)**
- Component: `components/CouncilSession.tsx`
- Service: `services/aiService.ts::startCouncilSession()` / `sendMessageToCouncil()`
- Backend: `POST /api/council` without `activeArchetype`
- Auth: Uses `getAuthHeaders()` → `Authorization: Bearer <token>`

**Flow 3: Questlog Integration**
- Component: `components/CouncilSession.tsx` → "Integrate" button
- Handler: `handleIntegrateAndAdjourn()` (stubbed - no backend endpoint)
- Status: ⚠️ Stubbed for MVP - just closes session

---

## ROOT CAUSE ANALYSIS

### Primary Issue
**In-memory token storage loses tokens on server restart.**

1. Tokens generated: `randomBytes(32).toString('hex')` (line 247)
2. Tokens stored: In-memory `users[]` array (line 248)
3. Server restart: Array reset → all `user.token` values lost
4. Frontend: Still has old tokens in localStorage
5. Result: 401 "Invalid token" errors

### Evidence
- **No JWT:** System uses simple random hex strings, not JWT
- **No persistence:** Tokens stored in-memory only
- **No expiration:** Tokens never expire (but become invalid on restart)
- **No secret:** No cryptographic signing (just random string lookup)

### Current State
- ✅ Token format validation improved (handles edge cases)
- ✅ Frontend 401 handling exists (clears tokens on 401)
- ✅ Diagnostics endpoint exists (`/api/auth/debug`)
- ❌ **Still vulnerable:** Tokens lost on restart (by design)

---

## FILES INVOLVED

### Backend
- `server/server.ts` - Routes, auth middleware, token issuance

### Frontend
- `services/userService.ts` - Token storage/retrieval
- `services/aiService.ts` - Token usage in API calls
- `App.tsx` - Auth state management
- `components/LoginScreen.tsx` - Login flow

---

## NEXT STEPS

1. ✅ Audit complete
2. ⏳ Add `/auth/diagnose` endpoint (public, safe)
3. ⏳ Improve error responses with structured reasons
4. ⏳ Ensure fail-fast if secrets missing (note: no secrets currently)
5. ⏳ Verify frontend 401 handling works
6. ⏳ Create smoke test
7. ⏳ Deploy and verify

---

**Note:** System does NOT use JWT. Tokens are simple random hex strings stored in-memory. This is by design for MVP, but causes tokens to be lost on server restart.






