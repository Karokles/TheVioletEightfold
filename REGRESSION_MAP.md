# Regression Map: Current vs Expected Behavior

**Date:** 2025-01-27  
**Status:** Analysis Complete

---

## PHASE 0 — VERIFICATION

### Repo Status
- **Root:** `C:/Users/lionc/OneDrive/Pictures/LAZARUS/the-violet-eightfoldCoreUsabilityCheck`
- **Branch:** `main`
- **Working Tree:** Modified files present (expected)
- **Reference Directory:** `./_reference/original/` - **NOT FOUND** (will work from code analysis)

---

## IDENTIFIED REGRESSIONS

### 1. Direct Chat Voice Switching (HIGH PRIORITY)

**Current Behavior:**
- `ChatInterface.tsx:36-39` - useEffect resets messages when `activeArchetype` changes
- **Problem:** No AbortController to cancel in-flight requests when switching
- **Problem:** `getInitMessage()` is called in useEffect but also in useState initializer - potential stale closure
- **Problem:** Conversation history might leak between archetypes if messages aren't properly filtered

**Expected Behavior:**
- When `activeArchetype` changes: greeting + persona changes immediately
- Conversation state resets completely (per-archetype isolation)
- In-flight requests are cancelled when switching

**Files to Fix:**
- `components/ChatInterface.tsx` - Add AbortController, improve reset logic

---

### 2. Council Chamber Output Style (HIGH PRIORITY)

**Current Behavior:**
- `server/server.ts:845-879` - Basic prompt, only asks for `[[SPEAKER:]]` format
- No structured format enforcement (moderator summary, NEXT STEPS, etc.)
- Responses can be generic/dull

**Expected Behavior:**
- Structured output format:
  - Short "Moderator summary" (1–2 lines)
  - 4–8 archetype lines, each prefixed: "SOVEREIGN:", "SAGE:", etc.
  - End with "SOVEREIGN DECISION:" + "NEXT STEPS:" bullet list

**Files to Fix:**
- `server/server.ts` - Enhance `buildCouncilSystemPrompt()` to enforce structured format

---

### 3. UI Regressions (MEDIUM PRIORITY)

**Current Behavior:**
- `components/RoundTable.tsx` - Reduced dimensions (radius: 65, center: 90)
- Layout classes may have changed

**Expected Behavior:**
- Proper sizing/positioning
- No overlay collisions
- Responsive breakpoints work correctly

**Files to Check:**
- `components/RoundTable.tsx`
- `components/ChatInterface.tsx` (layout classes)
- `App.tsx` (overall layout)

---

## FIX PLAN

### PHASE 1: Direct Chat Voice Switching
1. Add `useRef<AbortController | null>(null)` to track active request
2. Cancel previous request when `activeArchetype` changes
3. Ensure `getInitMessage()` uses current `activeArchetype` (fix closure)
4. Add loading state to prevent concurrent sends

### PHASE 2: Council Output Style
1. Update `buildCouncilSystemPrompt()` to enforce structured format
2. Add example output format to prompt
3. Ensure temperature/model settings support structured output

### PHASE 3: UI Regressions
1. Compare current RoundTable dimensions with expected
2. Check for layout class changes
3. Verify responsive breakpoints

---

## TEST PLAN

### Direct Chat
1. Switch between archetypes rapidly
2. Verify greeting changes immediately
3. Verify conversation resets
4. Verify no "responds only after multiple tries"

### Council Chamber
1. Start a council session
2. Verify structured output format
3. Verify no double-send
4. Verify no silent failures

### Auth Flow
1. Test with invalid token
2. Verify storage cleared
3. Verify session-expired message shown

---

**Next Steps:** Implement fixes in order of priority.



