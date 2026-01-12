# Communication Handling + Questlog Integration Fix Plan

**Date:** 2025-01-27  
**Target:** `the-violet-eightfoldzzzzz88` folder

---

## PHASE 0 — FACT FINDING ✅

### Current Architecture
- **zzzzzz88 folder:** Uses `geminiService.ts` - direct Gemini API calls (no backend)
- **Main repo:** Uses `services/aiService.ts` - calls backend `/api/council` endpoint
- **Issue:** zzzzzz88 direct chat gets council-style responses (MODERATOR + [[SPEAKER]])
- **Issue:** Questlog integration uses local `analyzeSessionForUpdates` but types mismatch

### Key Findings
1. `ChatInterface.tsx` calls `sendMessageToArchetype` from `geminiService.ts`
2. `geminiService.ts` uses archetype's `systemPrompt` directly - no mode enforcement
3. `CouncilSession.tsx` calls `analyzeSessionForUpdates` which returns `ScribeAnalysis`
4. Backend `/api/integrate` returns different structure than `ScribeAnalysis`
5. No backend API calls in zzzzzz88 folder currently

### Decision
**Create `aiService.ts` in zzzzzz88 folder** that:
- Calls backend `/api/council` for both direct chat and council
- Sets `activeArchetype` in payload for direct chat mode
- Calls backend `/api/integrate` for questlog integration
- Maintains existing UI components (no redesign)

---

## PHASE 1 — CREATE aiService.ts

**File:** `the-violet-eightfoldzzzzz88/services/aiService.ts`

**Functions:**
- `sendMessageToArchetype()` - calls `/api/council` with `activeArchetype` set
- `startCouncilSession()` - calls `/api/council` without `activeArchetype`
- `sendMessageToCouncil()` - calls `/api/council` without `activeArchetype`
- `integrateSession()` - calls `/api/integrate` and maps response to `ScribeAnalysis`

**Requirements:**
- Use `API_BASE_URL` from env (or default)
- Include auth headers (get from userService or localStorage)
- Handle 401 errors (clear tokens, redirect to login)
- Stream responses properly

---

## PHASE 2 — UPDATE COMPONENTS

**Files:**
1. `ChatInterface.tsx` - switch from `geminiService` to `aiService`
2. `CouncilSession.tsx` - switch from `geminiService` to `aiService`
3. Ensure no [[SPEAKER]] parsing in direct chat mode

---

## PHASE 3 — FIX BACKEND PROMPT

**File:** `server/server.ts` - `buildCouncilSystemPrompt()`

**Changes:**
- Direct mode: Explicitly forbid MODERATOR and [[SPEAKER]] format
- Council mode: Remove generic MODERATOR, use original style (Reductive Protocol)
- Add backend log for mode detection

---

## PHASE 4 — QUESTLOG INTEGRATION

**File:** `services/aiService.ts` - `integrateSession()`

**Changes:**
- Call `/api/integrate` endpoint
- Map backend response to `ScribeAnalysis` type
- Handle 401 errors
- Add UI feedback (success/failure)

---

## PHASE 5 — CONCURRENCY FIXES

**Files:**
- `ChatInterface.tsx` - disable send button while pending
- Prevent double-submit (onKeyDown + onClick)
- Add AbortController for rapid switches

---

**Status:** Ready to implement

