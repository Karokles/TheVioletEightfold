import { copyFile, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { basename, dirname, join } from 'node:path';

export interface LocalQuestLogEntry {
  id: string;
  createdAt: string;
  title: string;
  content: string;
  tags?: string[];
  relatedArchetypes?: string[];
  sourceSessionId?: string;
}

export interface LocalSoulTimelineEvent {
  id: string;
  createdAt: string;
  label: string;
  summary: string;
  intensity?: number;
  type?: string;
  tags?: string[];
  sourceSessionId?: string;
}

export interface LocalBreakthrough {
  id: string;
  createdAt: string;
  title: string;
  insight: string;
  trigger?: string;
  action?: string;
  tags?: string[];
  sourceSessionId?: string;
}

export interface LocalMeaningState {
  questLogEntries: LocalQuestLogEntry[];
  soulTimelineEvents: LocalSoulTimelineEvent[];
  breakthroughs: LocalBreakthrough[];
  emotionalState?: unknown;
  attributeUpdates?: unknown[];
  skillUpdates?: unknown[];
  nextQuestState?: unknown;
}

type StoreFile = {
  users: Record<string, Partial<LocalMeaningState>>;
};

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const serverDirectory = basename(moduleDirectory) === 'dist' ? dirname(moduleDirectory) : moduleDirectory;
const STORE_PATH = process.env.LOCAL_MEANING_STORE_PATH || join(serverDirectory, 'data', 'meaning-state.json');
const BACKUP_PATH = `${STORE_PATH}.backup`;
let storeQueue: Promise<void> = Promise.resolve();

const withStoreLock = <T>(operation: () => Promise<T>): Promise<T> => {
  const result = storeQueue.catch(() => undefined).then(operation);
  storeQueue = result.then(() => undefined, () => undefined);
  return result;
};

const emptyMeaningState = (): LocalMeaningState => ({
  questLogEntries: [],
  soulTimelineEvents: [],
  breakthroughs: [],
});

const dedupeById = <T extends { id: string }>(items: T[]): T[] => {
  const seen = new Set<string>();
  return items.filter(item => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const byNewestCreatedAt = <T extends { createdAt: string }>(items: T[]): T[] => {
  return [...items].sort((a, b) => {
    const bTime = new Date(b.createdAt).getTime() || 0;
    const aTime = new Date(a.createdAt).getTime() || 0;
    return bTime - aTime;
  });
};

const normalizeState = (state: Partial<LocalMeaningState> = {}): LocalMeaningState => ({
  questLogEntries: byNewestCreatedAt(dedupeById(Array.isArray(state.questLogEntries) ? state.questLogEntries : [])),
  soulTimelineEvents: byNewestCreatedAt(dedupeById(Array.isArray(state.soulTimelineEvents) ? state.soulTimelineEvents : [])),
  breakthroughs: byNewestCreatedAt(dedupeById(Array.isArray(state.breakthroughs) ? state.breakthroughs : [])),
  emotionalState: state.emotionalState,
  attributeUpdates: Array.isArray(state.attributeUpdates) ? state.attributeUpdates : undefined,
  skillUpdates: Array.isArray(state.skillUpdates) ? state.skillUpdates : undefined,
  nextQuestState: state.nextQuestState,
});

const parseStoreFile = async (path: string): Promise<StoreFile> => {
  const raw = await readFile(path, 'utf8');
  const parsed = JSON.parse(raw) as StoreFile;
  return {
    users: parsed && typeof parsed.users === 'object' && parsed.users ? parsed.users : {},
  };
};

const readStore = async (): Promise<StoreFile> => {
  try {
    return await parseStoreFile(STORE_PATH);
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      console.warn('[LOCAL_STORE] Failed to read primary meaning store. Trying backup.', error.message);
    }
  }

  try {
    const backup = await parseStoreFile(BACKUP_PATH);
    await mkdir(dirname(STORE_PATH), { recursive: true });
    await copyFile(BACKUP_PATH, STORE_PATH);
    console.warn('[LOCAL_STORE] Recovered meaning store from backup.');
    return backup;
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      console.warn('[LOCAL_STORE] Failed to read meaning backup. Starting from empty state.', error.message);
    }
    return { users: {} };
  }
};

const writeStore = async (store: StoreFile): Promise<void> => {
  await mkdir(dirname(STORE_PATH), { recursive: true });
  const temporaryPath = `${STORE_PATH}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(store, null, 2), 'utf8');

  try {
    await copyFile(STORE_PATH, BACKUP_PATH);
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      await unlink(temporaryPath).catch(() => undefined);
      throw error;
    }
  }

  try {
    await rename(temporaryPath, STORE_PATH);
  } catch (error: any) {
    if (error?.code !== 'EEXIST' && error?.code !== 'EPERM') {
      await unlink(temporaryPath).catch(() => undefined);
      throw error;
    }
    await copyFile(temporaryPath, STORE_PATH);
    await unlink(temporaryPath).catch(() => undefined);
  }
};

export const loadLocalMeaningState = async (userId: string): Promise<LocalMeaningState> => {
  return withStoreLock(async () => {
    const store = await readStore();
    return normalizeState(store.users[userId] || emptyMeaningState());
  });
};

export const mergeLocalMeaningState = async (
  userId: string,
  patch: Partial<LocalMeaningState>,
): Promise<LocalMeaningState> => {
  return withStoreLock(async () => {
    const store = await readStore();
    const existing = normalizeState(store.users[userId] || emptyMeaningState());
    const next = normalizeState({
      ...existing,
      questLogEntries: dedupeById([...(patch.questLogEntries || []), ...existing.questLogEntries]),
      soulTimelineEvents: dedupeById([...(patch.soulTimelineEvents || []), ...existing.soulTimelineEvents]),
      breakthroughs: dedupeById([...(patch.breakthroughs || []), ...existing.breakthroughs]),
      emotionalState: patch.emotionalState || existing.emotionalState,
      attributeUpdates: patch.attributeUpdates || existing.attributeUpdates,
      skillUpdates: patch.skillUpdates || existing.skillUpdates,
      nextQuestState: patch.nextQuestState || existing.nextQuestState,
    });

    store.users[userId] = next;
    await writeStore(store);
    return next;
  });
};
