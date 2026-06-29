
export type Language = 'EN' | 'DE';

export type CommunicationMode = 'HOLD' | 'MIRROR' | 'EXPLORE' | 'GROUND' | 'ACT';

export type ConsentState =
  | 'IMPLICIT_OK'
  | 'ASK_BEFORE_DEEPENING'
  | 'USER_REQUESTED_DIRECTION'
  | 'LOW_INTERVENTION';

export type EmotionalValence = 'POSITIVE' | 'NEUTRAL' | 'MIXED' | 'NEGATIVE';
export type EmotionalActivation = 'LOW' | 'MEDIUM' | 'HIGH';
export type EmotionalClarity = 'CLEAR' | 'UNCERTAIN' | 'OVERLOADED';
export type EmotionalSupportNeed = 'PRESENCE' | 'MIRRORING' | 'GROUNDING' | 'CLARITY' | 'ACTION';

export interface EmotionalStateScan {
  schemaVersion: number;
  valence: EmotionalValence;
  activation: EmotionalActivation;
  clarity: EmotionalClarity;
  primarySignals: string[];
  supportNeeds: EmotionalSupportNeed[];
  overloadRisk: boolean;
  confidence: number; // 0-1, heuristic confidence only
  updatedAt: string;
}

export type StateNarrativeCharge = 'LOW' | 'MEDIUM' | 'HIGH';
export type StateImpulseKind = 'CONNECT' | 'REPAIR' | 'CONTROL' | 'WITHDRAW' | 'ACT' | 'WAIT' | 'UNKNOWN';
export type StateResponsibilityOrientation =
  | 'CONSCIOUS_CONNECTION'
  | 'SHARED_RESPONSIBILITY'
  | 'UNCONSCIOUS_ENTANGLEMENT'
  | 'CONTROL'
  | 'ISOLATION'
  | 'UNCLEAR';

export interface StatePhronesisCheck {
  wiseNow: boolean | null;
  servesCommonGood: boolean | null;
  needsPause: boolean;
  reason: string;
}

export interface StateConnectionResponsibility {
  orientation: StateResponsibilityOrientation;
  notes: string[];
}

export interface StateAwarenessContext {
  schemaVersion: number;
  stateSignals: string[];
  narrativeCharge: StateNarrativeCharge;
  narrativeFragments: string[];
  powerfulLanguage: string[];
  attentionDirection: string[];
  impulseKind: StateImpulseKind;
  impulseSummary?: string;
  phronesisCheck: StatePhronesisCheck;
  connectionResponsibility: StateConnectionResponsibility;
  recommendedStance: CommunicationMode;
  doNotDebunk: boolean;
  breakthroughCandidate: boolean;
  confidence: number;
  updatedAt: string;
}

export interface CommunicationPreferences {
  schemaVersion: number;
  mode: CommunicationMode;
  consentState: ConsentState;
  updatedAt: string;
}

export interface MeaningContext {
  communicationMode: CommunicationMode;
  consentState: ConsentState;
  activeCycleId?: string;
  activeCycleDay?: number;
  activeCycleTheme?: string;
  overloadSignal?: boolean;
  emotionalState?: EmotionalStateScan;
  stateAwareness?: StateAwarenessContext;
  notes?: string[];
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
  archetypeId?: string; // If sent by a specific archetype
  isThinking?: boolean;
}

export interface Archetype {
  id: string;
  name: string;
  role: string;
  description: string;
  color: string;
  iconName: string;
  domains: string[];
  systemPrompt: string;
}

export interface CouncilMessage {
  speaker: string;
  content: string;
  type: 'argument' | 'agreement' | 'dissent' | 'synthesis' | 'ruling';
}

export enum ChatStatus {
  IDLE = 'IDLE',
  THINKING = 'THINKING',
  STREAMING = 'STREAMING',
  ERROR = 'ERROR',
}

// --- Stats / Journey Types ---

export interface Milestone {
  id: string;
  title: string;
  date: string;
  description: string;
  type: 'BREAKTHROUGH' | 'BENCHMARK' | 'REALIZATION';
  icon: string;
}

export interface Attribute {
  name: string;
  level: string; // e.g. "S-Tier", "Developing", "Mastered"
  description: string;
  type: 'BUFF' | 'DEBUFF' | 'SKILL';
}

export interface CalendarEvent {
  id: string;
  date: string; // ISO string YYYY-MM-DD
  title: string;
  type: 'DEADLINE' | 'MEETING' | 'BIRTHDAY' | 'QUEST' | 'SOCIAL' | 'OTHER' | 'FINANCE' | 'CYCLE';
  description?: string;
  completed?: boolean;
}

export type CyclePacingMode = 'STABILIZATION' | 'EXPLORATION' | 'INTEGRATION';

export interface CycleOnboardingAnswer {
  questionId: string;
  label: string;
  value: string;
}

export interface CycleDayRecord {
  day: number;
  date: string; // ISO string YYYY-MM-DD, the calendar date this participation day was sealed
  sense?: string;
  trace?: string;
  externalize?: string;
  reframe?: string;
  embody?: string;
  antiEgoCheck?: string;
  pacing: CyclePacingMode;
  completedAt?: string;
}

export interface IntegrationCycle {
  schemaVersion?: number;
  id: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  title: string;
  theme: string;
  startDate: string; // ISO string YYYY-MM-DD
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  onboardingAnswers: CycleOnboardingAnswer[];
  dayRecords: CycleDayRecord[];
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
}

export interface FinanceState {
  balance: number;
  currency: string;
  transactions: Transaction[];
}

export interface UserStats {
  title: string;
  level: string; // Age or Semester
  state: string;
  currentQuest: string;
  attributes: Attribute[];
  milestones: Milestone[];
  inventory: string[]; // Skills/Tools
  calendarEvents: CalendarEvent[]; // Kept for potential future use, but not displayed in UI
}

// --- World Map Types ---

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface MapLocation {
  id: string;
  name: string;
  coordinates: Coordinates;
  type: 'ORIGIN' | 'RESIDENCE' | 'VACATION' | 'TRAUMA' | 'TRANSFORMATION' | 'SHADOW_REALM';
  description: string; // The "Memory Fragment"
  visited: boolean;
  year?: string;
}

// --- Scribe / Integration Types ---

export interface ScribeAnalysis {
  newLoreEntry?: string; // A summarized paragraph to add to the hidden context
  newMilestone?: Milestone; // If a major breakthrough happened
  newAttribute?: Attribute; // If a new skill/buff was identified
  updatedQuest?: string; // If the current quest changed
  updatedState?: string; // If the user's emotional state changed
  // Note: newLocation, newCalendarEvent, newTransaction removed for MVP
}

// --- Meaning Agent / Questlog Types ---

export interface QuestLogEntry {
  id: string;
  createdAt: string; // ISO string
  title: string;
  content: string;
  tags?: string[];
  relatedArchetypes?: string[];
  sourceSessionId?: string;
}

export interface SoulTimelineEvent {
  id: string;
  createdAt: string; // ISO string
  label: string;
  summary: string;
  intensity?: number; // 1-10
  type?: string; // e.g., "BREAKTHROUGH", "BENCHMARK", "REALIZATION", "EVENT"
  tags?: string[];
  sourceSessionId?: string;
}

export interface Breakthrough {
  id: string;
  createdAt: string; // ISO string
  title: string;
  insight: string;
  trigger?: string; // What led to this breakthrough
  action?: string; // Recommended action
  tags?: string[];
  sourceSessionId?: string;
}

export interface AttributeUpdate {
  key: string; // Attribute name
  delta: number; // Change in level (e.g., +1, -1)
  reason: string;
}

export interface SkillUpdate {
  key: string; // Skill name
  delta: number;
  reason: string;
}

export interface NextQuestState {
  title: string;
  state: string; // e.g., "IN_PROGRESS", "COMPLETED", "BLOCKED"
  objective: string;
  steps?: string[];
}

// Canonical Meaning Analysis Result (single source of truth)
export interface MeaningAnalysisResult {
  questLogEntries: QuestLogEntry[];
  soulTimelineEvents: SoulTimelineEvent[];
  breakthroughs: Breakthrough[];
  emotionalState?: EmotionalStateScan;
  attributeUpdates?: AttributeUpdate[];
  skillUpdates?: SkillUpdate[];
  nextQuestState?: NextQuestState;
}
