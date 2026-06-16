import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export type LocalCyclePacingMode = 'STABILIZATION' | 'EXPLORATION' | 'INTEGRATION';

export interface LocalCycleOnboardingAnswer {
  questionId: string;
  label: string;
  value: string;
}

export interface LocalCycleDayRecord {
  day: number;
  date: string;
  sense?: string;
  trace?: string;
  externalize?: string;
  reframe?: string;
  embody?: string;
  antiEgoCheck?: string;
  pacing: LocalCyclePacingMode;
  completedAt?: string;
}

export interface LocalIntegrationCycle {
  schemaVersion?: number;
  id: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  title: string;
  theme: string;
  startDate: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  onboardingAnswers: LocalCycleOnboardingAnswer[];
  dayRecords: LocalCycleDayRecord[];
}

export interface LocalCycleState {
  currentCycle: LocalIntegrationCycle | null;
  archivedCycles: LocalIntegrationCycle[];
  updatedAt?: string;
}

type StoreFile = {
  users: Record<string, Partial<LocalCycleState>>;
};

const STORE_PATH = process.env.LOCAL_CYCLE_STORE_PATH || join(process.cwd(), 'data', 'cycle-state.json');
const CYCLE_SCHEMA_VERSION = 1;
const CYCLE_LENGTH_DAYS = 63;

const emptyCycleState = (): LocalCycleState => ({
  currentCycle: null,
  archivedCycles: [],
});

const isRecord = (value: unknown): value is Record<string, any> => {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
};

const stringValue = (value: unknown): string => {
  return typeof value === 'string' ? value : '';
};

const optionalString = (value: unknown): string | undefined => {
  const text = stringValue(value).trim();
  return text || undefined;
};

const normalizePacing = (value: unknown): LocalCyclePacingMode => {
  return value === 'STABILIZATION' || value === 'INTEGRATION' || value === 'EXPLORATION'
    ? value
    : 'EXPLORATION';
};

const normalizeOnboardingAnswer = (value: unknown): LocalCycleOnboardingAnswer | null => {
  if (!isRecord(value)) return null;
  const questionId = stringValue(value.questionId).trim();
  if (!questionId) return null;

  return {
    questionId,
    label: stringValue(value.label).trim(),
    value: stringValue(value.value),
  };
};

const normalizeDayRecord = (value: unknown): LocalCycleDayRecord | null => {
  if (!isRecord(value)) return null;
  const day = Number(value.day);
  if (!Number.isFinite(day) || day < 1 || day > CYCLE_LENGTH_DAYS) return null;

  return {
    day: Math.floor(day),
    date: stringValue(value.date),
    sense: optionalString(value.sense),
    trace: optionalString(value.trace),
    externalize: optionalString(value.externalize),
    reframe: optionalString(value.reframe),
    embody: optionalString(value.embody),
    antiEgoCheck: optionalString(value.antiEgoCheck),
    pacing: normalizePacing(value.pacing),
    completedAt: optionalString(value.completedAt),
  };
};

export const normalizeCycle = (cycle: unknown): LocalIntegrationCycle | null => {
  if (!isRecord(cycle)) return null;

  const id = stringValue(cycle.id).trim();
  if (!id) return null;

  const status = cycle.status === 'COMPLETED' || cycle.status === 'ARCHIVED' ? cycle.status : 'ACTIVE';
  const now = new Date().toISOString();
  const fallbackDate = now.split('T')[0];
  const title = stringValue(cycle.title).trim() || stringValue(cycle.theme).trim() || 'Integration Cycle';
  const theme = stringValue(cycle.theme).trim() || title;

  const onboardingAnswers = Array.isArray(cycle.onboardingAnswers)
    ? cycle.onboardingAnswers.map(normalizeOnboardingAnswer).filter((answer): answer is LocalCycleOnboardingAnswer => Boolean(answer))
    : [];

  const dayRecords = Array.isArray(cycle.dayRecords)
    ? cycle.dayRecords.map(normalizeDayRecord).filter((record): record is LocalCycleDayRecord => Boolean(record))
    : [];

  return {
    schemaVersion: Number(cycle.schemaVersion) || CYCLE_SCHEMA_VERSION,
    id,
    status,
    title,
    theme,
    startDate: stringValue(cycle.startDate).trim() || fallbackDate,
    createdAt: stringValue(cycle.createdAt).trim() || now,
    updatedAt: stringValue(cycle.updatedAt).trim() || stringValue(cycle.createdAt).trim() || now,
    completedAt: optionalString(cycle.completedAt),
    onboardingAnswers,
    dayRecords: dayRecords.sort((a, b) => a.day - b.day),
  };
};

const byNewestUpdatedAt = (items: LocalIntegrationCycle[]): LocalIntegrationCycle[] => {
  return [...items].sort((a, b) => {
    const bTime = new Date(b.updatedAt || b.completedAt || b.createdAt).getTime() || 0;
    const aTime = new Date(a.updatedAt || a.completedAt || a.createdAt).getTime() || 0;
    return bTime - aTime;
  });
};

const dedupeCyclesById = (items: LocalIntegrationCycle[]): LocalIntegrationCycle[] => {
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const normalizeState = (state: Partial<LocalCycleState> = {}): LocalCycleState => {
  const currentCycle = normalizeCycle(state.currentCycle);
  const archivedCycles = Array.isArray(state.archivedCycles)
    ? state.archivedCycles
        .map(normalizeCycle)
        .filter((cycle): cycle is LocalIntegrationCycle => Boolean(cycle))
        .map(cycle => ({ ...cycle, status: 'ARCHIVED' as const }))
    : [];

  return {
    currentCycle: currentCycle && currentCycle.status !== 'ARCHIVED' ? currentCycle : null,
    archivedCycles: byNewestUpdatedAt(dedupeCyclesById(archivedCycles)),
    updatedAt: state.updatedAt,
  };
};

const readStore = async (): Promise<StoreFile> => {
  try {
    const raw = await readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as StoreFile;
    return {
      users: parsed && typeof parsed.users === 'object' && parsed.users ? parsed.users : {},
    };
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      console.warn('[LOCAL_CYCLE_STORE] Failed to read cycle store. Starting from empty state.', error.message);
    }
    return { users: {} };
  }
};

const writeStore = async (store: StoreFile): Promise<void> => {
  await mkdir(dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
};

export const loadLocalCycleState = async (userId: string): Promise<LocalCycleState> => {
  const store = await readStore();
  return normalizeState(store.users[userId] || emptyCycleState());
};

export const saveLocalCurrentCycle = async (
  userId: string,
  cycle: LocalIntegrationCycle,
): Promise<LocalCycleState> => {
  const normalized = normalizeCycle({
    ...cycle,
    updatedAt: new Date().toISOString(),
  });

  if (!normalized || normalized.status === 'ARCHIVED') {
    throw new Error('A valid active or completed cycle is required.');
  }

  const store = await readStore();
  const existing = normalizeState(store.users[userId] || emptyCycleState());
  const next = normalizeState({
    ...existing,
    currentCycle: normalized,
    updatedAt: new Date().toISOString(),
  });

  store.users[userId] = next;
  await writeStore(store);
  return next;
};

export const archiveLocalCycle = async (
  userId: string,
  cycle: LocalIntegrationCycle,
): Promise<LocalCycleState> => {
  const normalized = normalizeCycle(cycle);
  if (!normalized) {
    throw new Error('A valid cycle is required.');
  }

  const archivedAt = new Date().toISOString();
  const archivedCycle: LocalIntegrationCycle = {
    ...normalized,
    status: 'ARCHIVED',
    updatedAt: archivedAt,
    completedAt: normalized.completedAt || archivedAt,
  };

  const store = await readStore();
  const existing = normalizeState(store.users[userId] || emptyCycleState());
  const next = normalizeState({
    currentCycle: null,
    archivedCycles: [archivedCycle, ...existing.archivedCycles],
    updatedAt: archivedAt,
  });

  store.users[userId] = next;
  await writeStore(store);
  return next;
};
