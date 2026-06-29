import {
  CommunicationMode,
  EmotionalStateScan,
  IntegrationCycle,
  StateAwarenessContext,
  StateImpulseKind,
  StateNarrativeCharge,
  StateResponsibilityOrientation,
} from '../types';

const STATE_AWARENESS_SCHEMA_VERSION = 1;

interface StateAwarenessOptions {
  emotionalState?: EmotionalStateScan;
  cycle?: IntegrationCycle | null;
  communicationMode?: CommunicationMode;
}

const unique = <T,>(items: T[]): T[] => Array.from(new Set(items));

const includesAny = (text: string, patterns: RegExp[]): boolean => {
  return patterns.some(pattern => pattern.test(text));
};

const countMatches = (text: string, patterns: RegExp[]): number => {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
};

const compact = (value: string, maxLength = 160): string => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 3)}...` : normalized;
};

const pickSentences = (texts: string[], patterns: RegExp[], limit = 3): string[] => {
  const sentences = texts
    .flatMap(text => text.split(/(?<=[.!?])\s+|\n+/))
    .map(sentence => compact(sentence))
    .filter(Boolean);

  return unique(sentences.filter(sentence => includesAny(sentence.toLowerCase(), patterns))).slice(0, limit);
};

const absoluteLanguagePatterns = [
  /\balways\b/i,
  /\bnever\b/i,
  /\bmust\b/i,
  /\bcannot\b/i,
  /\bcan't\b/i,
  /\bthe answer is\b/i,
  /\bthe only way\b/i,
  /\bproof\b/i,
  /\bimmer\b/i,
  /\bnie\b/i,
  /\bniemals\b/i,
  /\bmuss\b/i,
  /\bkann nicht\b/i,
  /\bdie antwort ist\b/i,
  /\bder einzige weg\b/i,
  /\bbeweis\b/i,
];

const narrativePatterns = [
  /\bstory\b/i,
  /\bnarrative\b/i,
  /\bmeaning\b/i,
  /\bsign\b/i,
  /\bfate\b/i,
  /\bdestiny\b/i,
  /\bmeant to\b/i,
  /\bprojection\b/i,
  /\bmodel\b/i,
  /\bfragment\b/i,
  /\bgeschichte\b/i,
  /\bbedeutung\b/i,
  /\bzeichen\b/i,
  /\bschicksal\b/i,
  /\bprojektion\b/i,
  /\bmodell\b/i,
  /\bfragment\b/i,
];

const attentionPatterns = [
  /\battention\b/i,
  /\bfocus\b/i,
  /\bi keep looking\b/i,
  /\bi cannot stop\b/i,
  /\bpulls me\b/i,
  /\baufmerksamkeit\b/i,
  /\bfokus\b/i,
  /\bich schaue immer\b/i,
  /\bich kann nicht aufhoeren\b/i,
  /\bzieht mich\b/i,
];

const controlPatterns = [
  /\bcontrol\b/i,
  /\bmake (him|her|them|it)\b/i,
  /\bforce\b/i,
  /\bprove\b/i,
  /\bcertainty\b/i,
  /\bguarantee\b/i,
  /\bconvince\b/i,
  /\bfix them\b/i,
  /\bkontroll/i,
  /\bzwingen\b/i,
  /\bbeweisen\b/i,
  /\bgewissheit\b/i,
  /\bgarantie\b/i,
  /\bueberzeugen\b/i,
  /\breparieren\b/i,
];

const withdrawPatterns = [
  /\bwithdraw\b/i,
  /\brun away\b/i,
  /\bghost\b/i,
  /\bblock\b/i,
  /\bleave\b/i,
  /\bcut off\b/i,
  /\bhide\b/i,
  /\brueckzug\b/i,
  /\bzurueckziehen\b/i,
  /\bweglaufen\b/i,
  /\bblockieren\b/i,
  /\bgehen\b/i,
  /\babbrechen\b/i,
  /\bverstecken\b/i,
];

const connectPatterns = [
  /\bconnect\b/i,
  /\breach out\b/i,
  /\btalk\b/i,
  /\blisten\b/i,
  /\bask\b/i,
  /\brepair\b/i,
  /\bresponsibility\b/i,
  /\btogether\b/i,
  /\bwe\b/i,
  /\bverbinden\b/i,
  /\bnaehe\b/i,
  /\bnahe\b/i,
  /\bsprechen\b/i,
  /\bzuhoeren\b/i,
  /\bfragen\b/i,
  /\bklaeren\b/i,
  /\bverantwortung\b/i,
  /\bgemeinsam\b/i,
  /\bwir\b/i,
];

const actionPatterns = [
  /\bnow\b/i,
  /\btoday\b/i,
  /\bimmediately\b/i,
  /\bnext step\b/i,
  /\bact\b/i,
  /\bdo it\b/i,
  /\bwrite\b/i,
  /\bcall\b/i,
  /\bdecide\b/i,
  /\bjetzt\b/i,
  /\bheute\b/i,
  /\bsofort\b/i,
  /\bnaechster schritt\b/i,
  /\bhandlung\b/i,
  /\bschreiben\b/i,
  /\banrufen\b/i,
  /\bentscheiden\b/i,
];

const explicitInsightPatterns = [
  /\bi (realize|realise|understand|see) (now|that)\b/i,
  /\bi finally understand\b/i,
  /\bsomething shifted\b/i,
  /\bthis changes what i will do\b/i,
  /\bmy responsibility is\b/i,
  /\bi can own\b/i,
  /\bmir wird klar\b/i,
  /\bich erkenne\b/i,
  /\bich verstehe jetzt\b/i,
  /\bendlich verstanden\b/i,
  /\betwas hat sich verschoben\b/i,
  /\bdas veraendert\b/i,
  /\bmeine verantwortung ist\b/i,
  /\bich uebernehme\b/i,
];

const sharedResponsibilityPatterns = [
  /\bshared responsibility\b/i,
  /\bmutual\b/i,
  /\bserve us\b/i,
  /\bfor both of us\b/i,
  /\blarger we\b/i,
  /\bgemeinsame verantwortung\b/i,
  /\bbeidseitig\b/i,
  /\bfuer uns beide\b/i,
  /\bgroesseres wir\b/i,
];

const entanglementPatterns = [
  /\bcan't leave\b/i,
  /\bhave to save\b/i,
  /\bwithout me\b/i,
  /\bdepends on me\b/i,
  /\bkann nicht gehen\b/i,
  /\bmuss retten\b/i,
  /\bohne mich\b/i,
  /\bhaengt von mir ab\b/i,
];

const deriveNarrativeCharge = (
  text: string,
  emotionalState: EmotionalStateScan | undefined,
  absoluteHits: number,
  narrativeHits: number,
  controlHits: number,
  withdrawHits: number,
): StateNarrativeCharge => {
  const punctuationPressure = (text.match(/[!?]/g) || []).length;
  const highActivation = emotionalState?.activation === 'HIGH' || Boolean(emotionalState?.overloadRisk);

  if (
    highActivation ||
    absoluteHits >= 3 ||
    narrativeHits >= 3 ||
    controlHits + withdrawHits >= 2 ||
    punctuationPressure >= 6
  ) {
    return 'HIGH';
  }

  if (absoluteHits > 0 || narrativeHits > 0 || controlHits + withdrawHits > 0 || punctuationPressure >= 3) {
    return 'MEDIUM';
  }

  return 'LOW';
};

const deriveImpulseKind = (
  controlHits: number,
  withdrawHits: number,
  connectHits: number,
  actionHits: number,
  needsPause: boolean,
): StateImpulseKind => {
  if (controlHits > Math.max(withdrawHits, connectHits)) return 'CONTROL';
  if (withdrawHits > Math.max(controlHits, connectHits)) return 'WITHDRAW';
  if (connectHits > 0 && actionHits > 0) return 'REPAIR';
  if (connectHits > 0) return 'CONNECT';
  if (needsPause) return 'WAIT';
  if (actionHits > 0) return 'ACT';
  return 'UNKNOWN';
};

const deriveOrientation = (
  text: string,
  impulseKind: StateImpulseKind,
): StateResponsibilityOrientation => {
  if (includesAny(text, sharedResponsibilityPatterns)) return 'SHARED_RESPONSIBILITY';
  if (includesAny(text, entanglementPatterns)) return 'UNCONSCIOUS_ENTANGLEMENT';
  if (impulseKind === 'CONTROL') return 'CONTROL';
  if (impulseKind === 'WITHDRAW') return 'ISOLATION';
  if (impulseKind === 'CONNECT' || impulseKind === 'REPAIR') return 'CONSCIOUS_CONNECTION';
  return 'UNCLEAR';
};

const buildImpulseSummary = (impulseKind: StateImpulseKind): string | undefined => {
  const summaries: Record<StateImpulseKind, string | undefined> = {
    CONNECT: 'The story appears to create a reaching-toward impulse.',
    REPAIR: 'The story appears to create a repair impulse.',
    CONTROL: 'The story appears to create a control or certainty-seeking impulse.',
    WITHDRAW: 'The story appears to create a withdrawal or severing impulse.',
    ACT: 'The story appears to create pressure toward immediate action.',
    WAIT: 'The wiser impulse may be to pause before acting.',
    UNKNOWN: undefined,
  };

  return summaries[impulseKind];
};

export const scanStateAwareness = (
  texts: string[],
  options: StateAwarenessOptions = {},
): StateAwarenessContext => {
  const trimmedTexts = texts.map(text => text.trim()).filter(Boolean);
  const combined = trimmedTexts.join(' ');
  const normalized = combined.toLowerCase();
  const emotionalState = options.emotionalState;

  const absoluteHits = countMatches(normalized, absoluteLanguagePatterns);
  const narrativeHits = countMatches(normalized, narrativePatterns);
  const controlHits = countMatches(normalized, controlPatterns);
  const withdrawHits = countMatches(normalized, withdrawPatterns);
  const connectHits = countMatches(normalized, connectPatterns);
  const actionHits = countMatches(normalized, actionPatterns);
  const explicitInsight = includesAny(normalized, explicitInsightPatterns);

  const narrativeCharge = deriveNarrativeCharge(
    normalized,
    emotionalState,
    absoluteHits,
    narrativeHits,
    controlHits,
    withdrawHits,
  );

  const needsPause =
    Boolean(emotionalState?.overloadRisk) ||
    emotionalState?.clarity === 'OVERLOADED' ||
    (narrativeCharge === 'HIGH' && (controlHits > 0 || withdrawHits > 0));

  const impulseKind = deriveImpulseKind(controlHits, withdrawHits, connectHits, actionHits, needsPause);
  const orientation = deriveOrientation(normalized, impulseKind);
  const servesCommonGood = orientation === 'CONSCIOUS_CONNECTION' || orientation === 'SHARED_RESPONSIBILITY'
    ? true
    : orientation === 'CONTROL' || orientation === 'ISOLATION' || orientation === 'UNCONSCIOUS_ENTANGLEMENT'
      ? false
      : null;

  const wiseNow = needsPause
    ? false
    : servesCommonGood === true && impulseKind !== 'UNKNOWN'
      ? true
      : servesCommonGood === false
        ? false
        : null;

  const stateSignals = unique([
    emotionalState?.activation === 'HIGH' ? 'high activation' : undefined,
    emotionalState?.overloadRisk ? 'possible overload' : undefined,
    narrativeCharge !== 'LOW' ? `${narrativeCharge.toLowerCase()} narrative charge` : undefined,
    absoluteHits > 0 ? 'absolute or fate-like language' : undefined,
    controlHits > 0 ? 'control/certainty pressure' : undefined,
    withdrawHits > 0 ? 'withdrawal pressure' : undefined,
    connectHits > 0 ? 'connection/responsibility language' : undefined,
    options.cycle?.theme ? `active cycle: ${options.cycle.theme}` : undefined,
  ].filter(Boolean) as string[]);

  const narrativeFragments = pickSentences(trimmedTexts, [...narrativePatterns, ...absoluteLanguagePatterns]);
  const powerfulLanguage = pickSentences(trimmedTexts, absoluteLanguagePatterns);
  const attentionDirection = pickSentences(trimmedTexts, attentionPatterns);

  const recommendedStance: CommunicationMode = needsPause
    ? 'GROUND'
    : narrativeCharge === 'HIGH' && (impulseKind === 'CONTROL' || impulseKind === 'WITHDRAW')
      ? 'HOLD'
      : impulseKind === 'REPAIR' && wiseNow
        ? 'ACT'
        : options.communicationMode || 'MIRROR';

  const breakthroughCandidate =
    explicitInsight &&
    !needsPause &&
    (connectHits > 0 || includesAny(normalized, sharedResponsibilityPatterns) || includesAny(normalized, actionPatterns));

  const confidenceSeed =
    0.35 +
    Math.min(0.35, (absoluteHits + narrativeHits + controlHits + withdrawHits + connectHits + actionHits) * 0.04) +
    (emotionalState ? 0.1 : 0);

  return {
    schemaVersion: STATE_AWARENESS_SCHEMA_VERSION,
    stateSignals,
    narrativeCharge,
    narrativeFragments,
    powerfulLanguage,
    attentionDirection,
    impulseKind,
    impulseSummary: buildImpulseSummary(impulseKind),
    phronesisCheck: {
      wiseNow,
      servesCommonGood,
      needsPause,
      reason: needsPause
        ? 'Pause before obeying the impulse; the state may be coloring story, forecast, or urgency.'
        : 'No strong pause signal detected; keep checking whether the impulse serves connection and responsibility.',
    },
    connectionResponsibility: {
      orientation,
      notes: unique([
        orientation === 'SHARED_RESPONSIBILITY' ? 'Language points toward shared responsibility.' : undefined,
        orientation === 'CONSCIOUS_CONNECTION' ? 'Language points toward conscious connection.' : undefined,
        orientation === 'UNCONSCIOUS_ENTANGLEMENT' ? 'Language may blur care with entanglement.' : undefined,
        orientation === 'CONTROL' ? 'Impulse may be trying to secure certainty or control.' : undefined,
        orientation === 'ISOLATION' ? 'Impulse may be moving toward withdrawal or severing.' : undefined,
      ].filter(Boolean) as string[]),
    },
    recommendedStance,
    doNotDebunk: narrativeCharge !== 'LOW' || narrativeFragments.length > 0,
    breakthroughCandidate,
    confidence: Number(Math.min(0.9, confidenceSeed).toFixed(2)),
    updatedAt: new Date().toISOString(),
  };
};
