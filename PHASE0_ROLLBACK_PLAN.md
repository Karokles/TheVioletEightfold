# PHASE 0 — ROLLBACK PLAN

## Changes Identified for Questlog Tab

### Files Modified for Questlog Tab UI

#### 1. `App.tsx`
**Lines changed:**
- Line 7: Added `import { QuestlogInterface } from './components/QuestlogInterface';`
- Line 13: Added `BookOpen` to icon imports
- Line 20: Added `QUESTLOG = 'QUESTLOG'` to AppMode enum
- Line 195: Added questlog nav item: `{ mode: AppMode.QUESTLOG, icon: BookOpen, label: ... }`
- Lines 318-320: Added route handler: `{currentMode === AppMode.QUESTLOG && <QuestlogInterface ... />}`

**Impact:** Created new top-level tab in navigation

#### 2. `components/QuestlogInterface.tsx`
**Status:** Entirely new file (255 lines)
**Purpose:** Standalone questlog screen component
**Impact:** Created separate UI component for questlog display

### Files to KEEP (Backend/Data Layer)

These are NOT part of the Questlog tab and should remain:
- `types.ts` - Meaning schema types (needed for data)
- `server/server.ts` - Meaning agent endpoints (needed for functionality)
- `server/supabase.ts` - Persistence functions (needed for data)
- `services/aiService.ts` - Meaning agent service (needed for integration)
- `components/CouncilSession.tsx` - Integration handler (needed for functionality)

### Minimal Rollback Steps

1. **Remove Questlog tab from App.tsx:**
   - Remove `QuestlogInterface` import
   - Remove `BookOpen` icon import (if not used elsewhere)
   - Remove `QUESTLOG` from AppMode enum
   - Remove questlog nav item from navItems array
   - Remove questlog route handler

2. **Delete or repurpose QuestlogInterface.tsx:**
   - Option A: Delete entirely (preferred if redundant)
   - Option B: Keep but mark unused (if might be useful later)

3. **Integrate questlog data into StatsInterface.tsx:**
   - Add questlog entries panel
   - Enhance timeline panel (already exists, just needs data connection)
   - Add breakthroughs panel (or integrate into existing timeline)
   - Connect to `getMeaningState()` service
   - Update on integrate action

---

## PHASE 1 — REMOVE QUESTLOG TAB

### Steps:
1. Edit `App.tsx`:
   - Remove QuestlogInterface import
   - Remove BookOpen import (check if used elsewhere first)
   - Remove QUESTLOG enum value
   - Remove questlog nav item
   - Remove questlog route

2. Delete `components/QuestlogInterface.tsx`

3. Verify:
   - App builds without errors
   - Navigation works (3 tabs: Direct Counsel, Council Session, Soul Blueprint)
   - No references to QuestlogInterface remain

---

## PHASE 2 — WIRE INTO SOUL BLUEPRINT

### Current StatsInterface Structure:
- Column 1: Attributes & Inventory
- Column 2 & 3: Soul Timeline (milestones)

### Proposed Integration:
- Keep existing layout
- Add Questlog Entries panel (new section, maybe above timeline or in column 1)
- Enhance Soul Timeline to show both milestones AND timeline events
- Add Breakthroughs panel (or integrate into timeline with special styling)

### Data Flow:
1. StatsInterface loads meaning state on mount via `getMeaningState()`
2. Displays questlog entries, timeline events, breakthroughs
3. Updates when integrate action completes (via props or state refresh)

---

## PHASE 3 — ACCEPTANCE TESTS

1. ✅ No "Questlog" tab in navigation
2. ✅ Soul Blueprint shows questlog entries
3. ✅ Soul Blueprint shows timeline events
4. ✅ Soul Blueprint shows breakthroughs
5. ✅ Integrate action updates Soul Blueprint immediately
6. ✅ Data persists on reload

