import { Message } from '../types';
import { getUserScopedKey } from './userService';

export interface CouncilThreadMemoryTurn {
  id: string;
  role: 'user' | 'assistant';
  speaker?: string;
  content: string;
  timestamp: number;
}

export interface CouncilThreadMemory {
  schemaVersion: number;
  sessionId: string;
  topic?: string;
  createdAt: string;
  updatedAt: string;
  wasIntegrated: boolean;
  turns: CouncilThreadMemoryTurn[];
}

const THREAD_MEMORY_KEY = 'last_council_thread_memory';
const THREAD_MEMORY_SCHEMA_VERSION = 1;
const MAX_TURNS = 12;
const MAX_CONTENT_LENGTH = 900;
const MAX_AGE_MS = 1000 * 60 * 60 * 24;

const compact = (value: string, maxLength = MAX_CONTENT_LENGTH): string => {
  const text = value.replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
};

const normalizeTurns = (turns: CouncilThreadMemoryTurn[]): CouncilThreadMemoryTurn[] => {
  return turns
    .filter(turn => turn.content?.trim() && (turn.role === 'user' || turn.role === 'assistant'))
    .map(turn => ({
      id: turn.id || `turn-${Date.now()}`,
      role: turn.role,
      speaker: turn.speaker,
      content: compact(turn.content),
      timestamp: Number.isFinite(turn.timestamp) ? turn.timestamp : Date.now(),
    }))
    .slice(-MAX_TURNS);
};

export const saveCouncilThreadMemory = (
  userId: string,
  input: {
    sessionId?: string;
    topic?: string;
    turns: CouncilThreadMemoryTurn[];
    wasIntegrated?: boolean;
  },
): CouncilThreadMemory | null => {
  const turns = normalizeTurns(input.turns);
  if (turns.length === 0) return null;

  const existing = loadCouncilThreadMemory(userId);
  const createdAt = existing?.sessionId === input.sessionId && existing.createdAt
    ? existing.createdAt
    : new Date().toISOString();

  const memory: CouncilThreadMemory = {
    schemaVersion: THREAD_MEMORY_SCHEMA_VERSION,
    sessionId: input.sessionId || existing?.sessionId || `council-thread-${Date.now()}`,
    topic: compact(input.topic || existing?.topic || turns.find(turn => turn.role === 'user')?.content || '', 180),
    createdAt,
    updatedAt: new Date().toISOString(),
    wasIntegrated: Boolean(input.wasIntegrated || existing?.wasIntegrated),
    turns,
  };

  localStorage.setItem(getUserScopedKey(THREAD_MEMORY_KEY, userId), JSON.stringify(memory));
  return memory;
};

export const loadCouncilThreadMemory = (userId: string): CouncilThreadMemory | null => {
  const saved = localStorage.getItem(getUserScopedKey(THREAD_MEMORY_KEY, userId));
  if (!saved) return null;

  try {
    const parsed = JSON.parse(saved) as Partial<CouncilThreadMemory>;
    const updatedAt = parsed.updatedAt || parsed.createdAt || '';
    if (updatedAt && Date.now() - (new Date(updatedAt).getTime() || 0) > MAX_AGE_MS) {
      return null;
    }

    const turns = normalizeTurns(Array.isArray(parsed.turns) ? parsed.turns as CouncilThreadMemoryTurn[] : []);
    if (turns.length === 0) return null;

    return {
      schemaVersion: THREAD_MEMORY_SCHEMA_VERSION,
      sessionId: parsed.sessionId || 'council-thread-unknown',
      topic: parsed.topic,
      createdAt: parsed.createdAt || new Date(0).toISOString(),
      updatedAt: updatedAt || new Date(0).toISOString(),
      wasIntegrated: Boolean(parsed.wasIntegrated),
      turns,
    };
  } catch (error) {
    console.warn('Failed to parse council thread memory', error);
    return null;
  }
};

export const councilThreadMemoryToMessages = (memory: CouncilThreadMemory): Message[] => {
  return memory.turns.slice(-8).map(turn => ({
    id: turn.id,
    role: turn.role === 'user' ? 'user' : 'model',
    content: turn.speaker && turn.role === 'assistant'
      ? `[${turn.speaker}] ${turn.content}`
      : turn.content,
    timestamp: turn.timestamp,
  }));
};
