import { CalendarEvent, CycleDayRecord, IntegrationCycle } from '../types';
import { CYCLE_LENGTH_DAYS, getCycleDayGuide, getRecommendedPacing } from '../config/integrationCycle';
import { getCurrentUser, getUserScopedKey } from './userService';

const CURRENT_CYCLE_KEY = 'integration_cycle_current';
const CURRENT_CYCLE_BACKUP_KEY = 'integration_cycle_current_backup';
const ARCHIVED_CYCLES_KEY = 'integration_cycle_archive';
const CYCLE_SCHEMA_VERSION = 1;

const getApiBaseUrl = (): string => {
  const url = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (import.meta.env.PROD && !url) {
    throw new Error('VITE_API_BASE_URL is not set.');
  }

  return url || 'http://localhost:3001';
};

const getAuthHeaders = () => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  let token = user.token.trim();
  while (token.startsWith('Bearer ')) {
    token = token.substring(7).trim();
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

const toIsoDate = (date: Date): string => {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
};

const getSealDate = (record: Pick<CycleDayRecord, 'date' | 'completedAt'>): string => {
  if (record.completedAt) return toIsoDate(new Date(record.completedAt));
  return record.date;
};

export const getCycleDayNumber = (cycle: IntegrationCycle, date = new Date()): number => {
  const completedDays = new Set(cycle.dayRecords.filter(record => record.completedAt).map(record => record.day));
  return Math.min(completedDays.size + 1, CYCLE_LENGTH_DAYS);
};

export const getCycleCalendarDayNumber = (cycle: IntegrationCycle, date = new Date()): number => {
  const start = new Date(`${cycle.startDate}T00:00:00`);
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const normalizedStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const elapsedDays = Math.floor((today.getTime() - normalizedStart.getTime()) / 86400000) + 1;
  return Math.min(Math.max(elapsedDays, 1), CYCLE_LENGTH_DAYS);
};

export const getCompletedCycleParticipationDays = (cycle: IntegrationCycle): number => {
  return new Set(cycle.dayRecords.filter(record => record.completedAt).map(record => record.day)).size;
};

export const getCycleRecordCompletedToday = (cycle: IntegrationCycle, date = new Date()): CycleDayRecord | undefined => {
  const today = toIsoDate(date);
  return cycle.dayRecords.find(record => {
    if (!record.completedAt) return false;
    return toIsoDate(new Date(record.completedAt)) === today;
  });
};

export const canCompleteCycleDay = (
  cycle: IntegrationCycle,
  day: number,
  date = new Date(),
): { allowed: boolean; reason?: 'ALREADY_COMPLETED' | 'FUTURE_DAY' | 'ONE_PER_DATE' | 'CYCLE_COMPLETE' } => {
  if (cycle.status === 'COMPLETED') {
    return { allowed: false, reason: 'CYCLE_COMPLETE' };
  }

  if (cycle.dayRecords.some(record => record.day === day && record.completedAt)) {
    return { allowed: false, reason: 'ALREADY_COMPLETED' };
  }

  const nextParticipationDay = getCycleDayNumber(cycle, date);
  if (day !== nextParticipationDay) {
    return { allowed: false, reason: 'FUTURE_DAY' };
  }

  if (getCycleRecordCompletedToday(cycle, date)) {
    return { allowed: false, reason: 'ONE_PER_DATE' };
  }

  return { allowed: true };
};

const normalizeCycle = (cycle: IntegrationCycle): IntegrationCycle => {
  return {
    ...cycle,
    schemaVersion: cycle.schemaVersion || CYCLE_SCHEMA_VERSION,
    updatedAt: cycle.updatedAt || cycle.createdAt || new Date().toISOString(),
    onboardingAnswers: Array.isArray(cycle.onboardingAnswers) ? cycle.onboardingAnswers : [],
    dayRecords: Array.isArray(cycle.dayRecords) ? cycle.dayRecords : [],
  };
};

const parseCycleValue = (value: unknown): IntegrationCycle | null => {
  if (!value || typeof value !== 'object') return null;

  try {
    const parsed = normalizeCycle(value as IntegrationCycle);
    if (!parsed?.id || (parsed.status !== 'ACTIVE' && parsed.status !== 'COMPLETED')) return null;
    return parsed;
  } catch (error) {
    console.error('Failed to parse integration cycle', error);
    return null;
  }
};

const parseCycle = (saved: string | null): IntegrationCycle | null => {
  if (!saved) return null;

  try {
    return parseCycleValue(JSON.parse(saved));
  } catch (error) {
    console.error('Failed to parse integration cycle', error);
    return null;
  }
};

const getCycleUpdatedTime = (cycle: IntegrationCycle | null): number => {
  if (!cycle) return 0;
  return new Date(cycle.updatedAt || cycle.completedAt || cycle.createdAt).getTime() || 0;
};

const chooseNewestCycle = (
  localCycle: IntegrationCycle | null,
  remoteCycle: IntegrationCycle | null,
): IntegrationCycle | null => {
  if (!localCycle) return remoteCycle;
  if (!remoteCycle) return localCycle;
  return getCycleUpdatedTime(remoteCycle) > getCycleUpdatedTime(localCycle) ? remoteCycle : localCycle;
};

export const loadCurrentCycle = (userId: string): IntegrationCycle | null => {
  const key = getUserScopedKey(CURRENT_CYCLE_KEY, userId);
  const backupKey = getUserScopedKey(CURRENT_CYCLE_BACKUP_KEY, userId);
  const current = parseCycle(localStorage.getItem(key));

  if (current) {
    return current;
  }

  const backup = parseCycle(localStorage.getItem(backupKey));
  if (backup) {
    localStorage.setItem(key, JSON.stringify(backup));
    return backup;
  }

  return null;
};

export const saveCurrentCycle = (userId: string, cycle: IntegrationCycle | null): IntegrationCycle | null => {
  const key = getUserScopedKey(CURRENT_CYCLE_KEY, userId);
  const backupKey = getUserScopedKey(CURRENT_CYCLE_BACKUP_KEY, userId);

  if (!cycle) {
    // Null saves are intentionally non-destructive. Use clearCurrentCycle() for explicit resets.
    return null;
  }

  const existing = localStorage.getItem(key);
  if (existing) {
    localStorage.setItem(backupKey, existing);
  }

  const normalized = normalizeCycle({
    ...cycle,
    updatedAt: new Date().toISOString(),
  });
  localStorage.setItem(key, JSON.stringify(normalized));
  localStorage.setItem(backupKey, JSON.stringify(normalized));
  return normalized;
};

export const clearCurrentCycle = (userId: string): void => {
  const key = getUserScopedKey(CURRENT_CYCLE_KEY, userId);
  const backupKey = getUserScopedKey(CURRENT_CYCLE_BACKUP_KEY, userId);
  localStorage.removeItem(key);
  localStorage.removeItem(backupKey);
};

export const persistCurrentCycle = async (
  userId: string,
  cycle: IntegrationCycle | null,
): Promise<IntegrationCycle | null> => {
  const normalized = saveCurrentCycle(userId, cycle);
  if (!normalized) return null;

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/cycle/current`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      cache: 'no-store',
      body: JSON.stringify({ cycle: normalized }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const persisted = parseCycleValue(data.currentCycle);
    if (persisted) {
      saveCurrentCycle(userId, persisted);
      return persisted;
    }
  } catch (error) {
    console.warn('[CYCLE] Failed to persist cycle to backend; local backup kept.', error);
  }

  return normalized;
};

export const hydrateCurrentCycle = async (userId: string): Promise<IntegrationCycle | null> => {
  const localCycle = loadCurrentCycle(userId);

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/cycle/current?ts=${Date.now()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const remoteCycle = parseCycleValue(data.currentCycle);
    const selectedCycle = chooseNewestCycle(localCycle, remoteCycle);

    if (selectedCycle) {
      saveCurrentCycle(userId, selectedCycle);

      if (localCycle && selectedCycle.id === localCycle.id && getCycleUpdatedTime(localCycle) > getCycleUpdatedTime(remoteCycle)) {
        await persistCurrentCycle(userId, localCycle);
      }
    }

    return selectedCycle;
  } catch (error) {
    console.warn('[CYCLE] Failed to hydrate cycle from backend; using local backup.', error);
    return localCycle;
  }
};

export const persistArchivedCycle = async (cycle: IntegrationCycle): Promise<void> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/cycle/archive`, {
      method: 'POST',
      headers: getAuthHeaders(),
      cache: 'no-store',
      body: JSON.stringify({ cycle }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.warn('[CYCLE] Failed to archive cycle in backend; local archive kept.', error);
  }
};

export const startIntegrationCycle = (
  title: string,
  onboardingAnswers: IntegrationCycle['onboardingAnswers'],
): IntegrationCycle => {
  const startDate = toIsoDate(new Date());
  const theme = onboardingAnswers.find(answer => answer.questionId === 'pattern')?.value.trim() || title.trim();

  return {
    schemaVersion: CYCLE_SCHEMA_VERSION,
    id: `cycle-${Date.now()}`,
    status: 'ACTIVE',
    title: title.trim() || theme || 'Integration Cycle',
    theme: theme || 'Integration Cycle',
    startDate,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    onboardingAnswers,
    dayRecords: [],
  };
};

export const upsertCycleDayRecord = (
  cycle: IntegrationCycle,
  record: Omit<CycleDayRecord, 'date'>,
): IntegrationCycle => {
  const existingRecord = cycle.dayRecords.find(existing => existing.day === record.day);
  const completedAt = record.completedAt || existingRecord?.completedAt;
  const nextRecord: CycleDayRecord = {
    ...record,
    date: completedAt ? toIsoDate(new Date(completedAt)) : existingRecord?.date || '',
    completedAt,
  };
  const isCompletingFinalDay = Boolean(completedAt && record.day >= CYCLE_LENGTH_DAYS);

  return {
    ...cycle,
    status: isCompletingFinalDay ? 'COMPLETED' : cycle.status,
    updatedAt: new Date().toISOString(),
    completedAt: isCompletingFinalDay ? completedAt : cycle.completedAt,
    dayRecords: [
      ...cycle.dayRecords.filter(existing => existing.day !== record.day),
      nextRecord,
    ].sort((a, b) => a.day - b.day),
  };
};

export const archiveCycle = (userId: string, cycle: IntegrationCycle): void => {
  const archiveKey = getUserScopedKey(ARCHIVED_CYCLES_KEY, userId);
  const saved = localStorage.getItem(archiveKey);
  let archive: IntegrationCycle[] = [];
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      archive = Array.isArray(parsed) ? parsed as IntegrationCycle[] : [];
    } catch (error) {
      console.warn('[CYCLE] Failed to parse local cycle archive. Starting a fresh archive.', error);
    }
  }

  const archivedCycle = {
    ...normalizeCycle(cycle),
    status: 'ARCHIVED' as const,
    updatedAt: new Date().toISOString(),
    completedAt: cycle.completedAt || new Date().toISOString(),
  };

  localStorage.setItem(archiveKey, JSON.stringify([
    archivedCycle,
    ...archive.filter(existing => existing.id !== cycle.id),
  ]));
  clearCurrentCycle(userId);
};

export const getCycleCalendarEvents = (cycle: IntegrationCycle): CalendarEvent[] => {
  return cycle.dayRecords.filter(record => record.completedAt).map(record => {
    const day = record.day;
    const guide = getCycleDayGuide(day, 'EN');
    const pacing = getRecommendedPacing(day);

    return {
      id: `${cycle.id}-day-${day}`,
      date: getSealDate(record),
      title: guide.milestone ? `Day ${day}: ${guide.milestone.title.EN}` : `Day ${day}: ${guide.title}`,
      description: `${guide.phase.title.EN} · ${pacing}`,
      type: 'CYCLE',
      completed: true,
    };
  });
};
