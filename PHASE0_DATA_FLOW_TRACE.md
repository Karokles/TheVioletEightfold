# PHASE 0 — DATA FLOW TRACE

## ROOT CAUSE IDENTIFIED

**Bug:** Breakthroughs appear in Soul Timeline (as milestones with BREAKTHROUGH badge) but Breakthroughs panel shows "No breakthroughs".

**Root Cause:** Dual storage system creates inconsistency:
1. Breakthroughs stored in `breakthroughs[]` array (MeaningAnalysisResult)
2. Breakthroughs ALSO converted to `Milestone` and stored in `stats.milestones[]`
3. Timeline shows milestones (including breakthrough milestones) ✅
4. Breakthroughs panel reads from `breakthroughs[]` which may be empty/unsynced ❌

---

## DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│ 1. MEANING AGENT (server/server.ts:900-1095)                │
│    POST /api/meaning/analyze                                │
│    Returns: MeaningAnalysisResult {                         │
│      questLogEntries: [...],                                │
│      soulTimelineEvents: [...],                             │
│      breakthroughs: [{id, title, insight, ...}]  ← HERE    │
│    }                                                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. PERSISTENCE (server/server.ts:1039-1087)                 │
│    - Persists to Supabase:                                  │
│      * questlog_entries table                               │
│      * soul_timeline_events table                           │
│      * breakthroughs table ← HERE                           │
│    - Returns same MeaningAnalysisResult                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. FRONTEND SERVICE (services/aiService.ts:332-426)          │
│    analyzeMeaning() receives MeaningAnalysisResult          │
│    - Persists to localStorage:                              │
│      merged = {                                             │
│        breakthroughs: [...data.breakthroughs, ...existing] ← HERE
│      }                                                      │
│    - Returns MeaningAnalysisResult                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. COUNCIL SESSION (components/CouncilSession.tsx:189-214)  │
│    Receives MeaningAnalysisResult                           │
│    - Converts FIRST breakthrough to Milestone:              │
│      newMilestone = {                                       │
│        id: breakthrough.id,                                 │
│        title: breakthrough.title,                           │
│        type: 'BREAKTHROUGH', ← HERE                         │
│        ...                                                   │
│      }                                                      │
│    - Creates ScribeAnalysis with newMilestone               │
│    - Calls onIntegrate(analysis)                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. APP STATE (App.tsx:91-108)                               │
│    handleScribeUpdate(updates: ScribeAnalysis)              │
│    - Adds milestone to stats.milestones[] ← HERE           │
│    - Triggers StatsInterface refresh (key increment)        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. STATS INTERFACE (components/StatsInterface.tsx:12-26)     │
│    - Loads via getMeaningState()                           │
│    - Sets breakthroughs state from meaningState.breakthroughs ← HERE
│    - Displays stats.milestones in Timeline ✅               │
│    - Displays breakthroughs[] in Breakthroughs panel ❌     │
└─────────────────────────────────────────────────────────────┘
```

---

## FILE + LINE REFERENCES

### 1. Meaning Agent Response Type
- **File:** `types.ts:170-178`
- **Type:** `MeaningAnalysisResult`
- **Fields:** `breakthroughs: Breakthrough[]`

### 2. Meaning Agent Endpoint
- **File:** `server/server.ts:900-1095`
- **Endpoint:** `POST /api/meaning/analyze`
- **Returns:** `MeaningAnalysisResult` with `breakthroughs[]` array
- **Line 1034-1037:** Ensures breakthroughs have `createdAt` and `id`
- **Line 1069-1080:** Persists breakthroughs to Supabase `breakthroughs` table

### 3. Frontend Service - Storage
- **File:** `services/aiService.ts:332-426`
- **Function:** `analyzeMeaning()`
- **Line 390:** Receives `MeaningAnalysisResult` from backend
- **Line 413-416:** Merges breakthroughs: `[...data.breakthroughs, ...existingData.breakthroughs]`
- **Line 419:** Persists to localStorage key: `user_${userId}_meaning_state`

### 4. Council Session - Conversion
- **File:** `components/CouncilSession.tsx:189-214`
- **Line 189:** Calls `analyzeMeaning()` → gets `MeaningAnalysisResult`
- **Line 205-212:** Converts FIRST breakthrough to `Milestone`:
  ```typescript
  newMilestone: meaningResult.breakthroughs.length > 0 ? {
    id: meaningResult.breakthroughs[0].id,
    title: meaningResult.breakthroughs[0].title,
    type: 'BREAKTHROUGH' as const,
    ...
  } : undefined
  ```

### 5. App State - Milestone Storage
- **File:** `App.tsx:91-108`
- **Function:** `handleScribeUpdate()`
- **Line 99-100:** Adds milestone to `stats.milestones[]`:
  ```typescript
  if (updates.newMilestone) {
    newStats.milestones = [updates.newMilestone, ...prev.milestones];
  }
  ```

### 6. Stats Interface - Data Loading
- **File:** `components/StatsInterface.tsx:12-26`
- **Line 16:** State: `const [breakthroughs, setBreakthroughs] = useState<Breakthrough[]>([]);`
- **Line 25:** Loads: `setBreakthroughs(meaningState.breakthroughs || []);`
- **Line 20-26:** Calls `getMeaningState()` which loads from backend/localStorage

### 7. Stats Interface - Display
- **File:** `components/StatsInterface.tsx:162-190`
- **Line 168:** Breakthroughs panel checks: `breakthroughs.length === 0`
- **Line 173:** Displays: `breakthroughs.slice(0, 3).map((bt) => ...)`
- **Line 220-250:** Timeline displays: `stats.milestones.map((milestone) => ...)`
- **Line 240:** Shows BREAKTHROUGH badge if `milestone.type === 'BREAKTHROUGH'`

### 8. Get Meaning State
- **File:** `services/aiService.ts:428-476`
- **Function:** `getMeaningState()`
- **Line 441-454:** Tries backend first: `GET /api/meaning/state`
- **Line 461-465:** Falls back to localStorage: `user_${userId}_meaning_state`
- **Returns:** `MeaningAnalysisResult` with `breakthroughs[]` array

### 9. Backend Get State
- **File:** `server/server.ts:1105-1182`
- **Endpoint:** `GET /api/meaning/state`
- **Line 1117-1121:** Loads from Supabase:
  ```typescript
  const [questLogEntries, timelineEvents, breakthroughs] = await Promise.all([
    getQuestLogEntries(userId),
    getSoulTimelineEvents(userId),
    getBreakthroughs(userId) ← HERE
  ]);
  ```
- **Line 1143-1152:** Transforms breakthroughs to frontend format

---

## IDENTIFIED ISSUES

### Issue 1: Dual Storage System
- **Problem:** Breakthroughs stored in TWO places:
  1. `breakthroughs[]` array (MeaningAnalysisResult) → used by Breakthroughs panel
  2. `stats.milestones[]` array (UserStats) → used by Timeline
- **Impact:** If `breakthroughs[]` is empty but milestone exists, panel shows "No breakthroughs"

### Issue 2: No Normalization
- **Problem:** No function ensures breakthroughs appear in both places
- **Impact:** Data can be inconsistent between timeline and panel

### Issue 3: localStorage Merge Logic
- **File:** `services/aiService.ts:413-416`
- **Problem:** Simple array merge: `[...data.breakthroughs, ...existingData.breakthroughs]`
- **Impact:** No deduplication, could create duplicates

### Issue 4: Missing Type Field in Timeline Events
- **File:** `types.ts:130-138`
- **Problem:** `SoulTimelineEvent` has no `type` field
- **Impact:** Cannot filter timeline events by type (e.g., "BREAKTHROUGH")

---

## SOLUTION STRATEGY

### Option A (Recommended): Derive Breakthroughs from Timeline
- Remove `breakthroughs[]` as separate storage
- Breakthroughs panel derives from `soulTimelineEvents.filter(e => e.type === 'BREAKTHROUGH')`
- OR derive from `stats.milestones.filter(m => m.type === 'BREAKTHROUGH')`
- **Pros:** Single source of truth, no duplication
- **Cons:** Requires adding `type` field to `SoulTimelineEvent`

### Option B: Normalize on Integration
- Keep both storage systems
- Add normalization function that ensures:
  - Every breakthrough in `breakthroughs[]` also appears as milestone
  - Every breakthrough milestone also appears in `breakthroughs[]`
- **Pros:** Maintains existing structure
- **Cons:** More complex, still dual storage

### Option C: Remove Milestone Conversion
- Stop converting breakthroughs to milestones
- Only store in `breakthroughs[]` and `soulTimelineEvents[]`
- Timeline shows both milestones AND timeline events
- **Pros:** Cleaner separation
- **Cons:** Breaks backward compatibility with existing milestones

---

## RECOMMENDED FIX: Option A

1. Add `type?: string` field to `SoulTimelineEvent` interface
2. Update meaning agent to include `type: "BREAKTHROUGH"` in timeline events
3. Change Breakthroughs panel to derive from timeline events:
   ```typescript
   const breakthroughs = timelineEvents.filter(e => e.type === 'BREAKTHROUGH');
   ```
4. Keep milestone conversion for backward compatibility (optional)
5. Add normalization to prevent duplicates



