# Audit Findings - Production Stabilization

**Date:** 2025-01-27  
**Branch:** stabilize-prod  
**Repository:** Karokles/TheVioletEightfold

---

## Executive Summary

This audit maps the three core flows (Single Chat, Council Session, Questlog Integration) and identifies critical issues for production deployment on Render (backend) and Vercel (frontend).

---

## 1. Frontend API Base URL Usage

### Current Implementation
- **File:** `services/aiService.ts:5`
- **Pattern:** `const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001';`
- **Issue:** Falls back to localhost in production if env var is missing
- **Risk:** Production builds may call localhost instead of Render backend

### All API Calls Found
1. `sendMessageToArchetype()` → `POST /api/council` (Single Chat)
2. `startCouncilSession()` → `POST /api/council` (Council Session - Start)
3. `sendMessageToCouncil()` → `POST /api/council` (Council Session - Continue)
4. `login()` → `POST /api/login` (Authentication)

**All calls use:** `API_BASE_URL` constant from `aiService.ts`

---

## 2. Backend Routes & Data Flow

### Health Endpoint
- **Route:** `GET /api/health`
- **Current Response:** `{ ok: true }`
- **Required Response:** `{ status: "ok" }` (per requirements)
- **Status:** ✅ Exists, needs minor fix

### Authentication Flow
- **Route:** `POST /api/login`
- **Flow:** Username + secret → hash comparison → token generation → return userId + token
- **Storage:** Token stored in-memory on user object
- **Status:** ✅ Working, but tokens lost on server restart

### Council Endpoint (Used by all three flows)
- **Route:** `POST /api/council`
- **Auth:** Protected by `authenticate` middleware
- **Request Body:** `{ userId, messages, userProfile }`
- **Issue:** ⚠️ **CRITICAL SECURITY FLAW** - `userId` from request body is NOT validated against `req.user.id`
- **Risk:** User could send different userId and potentially access another user's context

### Data Persistence
- **Current:** All data stored in browser localStorage (per-user scoped)
- **Backend:** No database, no persistence layer
- **Status:** ✅ Works for MVP, but data lost if localStorage cleared

---

## 3. Core Flow Mapping

### Flow 1: Single Chat ("Einzelgespräch")
**Component:** `ChatInterface.tsx`  
**Service:** `sendMessageToArchetype()` in `aiService.ts`  
**Backend:** `POST /api/council` with `userProfile.activeArchetype` set  
**Persistence:** Messages stored in component state, lore/stats in localStorage  
**Status:** ✅ Functional, but needs auth validation fix

**Flow Steps:**
1. User selects archetype → `activeArchetype` state set
2. User types message → `handleSend()` called
3. `sendMessageToArchetype()` builds conversation history
4. POST to `/api/council` with `activeArchetype` in `userProfile`
5. Backend uses direct chat prompt (single archetype)
6. Response streamed back, displayed in chat
7. Messages persist in component state (lost on refresh)

### Flow 2: Council Session
**Component:** `CouncilSession.tsx`  
**Service:** `startCouncilSession()` / `sendMessageToCouncil()` in `aiService.ts`  
**Backend:** `POST /api/council` without `activeArchetype`  
**Persistence:** Dialogue history in component state, lore/stats in localStorage  
**Status:** ✅ Functional, but needs auth validation fix

**Flow Steps:**
1. User enters topic → `handleStart()` called
2. `startCouncilSession()` POSTs topic to `/api/council`
3. Backend uses council prompt (multi-archetype dialogue)
4. Response parsed for `[[SPEAKER: ARCHETYPE_ID]]` format
5. Dialogue turns displayed in UI
6. User can continue conversation → `handleReply()` → `sendMessageToCouncil()`
7. History persists in component state (lost on refresh)

### Flow 3: Questlog Integration
**Component:** `CouncilSession.tsx` → "Integrate" button  
**Service:** `handleIntegrateAndAdjourn()` (stubbed)  
**Backend:** ❌ No backend endpoint  
**Persistence:** Would update lore/stats via `onIntegrate()` callback  
**Status:** ⚠️ **INCOMPLETE** - Button exists but does nothing

**Current Implementation:**
- Button calls `handleIntegrateAndAdjourn()`
- Function only closes session (no analysis)
- Comment says: "Scribe analysis removed for MVP. Can be re-added later with backend support."
- `onIntegrate` callback exists in `App.tsx` (`handleScribeUpdate`) but never called

**Expected Flow (Not Implemented):**
1. User clicks "Integrate" after council session
2. Backend endpoint `/api/scribe` analyzes conversation
3. Returns `ScribeAnalysis` with lore/stats updates
4. Frontend updates localStorage via `handleScribeUpdate()`

---

## 4. Authentication & Data Isolation

### Current Auth Strategy
- **Type:** Bearer token (JWT-like, but not JWT)
- **Storage:** In-memory array `users[]`
- **Token Generation:** `randomBytes(32).toString('hex')`
- **Validation:** Token lookup in `authenticate` middleware

### Security Issues

#### Issue 1: userId Not Validated (CRITICAL)
**Location:** `server/server.ts:135`  
**Problem:** 
```typescript
const { userId, messages, userProfile } = req.body;
// userId from client is trusted, not validated against req.user.id
```
**Risk:** User could send `userId: 'otherUser'` and access their context  
**Fix Required:** Use `req.user.id` instead of `req.body.userId`

#### Issue 2: No Data Isolation Backend-Side
**Current:** All data in localStorage (client-side isolation)  
**Risk:** If backend ever stores user data, isolation must be enforced  
**Status:** ✅ Not an issue currently (no backend storage)

---

## 5. CORS Configuration

### Current Setup
**File:** `server/server.ts:21-26`  
**Config:**
```typescript
app.use(cors({
  origin: true, // Allow all origins for testing flexibility
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

### Issues
- ⚠️ `origin: true` allows all origins (security risk in production)
- ✅ Credentials enabled (required for auth tokens)
- ✅ Methods and headers correct

### Required Fix
- Restrict `origin` to Vercel frontend URL(s)
- Support multiple origins if needed (dev + prod)

---

## 6. Backend Deployment Readiness

### Render Requirements
- ✅ **PORT:** Uses `process.env.PORT || 3001` (correct)
- ✅ **Build:** `npm run build` exists in `server/package.json`
- ✅ **Start:** `npm start` exists (runs `node dist/server.js`)
- ✅ **Health:** `/api/health` endpoint exists
- ⚠️ **Root Directory:** Must be set to `server` in Render settings
- ⚠️ **Environment:** Needs `OPENAI_API_KEY` set

### Missing/Issues
- Health endpoint returns `{ ok: true }` instead of `{ status: "ok" }`
- No error handling for missing `OPENAI_API_KEY`
- No graceful shutdown handling

---

## 7. Frontend Deployment Readiness

### Vercel Requirements
- ✅ **Build:** `npm run build` exists
- ✅ **Output:** `dist/` directory (Vite default)
- ⚠️ **Environment:** Must set `VITE_API_BASE_URL` to Render URL
- ⚠️ **Fallback:** Falls back to localhost if env var missing (dangerous)

### Required Fix
- Add runtime check: throw error if `VITE_API_BASE_URL` missing in production build
- Or: Provide clear error message in UI

---

## 8. Error Handling & Logging

### Current State
- ✅ Basic try/catch in endpoints
- ✅ Error responses include messages
- ⚠️ Error messages may leak stack traces in production
- ⚠️ No structured logging
- ⚠️ No request ID tracking

### Recommendations
- Add request ID middleware
- Sanitize error messages in production
- Add structured logging (console.log is fine for MVP)

---

## 9. Testing & Verification Gaps

### Missing Tests
- ❌ No unit tests
- ❌ No integration tests
- ❌ No E2E tests
- ⚠️ No runtime assertions/guards

### Verification Steps Needed
1. Local backend health check
2. Local frontend → local backend
3. Local frontend → Render backend (production-like)
4. Vercel frontend → Render backend (full production)

---

## 10. Summary of Required Changes

### Critical (Must Fix)
1. ✅ Fix userId validation in `/api/council` (use `req.user.id`)
2. ✅ Update health endpoint response format
3. ✅ Restrict CORS to Vercel origin(s)
4. ✅ Add production check for `VITE_API_BASE_URL`

### Important (Should Fix)
5. ✅ Add error handling for missing `OPENAI_API_KEY`
6. ✅ Add runtime assertions for required env vars
7. ✅ Sanitize error messages in production

### Nice to Have (Future)
8. Questlog integration backend endpoint
9. Database persistence
10. Token refresh mechanism
11. Rate limiting

---

## 11. Files That Will Be Changed

1. `server/server.ts` - Auth validation, CORS, health endpoint, error handling
2. `services/aiService.ts` - Production env check, remove userId from body (use token only)
3. `server/package.json` - Verify build/start scripts (no changes expected)

---

## 12. Deployment Checklist (After Changes)

### Render (Backend)
- [ ] Root Directory: `server`
- [ ] Build Command: `npm install && npm run build`
- [ ] Start Command: `npm start`
- [ ] Environment Variables:
  - [ ] `OPENAI_API_KEY` (required)
  - [ ] `PORT` (optional, Render sets automatically)
  - [ ] `NODE_ENV=production` (optional)
- [ ] Verify health: `curl https://thevioleteightfold-4224.onrender.com/api/health`

### Vercel (Frontend)
- [ ] Framework Preset: Vite
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `dist`
- [ ] Environment Variables:
  - [ ] `VITE_API_BASE_URL=https://thevioleteightfold-4224.onrender.com`
- [ ] Verify frontend loads and calls backend

---

## 13. Debugging Runbook

### If Backend Doesn't Start on Render
1. Check Render logs for errors
2. Verify Root Directory is `server`
3. Verify Build Command: `npm install && npm run build`
4. Verify Start Command: `npm start`
5. Check `OPENAI_API_KEY` is set
6. Verify `PORT` is not hardcoded (uses `process.env.PORT`)

### If Frontend Calls Fail
1. Check browser Network tab - is URL correct?
2. Verify `VITE_API_BASE_URL` is set in Vercel
3. Check CORS errors in console
4. Verify backend health endpoint responds
5. Check backend logs for request errors

### If Auth Fails (401)
1. Verify token is sent in `Authorization: Bearer <token>` header
2. Check backend logs for token validation errors
3. Verify user exists in backend `users[]` array
4. Check if token was lost (server restart clears tokens)

### If CORS Errors
1. Check backend CORS config allows Vercel origin
2. Verify `credentials: true` is set
3. Check preflight OPTIONS requests succeed
4. Verify `Access-Control-Allow-Origin` header in response

### If Data Isolation Issues
1. Verify `req.user.id` is used (not `req.body.userId`)
2. Check localStorage keys are user-scoped (`user_${userId}_*`)
3. Verify no backend storage exists (all client-side)

---

## Next Steps

1. Create branch `stabilize-prod`
2. Implement fixes (minimal diffs)
3. Test locally
4. Commit and push
5. Deploy to Render/Vercel
6. Verify production

