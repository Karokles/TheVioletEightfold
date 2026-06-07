import { CommunicationMode, CommunicationPreferences, ConsentState, EmotionalStateScan, IntegrationCycle, MeaningContext } from '../types';
import { getCycleDayNumber } from './cycleService';
import { getUserScopedKey } from './userService';

const COMMUNICATION_PREFS_KEY = 'communication_preferences';
const COMMUNICATION_SCHEMA_VERSION = 1;

export const DEFAULT_COMMUNICATION_PREFERENCES: CommunicationPreferences = {
  schemaVersion: COMMUNICATION_SCHEMA_VERSION,
  mode: 'MIRROR',
  consentState: 'ASK_BEFORE_DEEPENING',
  updatedAt: new Date(0).toISOString(),
};

const isCommunicationMode = (value: unknown): value is CommunicationMode => {
  return ['HOLD', 'MIRROR', 'EXPLORE', 'GROUND', 'ACT'].includes(String(value));
};

const isConsentState = (value: unknown): value is ConsentState => {
  return ['IMPLICIT_OK', 'ASK_BEFORE_DEEPENING', 'USER_REQUESTED_DIRECTION', 'LOW_INTERVENTION'].includes(String(value));
};

const normalizePreferences = (value: Partial<CommunicationPreferences> | null): CommunicationPreferences => {
  return {
    schemaVersion: COMMUNICATION_SCHEMA_VERSION,
    mode: isCommunicationMode(value?.mode) ? value.mode : DEFAULT_COMMUNICATION_PREFERENCES.mode,
    consentState: isConsentState(value?.consentState)
      ? value.consentState
      : DEFAULT_COMMUNICATION_PREFERENCES.consentState,
    updatedAt: value?.updatedAt || new Date().toISOString(),
  };
};

export const loadCommunicationPreferences = (userId: string): CommunicationPreferences => {
  const saved = localStorage.getItem(getUserScopedKey(COMMUNICATION_PREFS_KEY, userId));
  if (!saved) {
    return { ...DEFAULT_COMMUNICATION_PREFERENCES, updatedAt: new Date().toISOString() };
  }

  try {
    return normalizePreferences(JSON.parse(saved));
  } catch (error) {
    console.warn('Failed to parse communication preferences, using defaults', error);
    return { ...DEFAULT_COMMUNICATION_PREFERENCES, updatedAt: new Date().toISOString() };
  }
};

export const saveCommunicationPreferences = (
  userId: string,
  preferences: CommunicationPreferences,
): CommunicationPreferences => {
  const normalized = normalizePreferences({
    ...preferences,
    updatedAt: new Date().toISOString(),
  });

  localStorage.setItem(getUserScopedKey(COMMUNICATION_PREFS_KEY, userId), JSON.stringify(normalized));
  return normalized;
};

export const buildMeaningContext = (
  preferences: CommunicationPreferences,
  cycle: IntegrationCycle | null,
  emotionalState?: EmotionalStateScan,
): MeaningContext => {
  return {
    communicationMode: preferences.mode,
    consentState: preferences.consentState,
    activeCycleId: cycle?.id,
    activeCycleDay: cycle ? getCycleDayNumber(cycle) : undefined,
    activeCycleTheme: cycle?.theme,
    overloadSignal: Boolean(emotionalState?.overloadRisk),
    emotionalState,
    notes: [
      'Stories are allowed to breathe; do not force interpretation.',
      'Ask before deepening when the user may be overloaded.',
      'Exit rooms are available only when needed or requested.',
    ],
  };
};

export interface CommunicationModeSuggestion {
  mode: CommunicationMode;
  reason: {
    EN: string;
    DE: string;
  };
}

export const suggestCommunicationMode = (
  cycle: IntegrationCycle | null,
  surface: 'DIRECT_CHAT' | 'COUNCIL_SESSION' | 'CYCLE' | 'STATS',
): CommunicationModeSuggestion => {
  if (surface === 'CYCLE') {
    return {
      mode: 'ACT',
      reason: {
        EN: 'Cycle work benefits from one small embodied action.',
        DE: 'Zyklusarbeit profitiert von einer kleinen verkörperten Handlung.',
      },
    };
  }

  if (!cycle) {
    return {
      mode: surface === 'COUNCIL_SESSION' ? 'MIRROR' : 'HOLD',
      reason: {
        EN: 'No active cycle context is pressing for depth.',
        DE: 'Kein aktiver Zyklus drängt gerade in die Tiefe.',
      },
    };
  }

  const day = getCycleDayNumber(cycle);
  const isMilestoneWindow = [1, 7, 21, 42, 63].includes(day);

  if (isMilestoneWindow) {
    return {
      mode: 'GROUND',
      reason: {
        EN: 'Milestone days ask for pacing and integration before interpretation.',
        DE: 'Meilenstein-Tage brauchen Tempo-Schutz und Integration vor Deutung.',
      },
    };
  }

  if (day <= 7) {
    return {
      mode: 'HOLD',
      reason: {
        EN: 'Early cycle days work best when the story can breathe.',
        DE: 'Frühe Zyklus-Tage funktionieren besser, wenn die Geschichte atmen darf.',
      },
    };
  }

  if (surface === 'COUNCIL_SESSION') {
    return {
      mode: 'EXPLORE',
      reason: {
        EN: 'The council can gently examine one layer at a time.',
        DE: 'Der Rat kann behutsam eine Schicht nach der anderen erkunden.',
      },
    };
  }

  return {
    mode: 'MIRROR',
    reason: {
      EN: 'Mirroring keeps continuity without taking over the process.',
      DE: 'Spiegeln hält Kontinuität, ohne den Prozess zu übernehmen.',
    },
  };
};
