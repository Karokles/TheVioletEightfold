# Theme Diagnosis

**Date:** 2025-01-27  
**Target:** `the-violet-eightfoldzzzzz88` folder

---

## PHASE 0 — FINDINGS

### 1. Active Archetype State
- **Location:** `App.tsx:47` - `const [activeArchetype, setActiveArchetype] = useState<ArchetypeId>(ArchetypeId.SOVEREIGN)`
- **Passed to:** `RoundTable.tsx:12` via props `activeArchetype`
- **Status:** ✅ Working correctly

### 2. Color Palette Source
- **Location:** `constants.ts:19-28` - `ARCHETYPE_CONFIG` with `color: 'from-amber-400 to-orange-500'` format
- **Problem:** Uses Tailwind gradient classes (`from-X to-Y`) which are:
  - ❌ Used in template strings: `bg-gradient-to-br ${activeColor}` (line 84)
  - ❌ Can be purged in production builds
  - ❌ Not accessible as CSS variables

### 3. Style Application
- **Location:** `RoundTable.tsx`
  - Line 18: `const activeColor = activeData.color` (gets Tailwind class string)
  - Line 48: Hardcoded `text-emerald-400` for ALL archetypes (should be per-archetype)
  - Line 84: `bg-gradient-to-br ${activeColor}` (dynamic Tailwind - can be purged)
  - Line 89: Hardcoded `bg-emerald-400` for center dot (should be per-archetype)
  - Line 120: Hardcoded `ring-emerald-400/80` for active ring (should be per-archetype)
  - Line 134-135: Hardcoded `bg-emerald-400/20` and `border-emerald-400/40` (should be per-archetype)

### 4. Why Colors Are Lost in Production
- ❌ **Dynamic Tailwind classes in template strings** - Tailwind purger doesn't detect them
- ❌ **Hardcoded emerald-400** - All archetypes show green instead of their own colors
- ❌ **No CSS variables** - Colors not available as CSS variables for stable production builds
- ❌ **Gradient classes** - `from-X to-Y` format not easily converted to CSS variables

### 5. Text Clipping Issue
- **Location:** `RoundTable.tsx:43` - Active Name Display container
- **Potential causes:**
  - Line 43: `px-6 md:px-8 py-2` - might not have enough vertical padding
  - Line 48: `text-xs md:text-sm` - text size might be too large for container
  - Line 45: Container might have `overflow-hidden` or insufficient height
  - Line 21: Parent container might clip content

---

## ROOT CAUSES

1. **All archetypes show green (emerald-400)** instead of their own colors
2. **Dynamic Tailwind classes** (`${activeColor}`) can be purged in production
3. **No CSS variable system** for stable color application
4. **Text clipping** likely due to insufficient container height/padding

---

## SOLUTION APPROACH

1. Create `theme/archetypeTheme.ts` with RGB color mappings
2. Use CSS variables via `data-archetype` attribute
3. Replace all hardcoded emerald-400 with CSS variables
4. Fix text clipping with proper container sizing

---

**Status:** Ready for PHASE 1 implementation

