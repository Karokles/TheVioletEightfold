import { Language, MeaningContext } from '../types';
import { getUserScopedKey } from './userService';

const DISCOVERY_STATE_KEY = 'playful_discovery_state';

export const isPlayfulDiscoveryEnabled = (): boolean => {
  const env = import.meta.env as Record<string, string | undefined>;
  const raw = env.VITE_PLAYFUL_DISCOVERY_ENABLED ?? env.PLAYFUL_DISCOVERY_ENABLED;
  return raw === undefined ? true : raw !== 'false';
};

export type DiscoveryTriggerType =
  | 'symbol_repeat'
  | 'phrase_repeat'
  | 'return_path'
  | 'hidden_room'
  | 'constellation'
  | 'easter_egg';

export type DiscoverySource = 'chat' | 'council' | 'cycle' | 'blueprint' | 'local_mock';

export interface DiscoveryBaseRecord {
  id: string;
  user_id: string;
  trigger_type: DiscoveryTriggerType;
  trigger_source: DiscoverySource;
  symbol?: string;
  theme?: string;
  archetype?: string;
  intensity: number;
  confidence: number;
  first_seen_at: string;
  last_seen_at: string;
  unlocked_at?: string;
  seen_by_user: boolean;
  local_only: boolean;
  metadata_json: Record<string, unknown>;
}

export type DiscoveryEvent = DiscoveryBaseRecord;
export type SymbolicEcho = DiscoveryBaseRecord;
export type HiddenRoomUnlock = DiscoveryBaseRecord;
export type UserArtifact = DiscoveryBaseRecord;
export type ConstellationEntry = DiscoveryBaseRecord;
export type RecurringTheme = DiscoveryBaseRecord;
export type ArchetypeAffinity = DiscoveryBaseRecord;
export type ReturnPath = DiscoveryBaseRecord;
export type LoreFragment = DiscoveryBaseRecord;

export interface DiscoveryNotice {
  id: string;
  kind: DiscoveryTriggerType;
  title: string;
  body: string;
  symbol?: string;
  roomId?: string;
  createdAt: string;
}

interface DiscoveryState {
  schemaVersion: 1;
  lastSeenAt?: string;
  symbolCounts: Record<string, number>;
  phraseCounts: Record<string, number>;
  events: DiscoveryEvent[];
  echoes: SymbolicEcho[];
  hiddenRooms: HiddenRoomUnlock[];
  artifacts: UserArtifact[];
  constellations: ConstellationEntry[];
  recurringThemes: RecurringTheme[];
  archetypeAffinities: ArchetypeAffinity[];
  returnPaths: ReturnPath[];
  loreFragments: LoreFragment[];
}

const emptyState = (): DiscoveryState => ({
  schemaVersion: 1,
  symbolCounts: {},
  phraseCounts: {},
  events: [],
  echoes: [],
  hiddenRooms: [],
  artifacts: [],
  constellations: [],
  recurringThemes: [],
  archetypeAffinities: [],
  returnPaths: [],
  loreFragments: [],
});

const symbolLexicon: Record<string, RegExp[]> = {
  mirror: [/\bmirror\b/i, /\bspiegel\b/i],
  lazarus: [/\blazarus\b/i],
  phoenix: [/\bphoenix\b/i, /\bphönix\b/i, /\bphoenix\b/i],
  ocean: [/\bocean\b/i, /\bmeer\b/i, /\bozean\b/i],
  garden: [/\bgarden\b/i, /\bgarten\b/i],
  rocket: [/\brocket\b/i, /\brakete\b/i],
  momo: [/\bmomo\b/i],
  grey_men: [/\bgraue männer\b/i, /\bgraue maenner\b/i, /\bgrey men\b/i],
  color: [/\bfarbe\b/i, /\bcolor\b/i],
  door: [/\btür\b/i, /\btuer\b/i, /\bdoor\b/i],
};

const crisisPatterns = [
  /\b(suizid|suicide|kill myself|mich umbringen|selbstverletzung|self harm)\b/i,
  /\b(panik|panic|notfall|emergency|akut|akute gefahr)\b/i,
];

const overAnalysisPatterns = [
  /\b(im kreis|kreiseln|overthinking|grübeln|gruebeln|zu viel kopf|alles zu viel)\b/i,
];

const clarityPatterns = [
  /\b(jetzt verstehe ich|mir wird klar|it clicks|i see it|plötzlich klar|ploetzlich klar|emotional klar)\b/i,
];

const loadState = (userId: string): DiscoveryState => {
  const saved = localStorage.getItem(getUserScopedKey(DISCOVERY_STATE_KEY, userId));
  if (!saved) return emptyState();

  try {
    return { ...emptyState(), ...(JSON.parse(saved) as Partial<DiscoveryState>) };
  } catch (error) {
    console.warn('Failed to parse playful discovery state', error);
    return emptyState();
  }
};

const saveState = (userId: string, state: DiscoveryState): DiscoveryState => {
  localStorage.setItem(getUserScopedKey(DISCOVERY_STATE_KEY, userId), JSON.stringify(state));
  return state;
};

const hasRecord = (items: DiscoveryBaseRecord[], triggerType: DiscoveryTriggerType, symbol?: string): boolean => {
  return items.some(item => item.trigger_type === triggerType && (!symbol || item.symbol === symbol));
};

const createRecord = (
  userId: string,
  triggerType: DiscoveryTriggerType,
  source: DiscoverySource,
  now: string,
  data: Partial<DiscoveryBaseRecord> = {},
): DiscoveryBaseRecord => ({
  id: `discovery-${triggerType}-${data.symbol || data.theme || Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  user_id: userId,
  trigger_type: triggerType,
  trigger_source: source,
  intensity: data.intensity ?? 2,
  confidence: data.confidence ?? 0.7,
  first_seen_at: data.first_seen_at || now,
  last_seen_at: now,
  unlocked_at: now,
  seen_by_user: false,
  local_only: true,
  metadata_json: data.metadata_json || {},
  ...data,
});

const normalizePhrase = (text: string): string | null => {
  const normalized = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = normalized.split(' ').filter(Boolean);
  if (words.length < 4 || words.length > 16) return null;
  if (normalized.length < 20 || normalized.length > 140) return null;
  return normalized;
};

const daysBetween = (olderIso: string | undefined, newerIso: string): number => {
  if (!olderIso) return 0;
  const older = new Date(olderIso).getTime();
  const newer = new Date(newerIso).getTime();
  if (!Number.isFinite(older) || !Number.isFinite(newer)) return 0;
  return Math.floor((newer - older) / 86400000);
};

const noticeCopy = (language: Language, notice: Omit<DiscoveryNotice, 'createdAt'>): DiscoveryNotice => ({
  ...notice,
  createdAt: new Date().toISOString(),
  title: notice.title,
  body: notice.body,
});

export const analyzePlayfulDiscovery = (options: {
  userId: string;
  text: string;
  source: DiscoverySource;
  language: Language;
  archetype?: string;
  meaningContext?: MeaningContext;
}): DiscoveryNotice[] => {
  if (!isPlayfulDiscoveryEnabled()) return [];

  const text = options.text.trim();
  if (!text) return [];

  const now = new Date().toISOString();
  const state = loadState(options.userId);
  const notices: DiscoveryNotice[] = [];
  const isGerman = options.language === 'DE';
  const crisis = options.meaningContext?.overloadSignal
    || options.meaningContext?.emotionalState?.overloadRisk
    || crisisPatterns.some(pattern => pattern.test(text));

  const returnDays = daysBetween(state.lastSeenAt, now);
  if (!crisis && returnDays >= 5 && !hasRecord(state.returnPaths, 'return_path', `return-${new Date(now).toISOString().slice(0, 10)}`)) {
    const symbol = `return-${new Date(now).toISOString().slice(0, 10)}`;
    state.returnPaths.unshift(createRecord(options.userId, 'return_path', options.source, now, {
      symbol,
      theme: 'return',
      intensity: Math.min(5, Math.max(2, Math.floor(returnDays / 3))),
      metadata_json: { absenceDays: returnDays },
    }) as ReturnPath);
    notices.push(noticeCopy(options.language, {
      id: `notice-return-${now}`,
      kind: 'return_path',
      title: isGerman ? 'Der Weg hat dich wiedererkannt.' : 'The path remembered you.',
      body: isGerman
        ? 'Keine Strafe fuer Abwesenheit. Nur eine Spur, die weitergeht.'
        : 'No penalty for absence. Only a trail that continues.',
      symbol: 'return',
    }));
  }

  if (!crisis && /\b42\b/.test(text) && !hasRecord(state.artifacts, 'easter_egg', '42')) {
    state.artifacts.unshift(createRecord(options.userId, 'easter_egg', options.source, now, {
      symbol: '42',
      theme: 'absurd clarity',
      metadata_json: { artifactType: 'small_answer' },
    }) as UserArtifact);
    notices.push(noticeCopy(options.language, {
      id: `notice-42-${now}`,
      kind: 'easter_egg',
      title: isGerman ? 'Eine kleine Antwort ohne Frage.' : 'A small answer without a question.',
      body: isGerman
        ? '42 ist hier kein Orakel. Nur ein Zeichen dafuer, dass Bedeutung manchmal zuerst laechelt.'
        : '42 is not an oracle here. Only a sign that meaning sometimes smiles first.',
      symbol: '42',
    }));
  }

  Object.entries(symbolLexicon).forEach(([symbol, patterns]) => {
    if (!patterns.some(pattern => pattern.test(text))) return;
    state.symbolCounts[symbol] = (state.symbolCounts[symbol] || 0) + 1;

    if (!crisis && state.symbolCounts[symbol] >= 2 && !hasRecord(state.echoes, 'symbol_repeat', symbol)) {
      state.echoes.unshift(createRecord(options.userId, 'symbol_repeat', options.source, now, {
        symbol,
        theme: 'symbolic continuity',
        confidence: 0.78,
        metadata_json: { count: state.symbolCounts[symbol] },
      }) as SymbolicEcho);
      notices.push(noticeCopy(options.language, {
        id: `notice-symbol-${symbol}-${now}`,
        kind: 'symbol_repeat',
        title: isGerman ? 'Ein Symbol ist wieder aufgetaucht.' : 'A symbol has returned.',
        body: isGerman
          ? `Das ${symbol.replace('_', ' ')}-Motiv steht wieder im Raum. Nicht als Beweis, eher als Spur.`
          : `The ${symbol.replace('_', ' ')} motif is in the room again. Not as proof, more like a trace.`,
        symbol,
      }));
    }
  });

  const phrase = normalizePhrase(text);
  if (!crisis && phrase) {
    state.phraseCounts[phrase] = (state.phraseCounts[phrase] || 0) + 1;
    if (state.phraseCounts[phrase] >= 2 && !hasRecord(state.echoes, 'phrase_repeat', phrase)) {
      state.echoes.unshift(createRecord(options.userId, 'phrase_repeat', options.source, now, {
        symbol: phrase,
        theme: 'mirror echo',
        confidence: 0.82,
        metadata_json: { count: state.phraseCounts[phrase] },
      }) as SymbolicEcho);
      notices.push(noticeCopy(options.language, {
        id: `notice-phrase-${now}`,
        kind: 'phrase_repeat',
        title: isGerman ? 'Ein Echo ist erschienen.' : 'An echo has appeared.',
        body: isGerman
          ? 'Dieser Satz oder seine Form hat dich schon einmal gefunden.'
          : 'This sentence, or its shape, has found you before.',
        symbol: 'mirror_echo',
      }));
    }
  }

  const overAnalyzing = overAnalysisPatterns.some(pattern => pattern.test(text)) || text.length > 900;
  if (!crisis && overAnalyzing && !hasRecord(state.hiddenRooms, 'hidden_room', 'silence_room')) {
    state.hiddenRooms.unshift(createRecord(options.userId, 'hidden_room', options.source, now, {
      symbol: 'silence_room',
      theme: 'silence',
      intensity: 3,
      metadata_json: { roomType: 'grounding' },
    }) as HiddenRoomUnlock);
    notices.push(noticeCopy(options.language, {
      id: `notice-silence-${now}`,
      kind: 'hidden_room',
      title: isGerman ? 'Ein stiller Raum hat sich geoeffnet.' : 'A quiet room has opened.',
      body: isGerman
        ? 'Nicht alles muss jetzt geloest werden. Manche Tueren oeffnen sich erst, wenn der Kopf leiser wird.'
        : 'Not everything has to be solved now. Some doors open only when the mind gets quieter.',
      roomId: 'silence_room',
      symbol: 'silence',
    }));
  }

  if (!crisis && clarityPatterns.some(pattern => pattern.test(text)) && state.constellations.length < 1) {
    state.constellations.unshift(createRecord(options.userId, 'constellation', options.source, now, {
      symbol: 'first_clarity',
      theme: 'clarity',
      archetype: options.archetype,
      intensity: 4,
      metadata_json: { kind: 'emotional_clarity' },
    }) as ConstellationEntry);
    notices.push(noticeCopy(options.language, {
      id: `notice-constellation-${now}`,
      kind: 'constellation',
      title: isGerman ? 'Eine Konstellation hat sich gebildet.' : 'A constellation has formed.',
      body: isGerman
        ? 'Ein paar lose Punkte wirken fuer einen Moment verbunden. Halte es leicht.'
        : 'A few loose points feel connected for a moment. Hold it lightly.',
      symbol: 'clarity',
    }));
  }

  state.lastSeenAt = now;
  saveState(options.userId, state);
  return notices.slice(0, 1);
};

export const loadPlayfulDiscoveryState = (userId: string): DiscoveryState => loadState(userId);
