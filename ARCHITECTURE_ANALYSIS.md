# Architecture Analysis & Refactoring Plan
## The Violet Eightfold - Inner Council App

---

## 1. PROJECT OVERVIEW

### High-Level Description
**The Violet Eightfold** is an AI-powered personal governance and psychological healing application. It simulates an "Inner Council" of 8 archetypal AI agents (Sovereign, Warrior, Sage, Lover, Creator, Caregiver, Explorer, Alchemist) that users can consult for life decisions, self-reflection, and strategic planning. The app maintains a "lifelong memory" system that tracks the user's psychological profile, milestones, attributes, calendar events, finances, and a "psychogeography" map of significant locations.

### Main Technologies
- **Frontend Framework**: React 19.2.0 with TypeScript
- **Build Tool**: Vite 6.2.0
- **AI Service**: Google Gemini API (`@google/genai` v1.30.0)
  - Models: `gemini-2.5-flash` (direct chat), `gemini-3-pro-preview` (council sessions)
- **UI Library**: Lucide React (icons)
- **Styling**: Tailwind CSS (via CDN in `index.html`)
- **State Management**: React hooks + localStorage (client-side persistence)

### Entry Points
- **Frontend Entry**: `index.tsx` → `App.tsx`
- **Build Config**: `vite.config.ts` (port 3000, loads `GEMINI_API_KEY` from env)
- **No Backend**: Pure client-side application
- **AI Service Layer**: `services/geminiService.ts` (handles all AI interactions)

---

## 2. FILE & RESPONSIBILITY MAP

| File/Folder | Responsibility | AI Calls | Prompts/System Messages | State Storage |
|------------|----------------|----------|------------------------|---------------|
| **`App.tsx`** | Main app orchestrator, routing, state management | ❌ | ❌ | ✅ localStorage (`user_lore`, `user_stats`, `user_map`) |
| **`index.tsx`** | React DOM root mount | ❌ | ❌ | ❌ |
| **`constants.ts`** | Archetype definitions, UI text, **HARDCODED USER LORE**, initial stats/map data | ❌ | ✅ System prompts for each archetype | ❌ (but contains initial data) |
| **`types.ts`** | TypeScript interfaces (Message, Archetype, UserStats, etc.) | ❌ | ❌ | ❌ |
| **`services/geminiService.ts`** | **ALL AI CALLS** - Direct chat, council sessions, Scribe analysis | ✅ | ✅ Constructs system instructions dynamically | ❌ |
| **`components/ChatInterface.tsx`** | 1-on-1 chat with selected archetype | ❌ (calls service) | ❌ | ❌ |
| **`components/CouncilSession.tsx`** | Multi-archetype debate simulation | ❌ (calls service) | ❌ | ❌ |
| **`components/RoundTable.tsx`** | Visual archetype selector UI | ❌ | ❌ | ❌ |
| **`components/StatsInterface.tsx`** | Displays user stats (attributes, milestones, inventory) | ❌ | ❌ | ❌ |
| **`components/WorldMapInterface.tsx`** | Displays psychogeography map | ❌ | ❌ | ❌ |
| **`components/CalendarInterface.tsx`** | Calendar/events management | ❌ | ❌ | ❌ |
| **`components/FinanceInterface.tsx`** | Financial tracking (balance, transactions) | ❌ | ❌ | ❌ |
| **`components/LandingScreen.tsx`** | Initial entry screen | ❌ | ❌ | ❌ |
| **`vite.config.ts`** | Build config, env var injection | ❌ | ❌ | ❌ |
| **`metadata.json`** | App metadata for AI Studio | ❌ | ❌ | ❌ |

### Key Findings:
- **AI Calls**: Centralized in `services/geminiService.ts`
- **Prompts**: Defined in `constants.ts` (archetype `systemPrompt` fields) + dynamically constructed in `geminiService.ts`
- **State**: Stored in browser `localStorage` (no backend database)
- **Hardcoded Content**: Massive personal lore in `constants.ts` lines 279-308

---

## 3. HARDCODED "ME" (PERSON-SPECIFIC LOGIC)

### Locations of Hardcoded Personal Data

#### **A. Personal Story & Psychological Profile**
**File**: `constants.ts`  
**Lines**: 279-308 (`INITIAL_USER_CONTEXT_LORE`)

**Contains**:
- Personal name references: "Michael" (stepfather), "Anna/Hannah" (relationships), "Selma" (friend)
- Specific life events: "Tuna Incident", "Snow Day", "Bangkok Protocol"
- Personal theories: "Relativity of Consciousness", "4D/2D Bandwidth Gap"
- Trauma history: Parental rejection, stepfather dynamics, ADHD theories
- Current logistics: Financial constraint until 26th, university (13th semester), Salesforce studies
- Personal locations: Düsseldorf, Berlin, Magdeburg, Bangkok, etc.

**Refactor Suggestion**: 
- Move to `config/user-profile.json` or `config/user-lore.json`
- Or create `config/templates/default-lore.json` as a template
- Load dynamically based on user ID (once multi-user is implemented)

---

#### **B. Personal Stats & Milestones**
**File**: `constants.ts`  
**Lines**: 313-408 (`INITIAL_USER_STATS_DATA`)

**Contains**:
- Title: "The Benevolent King" (Der gütige König)
- Level: "31 (Incarnating)"
- State: "Flow / High-Voltage"
- Current Quest: "Incarnation: Breakfast, Degree, Casting & Lineage"
- Personal attributes: "Absolute Clarity", "Chameleon / Diplomacy", "Manic Excitement"
- Personal milestones: "Lineage Reconciliation", "Tuna Incident", "Snow Day", "Caring Ensoulment"
- Personal inventory: "Salesforce Architecture", "Computational Neuroscience", etc.
- Calendar events: Specific dates (Jan 24th, Jan 26th, Dec 6th, Dec 12th)
- Financial data: Balance 0.08€, specific transactions

**Refactor Suggestion**:
- Move to `config/user-stats-template.json`
- Initialize per-user on first login
- Store per-user in database/localStorage with user ID prefix

---

#### **C. Personal Map Data (Psychogeography)**
**File**: `constants.ts`  
**Lines**: 411-426 (`INITIAL_USER_MAP_DATA`)

**Contains**:
- 14 specific locations with personal descriptions:
  - Düsseldorf: "The Point of Origin"
  - Venlo/Blerick: "The Hideout. Hiding from the Father"
  - Waldniel: "The Crucible. Bullying, isolation"
  - Senegal: "The Disconnect. Confrontation with heritage"
  - Berlin: "Current Base of Operations"
  - Bangkok: "The Target. 'Ich fliege nach Bangkok'"
  - Magdeburg: "The Political Nuance. Realizing that division is artificial"
  - And 7 more locations

**Refactor Suggestion**:
- Move to `config/user-map-template.json`
- Initialize empty map for new users
- Allow users to add locations through UI or AI analysis

---

#### **D. App Branding (Personal Symbol)**
**File**: `constants.ts`  
**Lines**: 37, 146

**Contains**:
- Subtitle: "Lazarus Engine" / "Lazarus Antrieb"
- Reference in `components/CouncilSession.tsx` line 292: "Lazarus Protocol"

**Refactor Suggestion**:
- Move to `config/branding.json` or environment variable
- Make it configurable per user or organization

---

#### **E. Hardcoded Names in Lore Text**
**File**: `constants.ts`  
**Lines**: 286, 292, 301, 302, 305, 336, 412, 418, 424, 425

**Specific References**:
- "Michael" (stepfather/roommate)
- "Selma" (grieving friend)
- "Anna/Hannah" (past relationships)
- Location names with personal context

**Refactor Suggestion**:
- Replace with placeholders: `{{USER_NAME}}`, `{{STEPFATHER_NAME}}`, etc.
- Or use generic descriptions that users can customize

---

### Summary Table

| Location | Type | Lines | Refactor Target |
|----------|------|-------|-----------------|
| `constants.ts` | Personal Lore | 279-308 | `config/user-lore-template.json` |
| `constants.ts` | Personal Stats | 313-408 | `config/user-stats-template.json` |
| `constants.ts` | Personal Map | 411-426 | `config/user-map-template.json` |
| `constants.ts` | Branding | 37, 146 | `config/branding.json` or env var |
| `components/CouncilSession.tsx` | Branding | 292 | `config/branding.json` |

---

## 4. BOUNDARY BETWEEN LOGIC & CONTENT

### Current State: Mixed Concerns

**Logic (Should Stay in Code)**:
- ✅ Council flow/routing (`App.tsx`)
- ✅ Message streaming (`ChatInterface.tsx`, `CouncilSession.tsx`)
- ✅ State management (`App.tsx` hooks)
- ✅ AI service orchestration (`geminiService.ts`)
- ✅ UI components (React components)

**Content (Should Be Externalized)**:
- ❌ **Archetype definitions** (currently in `constants.ts` lines 33-252)
  - Names, roles, descriptions, domains
  - System prompts (currently hardcoded strings)
- ❌ **UI text** (currently in `constants.ts` lines 34-168)
  - All button labels, placeholders, titles
- ❌ **User lore template** (currently hardcoded in `constants.ts`)
- ❌ **Initial stats template** (currently hardcoded)
- ❌ **Scribe analysis prompt** (currently in `geminiService.ts` lines 100-122)

### Proposed Clean Architecture

```
project-root/
├── src/
│   ├── components/          # UI logic only
│   ├── services/            # AI service logic
│   ├── hooks/               # State management
│   └── utils/               # Helper functions
├── config/
│   ├── archetypes.json      # Archetype definitions + prompts
│   ├── ui-text.json         # All UI strings (EN/DE)
│   ├── user-lore-template.json
│   ├── user-stats-template.json
│   ├── user-map-template.json
│   └── branding.json        # App name, subtitle, etc.
└── prompts/
    ├── archetype-base.md    # Base archetype prompt template
    ├── council-instruction.md
    └── scribe-analysis.md   # Scribe prompt template
```

### Refactoring Steps

1. **Extract Archetypes to JSON**:
   ```json
   // config/archetypes.json
   {
     "SOVEREIGN": {
       "name": { "EN": "The Sovereign", "DE": "Der Souverän" },
       "role": { "EN": "Ruler & Decision Maker", "DE": "..." },
       "description": { "EN": "...", "DE": "..." },
       "domains": ["Governance", "Purpose", "Integration", "Legacy"],
       "systemPrompt": {
         "EN": "You are The Sovereign...",
         "DE": "Du bist Der Souverän..."
       },
       "color": "from-amber-400 to-orange-500",
       "iconName": "Crown"
     },
     ...
   }
   ```

2. **Extract UI Text to JSON**:
   ```json
   // config/ui-text.json
   {
     "EN": {
       "APP_TITLE": "The Violet Eightfold",
       "SUBTITLE": "Lazarus Engine",
       ...
     },
     "DE": { ... }
   }
   ```

3. **Extract Prompts to Markdown**:
   - Move Scribe prompt from `geminiService.ts` to `prompts/scribe-analysis.md`
   - Use template variables: `{{USER_LORE}}`, `{{CURRENT_QUEST}}`, etc.

4. **Load Configs at Runtime**:
   ```typescript
   // config/loader.ts
   import archetypes from '../config/archetypes.json';
   import uiText from '../config/ui-text.json';
   ```

---

## 5. GENERALIZATION PLAN

### Step-by-Step Multi-User Migration

#### **Phase 1: User Identity & Isolation** (Week 1-2)
**Goal**: Add user accounts without breaking existing single-user flow

1. **Add User Model**:
   ```typescript
   // types.ts
   interface User {
     id: string;
     email?: string;
     displayName: string;
     createdAt: Date;
     subscriptionTier: 'FREE' | 'PRO' | 'ENTERPRISE';
   }
   ```

2. **Update localStorage Keys**:
   ```typescript
   // Before: localStorage.getItem('user_lore')
   // After: localStorage.getItem(`user_${userId}_lore`)
   ```

3. **Create User Service**:
   ```typescript
   // services/userService.ts
   export const getCurrentUserId = () => {
     let userId = localStorage.getItem('current_user_id');
     if (!userId) {
       userId = `user_${Date.now()}`;
       localStorage.setItem('current_user_id', userId);
     }
     return userId;
   };
   ```

4. **Scoped Data Loading**:
   ```typescript
   // App.tsx
   const userId = getCurrentUserId();
   const [lore, setLore] = useState(() => {
     const saved = localStorage.getItem(`user_${userId}_lore`);
     return saved || getDefaultLore();
   });
   ```

---

#### **Phase 2: Backend API (Optional but Recommended)** (Week 3-4)
**Goal**: Move from localStorage to cloud storage

1. **Create Backend Service** (Node.js/Express or Serverless):
   ```
   POST   /api/users              # Create user
   GET    /api/users/:id          # Get user profile
   PUT    /api/users/:id          # Update profile
   GET    /api/users/:id/lore     # Get user lore
   PUT    /api/users/:id/lore     # Update lore
   GET    /api/users/:id/stats    # Get stats
   PUT    /api/users/:id/stats    # Update stats
   GET    /api/users/:id/map      # Get map data
   PUT    /api/users/:id/map      # Update map
   ```

2. **Add Authentication**:
   - Use Firebase Auth, Auth0, or Supabase
   - JWT tokens for API calls
   - Session management

3. **Data Sync Service**:
   ```typescript
   // services/dataSync.ts
   export const syncToBackend = async (userId: string, data: UserData) => {
     await fetch(`/api/users/${userId}/lore`, {
       method: 'PUT',
       body: JSON.stringify(data.lore)
     });
   };
   ```

---

#### **Phase 3: User Profiles & Customization** (Week 5-6)
**Goal**: Allow users to customize their council

1. **Profile Configuration**:
   ```typescript
   interface UserProfile {
     userId: string;
     displayName: string;
     preferredLanguage: 'EN' | 'DE';
     customArchetypes?: Archetype[];  // Allow custom archetypes
     loreTemplate?: string;            // Custom initial lore
     branding?: {                      // Custom app branding
       appTitle?: string;
       subtitle?: string;
     };
   }
   ```

2. **Onboarding Flow**:
   - First-time user questionnaire
   - Generate initial lore from answers
   - Let users customize archetype names/descriptions

3. **Template System**:
   ```typescript
   // Load user-specific templates
   const getUserLoreTemplate = (userId: string) => {
     const custom = getUserProfile(userId)?.loreTemplate;
     return custom || DEFAULT_LORE_TEMPLATE;
   };
   ```

---

#### **Phase 4: AI Service Abstraction** (Week 7)
**Goal**: Single, clean AI service module

1. **Refactor `geminiService.ts`**:
   ```typescript
   // services/aiService.ts (renamed, abstracted)
   interface AIService {
     sendMessage(archetypeId: string, message: string, context: UserContext): Promise<Stream>;
     startCouncilSession(topic: string, context: UserContext): Promise<Stream>;
     analyzeSession(transcript: string, stats: UserStats): Promise<ScribeAnalysis>;
   }
   
   // Implementation
   class GeminiService implements AIService {
     constructor(private apiKey: string, private model: string) {}
     // ... implementation
   }
   
   // Factory
   export const createAIService = (provider: 'gemini' | 'openai' | 'anthropic') => {
     switch(provider) {
       case 'gemini': return new GeminiService(env.GEMINI_API_KEY, 'gemini-2.5-flash');
       // ... other providers
     }
   };
   ```

2. **Centralized Prompt Management**:
   ```typescript
   // services/promptBuilder.ts
   export const buildArchetypePrompt = (
     archetype: Archetype,
     userLore: string,
     language: Language
   ) => {
     return loadTemplate('archetype-base.md')
       .replace('{{ARCHETYPE_NAME}}', archetype.name[language])
       .replace('{{ARCHETYPE_ROLE}}', archetype.role[language])
       .replace('{{USER_LORE}}', userLore);
   };
   ```

---

#### **Phase 5: Monetization Integration** (Week 8+)
**Goal**: Add subscription tiers and usage limits

1. **Subscription Tiers**:
   ```typescript
   interface SubscriptionTier {
     name: 'FREE' | 'PRO' | 'ENTERPRISE';
     limits: {
       councilSessionsPerMonth: number;
       directChatsPerMonth: number;
       loreEntriesMax: number;
       mapLocationsMax: number;
       customArchetypes: boolean;
     };
   }
   ```

2. **Usage Tracking**:
   ```typescript
   // services/usageTracker.ts
   export const checkUsageLimit = async (userId: string, action: 'COUNCIL' | 'CHAT') => {
     const user = await getUser(userId);
     const usage = await getUsageThisMonth(userId);
     const tier = getSubscriptionTier(user.subscriptionTier);
     
     if (action === 'COUNCIL' && usage.councilSessions >= tier.limits.councilSessionsPerMonth) {
       throw new Error('Monthly limit reached. Upgrade to PRO.');
     }
   };
   ```

3. **Payment Integration**:
   - Stripe or Paddle for subscriptions
   - Webhook handlers for subscription events
   - Update user tier in database

4. **Entitlement Checks**:
   ```typescript
   // Before AI call
   await checkUsageLimit(userId, 'COUNCIL');
   await checkEntitlement(userId, 'CUSTOM_ARCHETYPES');
   ```

---

### Database Schema (When Backend is Added)

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  display_name VARCHAR(255),
  subscription_tier VARCHAR(50) DEFAULT 'FREE',
  created_at TIMESTAMP DEFAULT NOW()
);

-- User lore (text blob)
CREATE TABLE user_lore (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  content TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User stats (JSONB for flexibility)
CREATE TABLE user_stats (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  stats JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User map locations
CREATE TABLE user_map_locations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name VARCHAR(255),
  coordinates JSONB,
  type VARCHAR(50),
  description TEXT,
  visited BOOLEAN,
  year VARCHAR(50)
);

-- Usage tracking
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action_type VARCHAR(50), -- 'COUNCIL', 'CHAT', 'SCRIBE'
  timestamp TIMESTAMP DEFAULT NOW()
);
```

---

## 6. RED FLAGS & TECH DEBT

### 🔴 Critical Security Issues

1. **API Key Exposure Risk**
   - **Location**: `vite.config.ts` lines 14-15, `services/geminiService.ts` line 10
   - **Issue**: API key is bundled into client-side code via Vite's `define`. If `GEMINI_API_KEY` is in `.env.local`, it gets exposed in the browser bundle.
   - **Fix**: 
     - Move AI calls to a backend proxy
     - Never expose API keys in frontend code
     - Use server-side environment variables only

2. **No Authentication**
   - **Issue**: Anyone can access the app, no user verification
   - **Fix**: Add authentication before Phase 2 (Firebase Auth, Auth0, or Supabase)

3. **localStorage Security**
   - **Issue**: Sensitive personal data (trauma, relationships) stored in browser localStorage (vulnerable to XSS)
   - **Fix**: 
     - Sanitize all user inputs
     - Consider encryption for sensitive fields
     - Move to secure backend storage

---

### 🟡 Scaling Issues

1. **Client-Side AI Calls**
   - **Issue**: All AI calls happen from browser → Gemini API directly
   - **Problems**:
     - API key exposure (see above)
     - No rate limiting per user
     - No usage tracking
     - CORS issues in production
   - **Fix**: Backend proxy for all AI calls

2. **localStorage Limitations**
   - **Issue**: 
     - 5-10MB limit per domain
     - No cross-device sync
     - Data loss if user clears browser data
   - **Fix**: Backend database (PostgreSQL, MongoDB, or Supabase)

3. **No Caching**
   - **Issue**: Every AI call is a fresh request (costs money, slow)
   - **Fix**: 
     - Cache common archetype responses
     - Implement conversation history caching
     - Use CDN for static configs

4. **Session Management**
   - **Issue**: `chatSession` and `councilSession` are module-level variables (lines 15-16, 54-55 in `geminiService.ts`)
   - **Problem**: Only one session per browser tab, breaks with multiple users
   - **Fix**: Session storage per user ID

---

### 🟠 Code Quality Issues

1. **Massive Constants File**
   - **Issue**: `constants.ts` is 465 lines, mixes concerns
   - **Fix**: Split into separate files (see Section 4)

2. **Hardcoded Personal Data**
   - **Issue**: Personal story embedded in code (see Section 3)
   - **Fix**: Externalize to config files

3. **Type Safety Gaps**
   - **Issue**: `any` types in merge functions (line 27 in `App.tsx`)
   - **Fix**: Proper generics: `mergeArrays<T extends { [key: string]: any }>`

4. **Error Handling**
   - **Issue**: Minimal error handling in AI service
   - **Fix**: 
     - Try-catch blocks
     - User-friendly error messages
     - Retry logic for API failures

5. **No Environment Detection**
   - **Issue**: Same code for dev/prod
   - **Fix**: Environment-based configs, feature flags

---

### 🟢 Dependency Issues

1. **Tailwind via CDN**
   - **Issue**: `index.html` loads Tailwind from CDN (line 7)
   - **Problem**: No tree-shaking, larger bundle, network dependency
   - **Fix**: Install `tailwindcss` as npm package, use PostCSS

2. **No Package Lock**
   - **Issue**: No `package-lock.json` visible (may be gitignored)
   - **Fix**: Commit lock file for reproducible builds

3. **Outdated Dependencies Check**
   - **Issue**: No security audit visible
   - **Fix**: Run `npm audit`, update vulnerable packages

---

### 🎯 Priority Cleanup Order (For Stable MVP)

1. **Week 1: Security Hardening**
   - Move API key to backend proxy
   - Add basic authentication
   - Sanitize localStorage inputs

2. **Week 2: Data Architecture**
   - Extract hardcoded content to config files
   - Implement user ID scoping for localStorage
   - Add data migration utilities

3. **Week 3: Code Organization**
   - Split `constants.ts` into logical modules
   - Extract prompts to separate files
   - Improve type safety

4. **Week 4: Backend Foundation**
   - Set up simple backend (Express/Serverless)
   - Migrate localStorage → database
   - Add API endpoints for user data

5. **Week 5: Multi-User Support**
   - User registration/login
   - Per-user data isolation
   - Basic profile management

6. **Week 6: Monetization Prep**
   - Usage tracking
   - Subscription tier logic
   - Payment integration (Stripe)

---

## RECOMMENDATIONS SUMMARY

### Immediate Actions (This Week)
1. ✅ **Extract personal data** from `constants.ts` to `config/` folder
2. ✅ **Move API key handling** to backend (even a simple serverless function)
3. ✅ **Add user ID scoping** to localStorage keys
4. ✅ **Create config file structure** for archetypes, UI text, prompts

### Short-Term (Next Month)
1. ✅ **Backend API** for data persistence
2. ✅ **Authentication** (Firebase Auth or Supabase)
3. ✅ **User profiles** with customization
4. ✅ **Usage tracking** for monetization prep

### Long-Term (3-6 Months)
1. ✅ **Multi-provider AI support** (OpenAI, Anthropic fallbacks)
2. ✅ **Advanced customization** (custom archetypes, themes)
3. ✅ **Analytics dashboard** for users
4. ✅ **Mobile app** (React Native or PWA)

---

**Generated**: 2025-01-27  
**Analyzed By**: AI Architecture Assistant  
**Project**: The Violet Eightfold (Inner Council App)

