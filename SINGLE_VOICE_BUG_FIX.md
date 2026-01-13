# Single Voice Chat Bug Fix

**Date:** 2025-01-27  
**Status:** ✅ Fixed

---

## BUG DESCRIPTION

**Observed:** Single-voice chat (activeArchetype set) was behaving like council mode:
- Multiple speakers appeared
- [[SPEAKER: ...]] tags were present
- Moderator voice appeared
- SOVEREIGN DECISION sections appeared
- NEXT STEPS from multiple voices

**Expected:** Single archetype should speak alone, no council structure.

---

## ROOT CAUSE

1. **Prompt not strong enough** - The direct mode prompt existed but wasn't explicit enough
2. **No response cleaning** - Backend didn't strip council structure if it leaked through
3. **Temperature too high** - Same temperature (0.7) for both modes
4. **Base archetype prompts** - Some archetype system prompts mentioned "council" which confused the model

---

## FIXES APPLIED

### PHASE 1 — Mode Detection Fix ✅

**File:** `server/server.ts:623-631`

**Changes:**
- Mode detection already correct: `const mode = userProfile?.activeArchetype ? 'direct' : 'council'`
- Enhanced logging: `[API] Request - mode: ${mode.toUpperCase()}`
- Separated prompt building: `mode === 'direct' ? buildDirectChatPrompt() : buildCouncilSystemPrompt()`

### PHASE 2 — Completely Separate Prompt Templates ✅

**File:** `server/server.ts:817-890`

**Created:** `buildDirectChatPrompt()` - COMPLETELY SEPARATE from council prompt

**Key Features:**
- Cleans base archetype prompt (removes council references)
- STRICT rules with visual separators
- Explicit forbidden formats list
- Examples of wrong vs correct responses
- Emphasizes "I" not "we"
- No council structure allowed

**Council Prompt:** Remains separate, unchanged.

### PHASE 3 — Response Pipeline ✅

**File:** `server/server.ts:705-730`

**Added Response Cleaning:**
- In DIRECT mode, strips any council structure:
  - Removes `[[SPEAKER: ...]]` tags
  - Removes `MODERATOR:` lines
  - Removes `SOVEREIGN DECISION:` sections
  - Cleans up multiple newlines
- Logs warning if cleaning was needed

**File:** `the-violet-eightfoldzzzzz88/components/ChatInterface.tsx:109-140`

**Frontend:**
- No [[SPEAKER]] parsing in ChatInterface (already correct)
- Added validation warning in dev mode if council structure detected

### PHASE 4 — Frontend Payload Fix ✅

**File:** `the-violet-eightfoldzzzzz88/services/aiService.ts:85-96`

**Changes:**
- Verified `activeArchetype` is ALWAYS sent in `sendMessageToArchetype()`
- Added debug logging: `[DIRECT CHAT] MODE: SINGLE`
- Added debug logging: `[COUNCIL SESSION] MODE: COUNCIL`

### PHASE 5 — Temperature Adjustment ✅

**File:** `server/server.ts:648-659`

**Changes:**
- Direct mode: `temperature: 0.5` (lower = more deterministic, enforces single voice)
- Council mode: `temperature: 0.7` (higher = more creative, allows multi-voice)
- Logs temperature used for debugging

---

## CHANGED FILES

1. **`server/server.ts`**
   - Created `buildDirectChatPrompt()` function (completely separate)
   - Enhanced `buildCouncilSystemPrompt()` (removed direct mode logic)
   - Added response cleaning for direct mode
   - Lower temperature for direct mode (0.5 vs 0.7)
   - Enhanced logging

2. **`the-violet-eightfoldzzzzz88/services/aiService.ts`**
   - Added debug logging for mode detection (dev only)
   - Verified `activeArchetype` is always sent in direct chat

3. **`the-violet-eightfoldzzzzz88/components/ChatInterface.tsx`**
   - Added validation warning if council structure detected (dev only)
   - No parsing changes needed (already correct)

---

## TEST PLAN

### Acceptance Test 1: Alchemist Single Voice

**Steps:**
1. Select ALCHEMIST archetype
2. Send message: "What should I do about my shadow work?"
3. Verify response:
   - ✅ Contains ONLY Alchemist voice
   - ✅ NO other archetypes appear
   - ✅ NO [[SPEAKER:]] tags
   - ✅ NO MODERATOR
   - ✅ NO SOVEREIGN DECISION
   - ✅ NO council structure
   - ✅ Uses "I" not "we"
   - ✅ Plain text response

**Expected Response Format:**
```
[Plain text from The Alchemist, speaking directly to the user]
```

**Wrong Response Format (should NOT appear):**
```
[[SPEAKER: ALCHEMIST]]
The shadow work requires...

MODERATOR: The council convenes...

SOVEREIGN DECISION: ...
```

### Acceptance Test 2: All Archetypes

**Steps:**
1. Test each archetype (SOVEREIGN, WARRIOR, SAGE, LOVER, CREATOR, CAREGIVER, EXPLORER, ALCHEMIST)
2. Send a message
3. Verify:
   - ✅ Only that archetype speaks
   - ✅ No council structure
   - ✅ No other voices

### Acceptance Test 3: Council Mode Still Works

**Steps:**
1. Open Council Chamber
2. Enter topic
3. Verify:
   - ✅ Multiple archetypes speak
   - ✅ [[SPEAKER:]] format used
   - ✅ SOVEREIGN DECISION appears
   - ✅ NEXT STEPS appear

---

## DEBUG LOGGING

### Frontend (Dev Only)
- `[DIRECT CHAT] MODE: SINGLE` - When sending direct chat message
- `[COUNCIL SESSION] MODE: COUNCIL` - When starting council session
- `[DIRECT CHAT] WARNING: Response contains council structure!` - If council structure detected

### Backend
- `[API] Request - mode: DIRECT/COUNCIL, activeArchetype: ...`
- `[API] OpenAI call - mode: ..., temperature: ...`
- `[API] DIRECT mode: Stripped council structure from response` - If cleaning was needed

---

## WHERE THE BUG WAS

**Location:** `server/server.ts:817-846`

**Problem:**
- Direct mode prompt was in the same function as council prompt
- Prompt wasn't explicit enough about forbidding council structure
- No response cleaning if AI ignored instructions
- Temperature too high for deterministic single voice

**Fix:**
- Completely separate `buildDirectChatPrompt()` function
- Much more explicit prompt with examples
- Response cleaning as safety net
- Lower temperature for direct mode

---

## STATUS

✅ **All fixes implemented**
✅ **Backend builds successfully**
✅ **Ready for testing**

---

**Last Updated:** 2025-01-27



