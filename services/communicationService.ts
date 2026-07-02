import { CommunicationMode, CommunicationPreferences, ConsentState, EmotionalStateScan, IntegrationCycle, MeaningContext, StateAwarenessContext } from '../types';
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

const compact = (value: string, maxLength = 320): string => {
  const text = value.replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
};

const buildCycleBrief = (cycle: IntegrationCycle | null): string | undefined => {
  if (!cycle) return undefined;

  const onboarding = cycle.onboardingAnswers
    .filter(answer => answer.value.trim())
    .slice(0, 5)
    .map(answer => `- ${answer.label}: ${compact(answer.value, 220)}`);

  const records = cycle.dayRecords
    .filter(record => record.completedAt || record.sense || record.trace || record.externalize || record.reframe || record.embody || record.antiEgoCheck)
    .sort((a, b) => b.day - a.day)
    .slice(0, 3)
    .map(record => {
      const fields = [
        record.sense ? `Signal: ${compact(record.sense, 180)}` : undefined,
        record.trace ? `Trace: ${compact(record.trace, 180)}` : undefined,
        record.externalize ? `Externalized: ${compact(record.externalize, 180)}` : undefined,
        record.reframe ? `Reframe: ${compact(record.reframe, 180)}` : undefined,
        record.embody ? `Embodied step: ${compact(record.embody, 180)}` : undefined,
        record.antiEgoCheck ? `Anti-ego check: ${compact(record.antiEgoCheck, 180)}` : undefined,
      ].filter(Boolean);

      return fields.length > 0 ? `Day ${record.day}: ${fields.join(' | ')}` : undefined;
    })
    .filter((line): line is string => Boolean(line));

  const lines = [
    `Cycle "${cycle.title}" around: ${compact(cycle.theme, 260)}`,
    onboarding.length > 0 ? `Starter answers:\n${onboarding.join('\n')}` : undefined,
    records.length > 0 ? `Recent cycle entries:\n${records.map(line => `- ${line}`).join('\n')}` : undefined,
    'Continuity rule: Treat the cycle entries as already answered context. Do not ask the user to repeat these answers; build on them or ask only what changed since then.',
  ].filter(Boolean);

  return lines.join('\n');
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
  stateAwareness?: StateAwarenessContext,
): MeaningContext => {
  return {
    communicationMode: preferences.mode,
    consentState: preferences.consentState,
    activeCycleId: cycle?.id,
    activeCycleDay: cycle ? getCycleDayNumber(cycle) : undefined,
    activeCycleTheme: cycle?.theme,
    cycleBrief: buildCycleBrief(cycle),
    overloadSignal: Boolean(emotionalState?.overloadRisk),
    emotionalState,
    stateAwareness,
    notes: [
      'State awareness comes before insight: notice state, narrative, impulse, then action.',
      'Stories are allowed to breathe; do not force interpretation.',
      'Do not break the spell by explaining the spell.',
      'Freedom means conscious participation in chosen responsibility, not escape from all bonds.',
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

const modeEffect: Record<CommunicationMode, Record<'EN' | 'DE', string>> = {
  HOLD: {
    EN: 'It keeps the room slow, protective, and less interpretive.',
    DE: 'Sie haelt den Raum langsam, schuetzend und weniger deutend.',
  },
  MIRROR: {
    EN: 'It reflects the pattern back without pushing you into a conclusion.',
    DE: 'Sie spiegelt das Muster zurueck, ohne dich in eine Schlussfolgerung zu draengen.',
  },
  EXPLORE: {
    EN: 'It opens more questions and lets the council examine one layer at a time.',
    DE: 'Sie oeffnet mehr Fragen und laesst den Rat eine Schicht nach der anderen untersuchen.',
  },
  GROUND: {
    EN: 'It translates insight into pacing, body, and nervous-system safety.',
    DE: 'Sie uebersetzt Einsicht in Tempo, Koerper und Nervensystem-Sicherheit.',
  },
  ACT: {
    EN: 'It narrows the field toward one small action that can actually be lived.',
    DE: 'Sie verengt das Feld auf eine kleine Handlung, die wirklich gelebt werden kann.',
  },
};

const modeName: Record<CommunicationMode, Record<'EN' | 'DE', string>> = {
  HOLD: { EN: 'Hold', DE: 'Halten' },
  MIRROR: { EN: 'Mirror', DE: 'Spiegeln' },
  EXPLORE: { EN: 'Explore', DE: 'Erkunden' },
  GROUND: { EN: 'Ground', DE: 'Erden' },
  ACT: { EN: 'Act', DE: 'Handeln' },
};

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

export const buildCommunicationStanceExplanation = (
  suggestion: CommunicationModeSuggestion,
  currentMode: CommunicationMode,
  language: 'EN' | 'DE',
): string[] => {
  const recommendedEffect = modeEffect[suggestion.mode][language];
  const currentEffect = modeEffect[currentMode][language];
  const recommendedName = modeName[suggestion.mode][language];
  const currentName = modeName[currentMode][language];

  if (currentMode === suggestion.mode) {
    return language === 'DE'
      ? [
          `${recommendedName} steht gerade als Empfehlung, weil ${suggestion.reason.DE.charAt(0).toLowerCase()}${suggestion.reason.DE.slice(1)}`,
          recommendedEffect,
        ]
      : [
          `${recommendedName} is recommended right now because ${suggestion.reason.EN.charAt(0).toLowerCase()}${suggestion.reason.EN.slice(1)}`,
          recommendedEffect,
        ];
  }

  return language === 'DE'
    ? [
        `Empfohlen waere gerade ${recommendedName}, weil ${suggestion.reason.DE.charAt(0).toLowerCase()}${suggestion.reason.DE.slice(1)}`,
        `Du hast ${currentName} gewaehlt; dadurch wird die Antwort anders gefaerbt: ${currentEffect}`,
        `${recommendedName} bleibt die leise Orientierung, aber ${currentName} bestimmt den Ton der naechsten Interaktion.`,
      ]
    : [
        `${recommendedName} would be recommended right now because ${suggestion.reason.EN.charAt(0).toLowerCase()}${suggestion.reason.EN.slice(1)}`,
        `You selected ${currentName}; that changes the response shape: ${currentEffect}`,
        `${recommendedName} remains the quiet orientation, but ${currentName} sets the tone of the next interaction.`,
      ];
};
