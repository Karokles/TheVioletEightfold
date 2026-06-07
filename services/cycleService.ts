import { CalendarEvent, CycleDayRecord, IntegrationCycle } from '../types';
import { CYCLE_LENGTH_DAYS, getCycleDayGuide, getRecommendedPacing } from '../config/integrationCycle';
import { getUserScopedKey } from './userService';

const CURRENT_CYCLE_KEY = 'integration_cycle_current';
const CURRENT_CYCLE_BACKUP_KEY = 'integration_cycle_current_backup';
const ARCHIVED_CYCLES_KEY = 'integration_cycle_archive';
const CYCLE_SCHEMA_VERSION = 1;

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

const parseCycle = (saved: string | null): IntegrationCycle | null => {
  if (!saved) return null;

  try {
    const parsed = normalizeCycle(JSON.parse(saved) as IntegrationCycle);
    if (!parsed?.id || (parsed.status !== 'ACTIVE' && parsed.status !== 'COMPLETED')) return null;
    return parsed;
  } catch (error) {
    console.error('Failed to parse integration cycle', error);
    return null;
  }
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

export const saveCurrentCycle = (userId: string, cycle: IntegrationCycle | null): void => {
  const key = getUserScopedKey(CURRENT_CYCLE_KEY, userId);
  const backupKey = getUserScopedKey(CURRENT_CYCLE_BACKUP_KEY, userId);

  if (!cycle) {
    // Null saves are intentionally non-destructive. Use clearCurrentCycle() for explicit resets.
    return;
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
};

export const clearCurrentCycle = (userId: string): void => {
  const key = getUserScopedKey(CURRENT_CYCLE_KEY, userId);
  localStorage.removeItem(key);
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
  const archive = saved ? JSON.parse(saved) as IntegrationCycle[] : [];
  localStorage.setItem(archiveKey, JSON.stringify([
    { ...normalizeCycle(cycle), status: 'ARCHIVED', updatedAt: new Date().toISOString(), completedAt: cycle.completedAt || new Date().toISOString() },
    ...archive,
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
