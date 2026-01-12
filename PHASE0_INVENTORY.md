# PHASE 0 — INVENTORY REPORT

## A) CURRENT APP ANALYSIS

### 1. Questlog/Timeline/Breakthrough UI Components

**Location:** `components/StatsInterface.tsx`

**Expected Data Structure:**
- **Milestones (Soul Timeline):** `stats.milestones: Milestone[]`
  - Type: `Milestone` (lines 39-46 in `types.ts`)
  - Fields: `id`, `title`, `date`, `description`, `type: 'BREAKTHROUGH' | 'BENCHMARK' | 'REALIZATION'`, `icon`
  - Display: Lines 111-140 in `StatsInterface.tsx`
  - Shows "BREAKTHROUGH" badge for milestones with `type === 'BREAKTHROUGH'`

**Current Quest Display:**
- **Quest:** `stats.currentQuest: string` (line 51 in `StatsInterface.tsx`)
- Displayed as badge in header section

**Questlog Screen:**
- ❌ **NO SEPARATE QUESTLOG SCREEN EXISTS**
- Questlog entries are NOT currently displayed anywhere
- Only milestones (timeline) and current quest (header badge) are shown

### 2. Existing Integrate Logic

**Frontend Integration Button:**
- **Location:** `components/CouncilSession.tsx` line 513-520
- **Handler:** `handleIntegrateAndAdjourn()` (lines 168-207)
- **Flow:**
  1. Converts `history` (DialogueTurn[]) to `Message[]` format
  2. Calls `integrateSession(sessionHistory, topic)` from `services/aiService.ts`
  3. Receives `ScribeAnalysis` response
  4. Calls `onIntegrate(analysis)` callback

**Backend Integration Endpoint:**
- **Location:** `server/server.ts` lines 787-835
- **Route:** `POST /api/integrate`
- **Current Implementation:**
  - Accepts: `{ sessionHistory: Message[], topic?: string }`
  - Returns: **STUB DATA** (lines 820-826)
    ```json
    {
      "newLoreEntry": "Session integrated: ${topic} - ${sessionHistory.length} exchanges",
      "updatedQuest": null,
      "updatedState": null,
      "newMilestone": null,
      "newAttribute": null
    }
    ```
  - Persists to Supabase `lore_entries` table (type: 'integration') if configured
  - **NO AI ANALYSIS** - just returns placeholder

**Frontend Service:**
- **Location:** `services/aiService.ts` lines 332-378
- **Function:** `integrateSession(sessionHistory: Message[], topic?: string)`
- **Returns:** `Promise<ScribeAnalysis>`
- Maps backend response to `ScribeAnalysis` type

**Parent Handler:**
- **Location:** `App.tsx` lines 90-104
- **Function:** `handleScribeUpdate(updates: ScribeAnalysis)`
- **Updates:**
  - `newLoreEntry` → appends to `lore` state
  - `updatedQuest` → updates `stats.currentQuest`
  - `updatedState` → updates `stats.state`
  - `newMilestone` → prepends to `stats.milestones[]`
  - `newAttribute` → prepends to `stats.attributes[]`

### 3. Persistence Method

**Current Stats Storage:**
- **Method:** localStorage (per-user scoped)
- **Location:** `App.tsx` lines 67-87
- **Keys:** 
  - `user_lore` (string)
  - `user_stats` (JSON string of `UserStats`)
  - `user_map` (JSON string of `MapLocation[]`)
- **Loading:** On mount, reads from localStorage
- **Saving:** useEffect saves to localStorage when stats/lore change

**Backend Persistence (Supabase):**
- **Location:** `server/supabase.ts`
- **Tables Used:**
  - `lore_entries` (type: 'integration') - stores integration metadata
  - `council_sessions` - stores session transcripts
- **Current Integration Persistence:** 
  - `server/server.ts` lines 800-816
  - Creates `lore_entries` record with `content: { topic, sessionHistory, integratedAt }`
  - **NO SEPARATE TABLES** for questlog_entries, soul_timeline_events, or breakthroughs

**Fallback:**
- If Supabase not configured → no backend persistence
- Frontend always uses localStorage for stats

---

## B) Z88 REFERENCE ANALYSIS

### 1. Questlog/Timeline/Breakthrough Production

**Location:** `the-violet-eightfoldzzzzz88/services/geminiService.ts` lines 99-250

**Function:** `analyzeSessionForUpdates(historyText: string, currentStats: UserStats, lang: Language)`

**AI Analysis Pipeline:**
- Uses Gemini AI with structured JSON schema
- **Prompt:** Lines 145-167
  - Analyzes transcript for:
    1. Lore (summary)
    2. Milestone (breakthrough/epiphany)
    3. Attribute (skill/trait)
    4. Location (geographic significance)
    5. Quest/State changes
    6. Finance transactions
    7. Calendar events
- **Schema:** Lines 108-134
  - Returns `ScribeAnalysis` with:
    - `newLoreEntry?: string`
    - `updatedQuest?: string`
    - `newMilestone?: Milestone` (full object with id, title, date, description, type, icon)
    - `newAttribute?: Attribute` (full object)
    - `newLocation?: MapLocation`
    - `newCalendarEvent?: CalendarEvent`
    - `newTransaction?: Transaction`

**Integration Flow (z88):**
- **Location:** `the-violet-eightfoldzzzzz88/components/CouncilSession.tsx` lines 141-176
- **Handler:** `handleIntegrateAndAdjourn()`
- **Flow:**
  1. Converts history to `Message[]`
  2. Calls `integrateSession(sessionHistory, topic)` from `services/aiService.ts`
  3. Backend `/api/integrate` returns analysis
  4. Maps response to `ScribeAnalysis`
  5. Calls `onIntegrate(analysis)`

**Backend Integration (z88):**
- **Location:** `the-violet-eightfoldzzzzz88/services/aiService.ts` lines 332-398
- **Function:** `integrateSession()`
- Calls backend `/api/integrate` endpoint
- Maps response to `ScribeAnalysis` type

### 2. Data Schema (z88)

**Types:**
- **Location:** `the-violet-eightfoldzzzzz88/types.ts`
- **ScribeAnalysis:** Lines 107-116
  ```typescript
  {
    newLoreEntry?: string;
    newMilestone?: Milestone;
    newAttribute?: Attribute;
    newLocation?: MapLocation;
    updatedQuest?: string;
    updatedState?: string;
    newCalendarEvent?: CalendarEvent;
    newTransaction?: Transaction;
  }
  ```
- **Milestone:** Lines 40-47 (same as current app)
- **Attribute:** Lines 49-54 (same as current app)

**UI Consumption:**
- **Location:** `the-violet-eightfoldzzzzz88/components/StatsInterface.tsx`
- Same structure as current app
- Displays milestones in "Soul Timeline" section
- Shows breakthroughs with badge

### 3. Persistence (z88)

**Method:** localStorage only
- **Location:** `the-violet-eightfoldzzzzz88/App.tsx` lines 56-88
- **Keys:** `user_lore`, `user_stats`, `user_map`
- **No Supabase** in z88 reference

---

## C) DATA CONTRACT COMPARISON

### Current Data Contract (Expected by UI)

**StatsInterface expects:**
```typescript
{
  stats: {
    currentQuest: string;           // Displayed in header badge
    milestones: Milestone[];        // Displayed in "Soul Timeline" section
    attributes: Attribute[];        // Displayed in "Active Attributes" section
    state: string;                  // Displayed in header badge
  }
}
```

**ScribeAnalysis (Current):**
```typescript
{
  newLoreEntry?: string;            // Appended to lore
  newMilestone?: Milestone;         // Prepended to milestones[]
  newAttribute?: Attribute;         // Prepended to attributes[]
  updatedQuest?: string;            // Replaces currentQuest
  updatedState?: string;            // Replaces state
}
```

**Missing in Current App:**
- ❌ No questlog entries array (separate from milestones)
- ❌ No soul timeline events (separate from milestones)
- ❌ No breakthroughs array (breakthroughs are just milestones with type='BREAKTHROUGH')

### z88 Data Contract

**Same as Current App:**
- Uses `Milestone[]` for timeline (includes breakthroughs)
- Uses `ScribeAnalysis` for integration updates
- No separate questlog/timeline/breakthrough arrays

**Key Difference:**
- z88 has **AI analysis** that produces meaningful `Milestone` objects
- Current app has **stub endpoint** that returns nulls

---

## D) MISMATCH LIST

### 1. Missing Questlog Screen
- **Current:** No questlog screen exists
- **Required:** Need to create questlog screen that displays questlog entries
- **Files:** None (needs creation)
- **Expected Schema:** Questlog entries should have: `id`, `createdAt`, `title`, `content`, `tags?`, `relatedArchetypes?`, `sourceSessionId?`

### 2. Missing Separate Data Types
- **Current:** Only `Milestone[]` for timeline (breakthroughs are milestones with type='BREAKTHROUGH')
- **Required:** Separate arrays for:
  - `questLogEntries: QuestLogEntry[]`
  - `soulTimelineEvents: SoulTimelineEvent[]`
  - `breakthroughs: Breakthrough[]`
- **Files:**
  - `types.ts` - needs new type definitions
  - `components/StatsInterface.tsx` - needs UI updates

### 3. Backend Integration Endpoint Returns Stub
- **Current:** `server/server.ts` lines 820-826 returns placeholder data
- **Required:** AI analysis that produces real questlog/timeline/breakthrough records
- **Files:**
  - `server/server.ts` - `/api/integrate` endpoint needs AI integration

### 4. No Meaning Agent Endpoint
- **Current:** Only `/api/integrate` (returns ScribeAnalysis)
- **Required:** Separate `/api/meaning/analyze` endpoint that returns canonical `MeaningAnalysisResult`
- **Files:** None (needs creation)

### 5. No Persistence for Questlog/Timeline/Breakthroughs
- **Current:** Only localStorage for stats, Supabase for lore_entries
- **Required:** 
  - Supabase tables: `questlog_entries`, `soul_timeline_events`, `breakthroughs`
  - OR localStorage fallback (namespaced by userId)
- **Files:**
  - `server/supabase.ts` - needs new table functions
  - `server/server.ts` - needs persistence logic

### 6. No GET Endpoint for Questlog State
- **Current:** No endpoint to load persisted questlog/timeline/breakthroughs
- **Required:** `GET /api/meaning/state` or `GET /api/questlog` to hydrate UI
- **Files:** None (needs creation)

### 7. Single Mode Fix Status
- **Current:** Single mode IS passing `activeArchetype` correctly
  - `services/aiService.ts` line 91: `activeArchetype: archetypeId` in userProfile
  - `server/server.ts` line 624: `const mode = userProfile?.activeArchetype ? 'direct' : 'council'`
  - `server/server.ts` line 851-924: `buildDirectChatPrompt()` exists with strict single-voice rules
- **Status:** ✅ Already implemented (see `SINGLE_VOICE_BUG_FIX.md`)
- **Verification Needed:** Test that single chat responses never contain council structure
- **Files:**
  - `components/ChatInterface.tsx` - passes activeArchetype ✅
  - `server/server.ts` - uses activeArchetype to select direct mode ✅

---

## E) FILE REFERENCE SUMMARY

### Current App Files
- `types.ts` - Type definitions (lines 39-116)
- `components/StatsInterface.tsx` - UI for stats/timeline (lines 111-140)
- `components/CouncilSession.tsx` - Integrate button (lines 168-207, 513-520)
- `services/aiService.ts` - Integration service (lines 332-378)
- `server/server.ts` - Integration endpoint (lines 787-835)
- `App.tsx` - Parent handler (lines 90-104)
- `server/supabase.ts` - Persistence helpers (lines 104-135)

### z88 Reference Files
- `the-violet-eightfoldzzzzz88/types.ts` - Type definitions (lines 40-116)
- `the-violet-eightfoldzzzzz88/services/geminiService.ts` - AI analysis (lines 99-250)
- `the-violet-eightfoldzzzzz88/services/aiService.ts` - Integration service (lines 332-398)
- `the-violet-eightfoldzzzzz88/components/CouncilSession.tsx` - Integration handler (lines 141-176)
- `the-violet-eightfoldzzzzz88/components/StatsInterface.tsx` - UI (same structure)

---

## F) KEY FINDINGS

1. **Current app has NO questlog screen** - only shows milestones in StatsInterface
2. **Current app has NO AI analysis** - backend returns stub data
3. **z88 has AI analysis** but uses same data structure (Milestone[] for timeline)
4. **Both use localStorage** for stats persistence
5. **Current app has Supabase** but only for lore_entries, not questlog/timeline/breakthroughs
6. **Need to create canonical schema** that separates questlog, timeline events, and breakthroughs
7. **Need separate Meaning Agent endpoint** (not mixed with /api/council)
8. **Need persistence layer** for new data types

---

## NEXT STEPS (PHASE 1)

1. Create `MeaningAnalysisResult` type in `types.ts`
2. Update UI types to match canonical schema
3. Create questlog screen component
4. Update StatsInterface to show separate sections for questlog/timeline/breakthroughs

