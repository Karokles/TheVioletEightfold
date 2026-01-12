
export type Language = 'EN' | 'DE';

export type EightfoldMode = 'OG' | 'GUARDED';
export type GuardedState = 'STABILIZATION' | 'REFLECTION' | 'INTEGRATION';

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
  archetypeId?: string; 
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
  level: string;
  description: string;
  type: 'BUFF' | 'DEBUFF' | 'SKILL';
}

export interface CalendarEvent {
  id: string;
  date: string;
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
  level: string;
  state: string;
  currentQuest: string;
  attributes: Attribute[];
  milestones: Milestone[];
  inventory: string[];
  calendarEvents: CalendarEvent[];
  finances: FinanceState;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface MapLocation {
  id: string;
  name: string;
  coordinates: Coordinates;
  type: 'ORIGIN' | 'RESIDENCE' | 'VACATION' | 'TRAUMA' | 'TRANSFORMATION' | 'SHADOW_REALM';
  description: string;
  visited: boolean;
  year?: string;
}

export interface ScribeAnalysis {
  newLoreEntry?: string;
  newMilestone?: Milestone;
  newAttribute?: Attribute;
  newLocation?: MapLocation;
  updatedQuest?: string;
  updatedState?: string;
  newCalendarEvent?: CalendarEvent;
  newTransaction?: Transaction;
}
