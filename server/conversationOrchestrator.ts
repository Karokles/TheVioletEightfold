export type ResponseMode =
  | 'mirror'
  | 'hold'
  | 'one_voice'
  | 'council'
  | 'grounding'
  | 'exit_room'
  | 'clarify'
  | 'integration'
  | 'structure';

export type ConversationSignal =
  | 'breakthrough'
  | 'overprocessing'
  | 'symbolic_language'
  | 'emotional_clarity'
  | 'user_requests_structure'
  | 'user_requests_council'
  | 'dysregulation'
  | 'shadow_recognition'
  | 'meaning_emerging'
  | 'shame_loop';

export type OrganicArchetypeId =
  | 'SAGE'
  | 'ALCHEMIST'
  | 'WARRIOR'
  | 'LOVER'
  | 'CREATOR'
  | 'SOVEREIGN'
  | 'CAREGIVER'
  | 'EXPLORER';

export interface ResponsePlan {
  mode: ResponseMode;
  signals: ConversationSignal[];
  selectedArchetypes: OrganicArchetypeId[];
  shouldUseCouncil: boolean;
  shouldUpdateLore: boolean;
  shouldGroundFirst: boolean;
  tone: 'soft' | 'direct' | 'poetic' | 'minimal' | 'structured';
  maxResponseLength: 'short' | 'medium' | 'long';
  promptInstructions: string[];
}

const includesAny = (text: string, patterns: RegExp[]): boolean => {
  return patterns.some(pattern => pattern.test(text));
};

const countSymbolicTerms = (text: string): number => {
  const symbolicTerms = [
    'rocket', 'rakete', 'parasite', 'parasit', 'mirror', 'spiegel', 'machine', 'maschine',
    'loop', 'schleife', 'momo', 'blaubär', 'blaubaer', 'grey men', 'graue herren',
    'door', 'tür', 'tuer', 'room', 'raum', 'shadow', 'schatten',
  ];
  return symbolicTerms.filter(term => text.includes(term)).length;
};

const unique = <T>(items: T[]): T[] => Array.from(new Set(items));

export const createResponsePlan = (
  latestUserMessage: string,
  options: {
    mode: 'direct' | 'council';
    activeArchetype?: string;
    language?: string;
    conversationLength?: number;
    communicationMode?: string;
    overloadRisk?: boolean;
  },
): ResponsePlan => {
  const raw = latestUserMessage || '';
  const text = raw.toLowerCase();
  const signals: ConversationSignal[] = [];

  if (includesAny(text, [
    /\b(plan|steps|struktur|structure|prompt|codex|umsetzen|bauen|build|what now|was jetzt|was soll ich|nächster schritt|naechster schritt)\b/i,
    /mach.*plan/i,
  ])) signals.push('user_requests_structure');

  if (includesAny(text, [
    /\b(council|rat|runde|perspektiven|alle stimmen|mehrere stimmen|round table)\b/i,
    /was sagt.*rat/i,
  ])) signals.push('user_requests_council');

  if (includesAny(text, [
    /\b(real thing|eigentlich|wirklich|realisiere|erkenne|erkannt|ich glaube hier|vielleicht geht es|this is about|not about|nicht um)\b/i,
    /\b(klarer|clearer|clarity|plötzlich|ploetzlich|never saw|nie so gesehen)\b/i,
  ])) signals.push('breakthrough');

  if (includesAny(text, [
    /\b(emotion|gefühl|gefuehl|fühlen|fuehlen|körper|koerper|body|felt sense|klarer im fühlen|klarer im fuehlen)\b/i,
  ])) signals.push('emotional_clarity');

  if (includesAny(text, [
    /\b(schatten|shadow|projection|projektion|ego|abwehr|verteidigung)\b/i,
  ])) signals.push('shadow_recognition');

  if (countSymbolicTerms(text) > 0) signals.push('symbolic_language');

  if (raw.length > 900 || (raw.match(/[?!.]/g) || []).length > 9 || countSymbolicTerms(text) >= 3) {
    signals.push('overprocessing');
  }
  if (includesAny(text, [
    /\b(im kreis|drehe mich|kreiseln|spinning|ruminating|gruebeln|grübeln)\b/i,
  ])) signals.push('overprocessing');

  if (includesAny(text, [
    /\b(panik|panic|überfordert|ueberfordert|overwhelmed|flooded|schlaflos|nicht geschlafen|alles kaputt|ich bin schuld|arschloch|hate myself|ich hasse mich)\b/i,
  ])) signals.push('dysregulation');
  if (includesAny(text, [
    /\b(alles zu viel|zu viel gerade|too much right now|too much)\b/i,
  ])) signals.push('dysregulation');

  if (includesAny(text, [
    /\b(ich bin schuld|arschloch|alles ist kaputt|nichts wert|shame|scham|ich bin falsch)\b/i,
  ])) signals.push('shame_loop');

  if (signals.some(signal => ['breakthrough', 'emotional_clarity', 'shadow_recognition'].includes(signal))) {
    signals.push('meaning_emerging');
  }

  const selectedArchetypes: OrganicArchetypeId[] = [];
  if (options.activeArchetype) {
    selectedArchetypes.push(options.activeArchetype.toUpperCase() as OrganicArchetypeId);
  } else if (signals.includes('shadow_recognition')) {
    selectedArchetypes.push('ALCHEMIST');
  } else if (signals.includes('user_requests_structure')) {
    selectedArchetypes.push('SOVEREIGN');
  } else if (includesAny(text, [/\b(action|handlung|grenze|boundary|disziplin|mut|courage)\b/i])) {
    selectedArchetypes.push('WARRIOR');
  } else if (includesAny(text, [/\b(tender|nähe|naehe|liebe|connection|heart|herz)\b/i])) {
    selectedArchetypes.push('LOVER');
  }

  let mode: ResponseMode = 'mirror';
  if (signals.includes('user_requests_structure')) mode = 'structure';
  else if (signals.includes('shame_loop')) mode = 'exit_room';
  else if (signals.includes('dysregulation')) mode = 'grounding';
  else if (
    signals.includes('user_requests_council')
    || (options.mode === 'council'
      && (options.conversationLength ?? 0) <= 1
      && !signals.includes('meaning_emerging')
      && !signals.includes('dysregulation')
      && !signals.includes('overprocessing'))
  ) mode = 'council';
  else if (signals.includes('shadow_recognition') && signals.includes('breakthrough')) mode = 'hold';
  else if (signals.includes('symbolic_language') && !signals.includes('breakthrough')) mode = 'clarify';
  else if (signals.includes('meaning_emerging')) mode = 'mirror';
  else if (selectedArchetypes.length > 0) mode = 'one_voice';

  if (
    options.communicationMode === 'ACT'
    && mode !== 'structure'
    && mode !== 'council'
    && !signals.includes('dysregulation')
    && !signals.includes('overprocessing')
  ) {
    mode = 'integration';
  }

  const shouldUseCouncil = mode === 'council';
  const shouldGroundFirst = mode === 'grounding' || signals.includes('dysregulation') || Boolean(options.overloadRisk);
  const tone = mode === 'structure'
    ? 'structured'
    : mode === 'grounding' || mode === 'hold' || mode === 'exit_room'
      ? 'soft'
      : signals.includes('symbolic_language')
        ? 'poetic'
        : signals.includes('meaning_emerging')
          ? 'minimal'
          : 'direct';

  const maxResponseLength = mode === 'council'
    ? 'medium'
    : mode === 'structure'
      ? 'medium'
      : 'short';

  const language = options.language === 'DE' ? 'DE' : 'EN';
  const promptInstructions = buildOrganicInstructions({ mode, signals: unique(signals), tone, maxResponseLength, language, selectedArchetypes });

  return {
    mode,
    signals: unique(signals),
    selectedArchetypes: unique(selectedArchetypes).slice(0, shouldUseCouncil ? 4 : 1),
    shouldUseCouncil,
    shouldUpdateLore: signals.includes('breakthrough') || signals.includes('meaning_emerging'),
    shouldGroundFirst,
    tone,
    maxResponseLength,
    promptInstructions,
  };
};

const buildOrganicInstructions = (plan: {
  mode: ResponseMode;
  signals: ConversationSignal[];
  tone: ResponsePlan['tone'];
  maxResponseLength: ResponsePlan['maxResponseLength'];
  language: 'EN' | 'DE';
  selectedArchetypes: OrganicArchetypeId[];
}): string[] => {
  const isGerman = plan.language === 'DE';
  const base = isGerman
    ? [
        'Antworte organisch, nicht wie ein Panel oder Workshop.',
        'Der Nutzer bleibt fuehrend. Deute nicht mehr als noetig.',
        'Maximal eine praezise Frage am Ende. Keine Frageketten.',
        'Keine generische Bewunderung, kein Coaching-Ton, kein Therapie-Sound.',
      ]
    : [
        'Respond organically, not like a panel or workshop.',
        'The user remains in the lead. Do not interpret more than needed.',
        'End with at most one precise question. No question chains.',
        'No generic admiration, coaching tone, or therapy voice.',
      ];

  const modeInstruction: Record<ResponseMode, string> = {
    mirror: isGerman
      ? 'MIRROR MODE: Spiegle den Kern mit minimaler Interpretation. Bleib bei dem Satz des Nutzers und frage nur, was daran klarer/lebendiger wird.'
      : 'MIRROR MODE: Reflect the core with minimal interpretation. Stay close to the user sentence and ask only what becomes clearer or more alive.',
    hold: isGerman
      ? 'HOLD MODE: Nicht weiter ausbauen. Markiere den Schwellenmoment, lass ihn atmen, stelle eine kleine vertiefende Frage.'
      : 'HOLD MODE: Do not add more content. Mark the threshold moment, let it breathe, ask one small deepening question.',
    one_voice: isGerman
      ? `ONE VOICE MODE: Nur eine Linse spricht (${plan.selectedArchetypes[0] || 'SOVEREIGN'}). Kein Council, keine weiteren Stimmen.`
      : `ONE VOICE MODE: Only one lens speaks (${plan.selectedArchetypes[0] || 'SOVEREIGN'}). No council, no other voices.`,
    council: isGerman
      ? 'COUNCIL MODE: Nutze nur wenige wirklich relevante Stimmen. Jede Stimme kurz, unterscheidbar, kein Wiederholen.'
      : 'COUNCIL MODE: Use only a few truly relevant voices. Each voice is brief, distinct, and non-repetitive.',
    grounding: isGerman
      ? 'GROUNDING MODE: Nicht analysieren. Intensitaet senken. Frage nach Koerper, Schlaf, Wasser, Essen, Umgebung oder einem unmittelbaren Halt.'
      : 'GROUNDING MODE: Do not analyze. Lower intensity. Ask about body, sleep, water, food, surroundings, or immediate support.',
    exit_room: isGerman
      ? 'EXIT ROOM MODE: Behandle Scham/Schuld nicht als Wahrheit. Oeffne eine kleine andere Tuer, ohne die Erfahrung zu entwerten.'
      : 'EXIT ROOM MODE: Do not treat shame/blame as truth. Open one small alternate door without invalidating the experience.',
    clarify: isGerman
      ? 'CLARIFY MODE: Symbol nicht erklaeren. Frage, was das Symbol fuer den Nutzer emotional tut.'
      : 'CLARIFY MODE: Do not explain the symbol. Ask what the symbol is doing emotionally for the user.',
    integration: isGerman
      ? 'INTEGRATION MODE: Uebersetze Einsicht in eine kleine heutige Handlung. Nicht mehr als ein Schritt.'
      : 'INTEGRATION MODE: Translate insight into one small action today. No more than one step.',
    structure: isGerman
      ? 'STRUCTURE MODE: Der Nutzer will Struktur. Gib einen klaren, knappen Plan ohne mystische Ueberdeutung.'
      : 'STRUCTURE MODE: The user wants structure. Give a clear, concise plan without mystical over-interpretation.',
  };

  return [
    ...base,
    modeInstruction[plan.mode],
    isGerman
      ? `Response plan: mode=${plan.mode}, signals=${plan.signals.join(', ') || 'none'}, tone=${plan.tone}, length=${plan.maxResponseLength}.`
      : `Response plan: mode=${plan.mode}, signals=${plan.signals.join(', ') || 'none'}, tone=${plan.tone}, length=${plan.maxResponseLength}.`,
  ];
};

export const buildOrganicPromptBlock = (plan: ResponsePlan): string => {
  return [
    'ORGANIC CONVERSATION ORCHESTRATOR:',
    ...plan.promptInstructions.map(instruction => `- ${instruction}`),
  ].join('\n');
};
