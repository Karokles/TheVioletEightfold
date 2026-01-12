
export type Language = 'EN' | 'DE';

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
  type: 'DEADLINE' | 'MEETING' | 'BIRTHDAY' | 'QUEST' | 'SOCIAL' | 'OTHER' | 'FINANCE';
  description?: string;
  completed?: boolean;
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
  attributeUpdates?: AttributeUpdate[];
  skillUpdates?: SkillUpdate[];
  nextQuestState?: NextQuestState;
}
