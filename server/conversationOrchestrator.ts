export type ResponseMode =
  | 'arrival'
  | 'mirror'
  | 'hold'
  | 'one_voice'
  | 'council'
  | 'grounding'
  | 'exit_room'
  | 'clarify'
  | 'integration'
  | 'structure';

export type UserIntent =
  | 'SHARE'
  | 'REFLECT'
  | 'ARRIVE'
  | 'ACT'
  | 'PLAN'
  | 'TEST_SYSTEM'
  | 'ASK_META'
  | 'EXPLORE'
  | 'FEEL'
  | 'BUILD'
  | 'DECIDE';

export type ConversationSignal =
  | 'arrival'
  | 'no_solution_needed'
  | 'meta_system_question'
  | 'mode_feedback'
  | 'user_tests_behavior'
  | 'user_requests_action_options'
  | 'listening_without_pressure'
  | 'possible_false_absolute'
  | 'user_sharing_feedback'
  | 'internal_conflict'
  | 'decision_tension'
  | 'breakthrough'
  | 'overprocessing'
  | 'symbolic_language'
  | 'emotional_clarity'
  | 'user_requests_structure'
  | 'user_requests_council'
  | 'dysregulation'
  | 'shadow_recognition'
  | 'meaning_emerging'
  | 'shame_loop'
  | 'state_awareness'
  | 'state_narrative_charge'
  | 'impulse_pressure'
  | 'control_or_withdrawal_impulse'
  | 'connection_responsibility';

export type OrganicArchetypeId =
  | 'SAGE'
  | 'ALCHEMIST'
  | 'WARRIOR'
  | 'LOVER'
  | 'CREATOR'
  | 'SOVEREIGN'
  | 'CAREGIVER'
  | 'EXPLORER';

export interface StateAwarenessPlanInput {
  narrativeCharge?: string;
  narrativeFragments?: string[];
  powerfulLanguage?: string[];
  attentionDirection?: string[];
  impulseKind?: string;
  impulseSummary?: string;
  phronesisCheck?: {
    wiseNow?: boolean | null;
    servesCommonGood?: boolean | null;
    needsPause?: boolean;
    reason?: string;
  };
  connectionResponsibility?: {
    orientation?: string;
    notes?: string[];
  };
  recommendedStance?: string;
  doNotDebunk?: boolean;
  breakthroughCandidate?: boolean;
}

export interface ResponsePlan {
  intent: UserIntent;
  mode: ResponseMode;
  signals: ConversationSignal[];
  selectedArchetypes: OrganicArchetypeId[];
  shouldUseCouncil: boolean;
  shouldUpdateLore: boolean;
  shouldGroundFirst: boolean;
  permissions: {
    allowQuestions: boolean;
    allowNextSteps: boolean;
    allowSuggestions: boolean;
    allowCouncil: boolean;
    maxVisibleVoices: number;
    shouldExplainState: boolean;
  };
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

const hasCouncilWorthyTension = (text: string): boolean => {
  return includesAny(text, [
    /\b(vs|versus|against|between|conflict|dilemma|decision|decide|choose|either|or|both|competing|tension)\b/i,
    /\b(zwischen|konflikt|dilemma|entscheidung|entscheiden|waehlen|wählen|entweder|oder|beides|spannung)\b/i,
    /\b(trust.*boundar|boundar.*trust|vertrauen.*grenze|grenze.*vertrauen|freedom.*commitment|commitment.*freedom|freiheit.*bindung|bindung.*freiheit)\b/i,
    /\b(study|studium|university|job|career|relationship|beziehung|marriage|children|move countries|auswandern|founder|gruenden|gründen)\b/i,
  ]);
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
    stateAwareness?: StateAwarenessPlanInput;
  },
): ResponsePlan => {
  const raw = latestUserMessage || '';
  const text = raw.toLowerCase();
  const signals: ConversationSignal[] = [];
  const stateAwareness = options.stateAwareness;
  const stateNarrativeCharge = String(stateAwareness?.narrativeCharge || '').toUpperCase();
  const stateImpulseKind = String(stateAwareness?.impulseKind || '').toUpperCase();
  const stateNeedsPause = Boolean(stateAwareness?.phronesisCheck?.needsPause);
  const stateBreakthroughCandidate = stateAwareness?.breakthroughCandidate;
  const isMetaSystemQuestion = includesAny(text, [
    /\b(mode|state|zustand|modus|vorschlag|suggested|suggestion|planner|system|kommunikationshaltung|communication mode|response plan)\b.*\b(ändert|aendert|wechselt|switch|change|funktioniert|works|warum|why|noch|still)\b/i,
    /\b(ändert|aendert|wechselt|switch|change)\b.*\b(mode|state|zustand|modus|vorschlag|suggested|suggestion|kommunikationshaltung)\b/i,
    /\b(handeln|action|act)\b.*\b(zustand|modus|mode|state|vorschlag|suggestion)\b/i,
    /\b(zustand|modus|mode|state|vorschlag|suggestion)\b.*\b(handeln|action|act)\b/i,
    /\b(warum|why)\b.*\b(spiegel|mirror|modus|mode|zustand|state|reagier|respond)\b/i,
    /\b(wie.*(mode|modus|zustand|state).*funktioniert|how.*(mode|state).*works)\b/i,
  ]);
  const isModeFeedback = includesAny(text, [
    /\b(vorschlag|suggestion|modus|mode|zustand|state|kommunikationshaltung)\b.*\b(immer noch|still|scheint|seems)\b.*\b(spiegel|mirror|halten|hold|handeln|act|action)\b/i,
    /\b(immer noch|still)\b.*\b(spiegel|mirror|mirroring|spiegeln)\b/i,
  ]);
  const isBehaviorTest = includesAny(text, [
    /\b(ich teste|teste gerade|test gerade|testing|i am testing|i'm testing)\b.*\b(reagier|anders|different|zuh.r|listen|mode|modus)\b/i,
    /\b(ob ihr|whether you)\b.*\b(wirklich|really)\b.*\b(anders|different|zuh.r|listen|reagier|respond)\b/i,
  ]);
  const isListeningWithoutPressure = includesAny(text, [
    /\b(zuh.ren|zuhoren|zuhören|listen)\b.*\b(ohne|without)\b.*\b(treib|push|dr.ng|draeng|drive|handlungsschritte|action steps)\b/i,
    /\b(ohne|without)\b.*\b(handlungsschritte|action steps|treib|push|dr.ng|draeng)\b/i,
    /\bohne mich zu treiben\b/i,
    /\bohne.*treiben\b/i,
  ]);
  const isBuildRequest = includesAny(text, [
    /\b(codex|prompt|implement|implementation|umsetzung|bauen|build|code|komponente|component)\b/i,
  ]);
  const isPlanRequest = includesAny(text, [
    /\b(plan|steps|struktur|structure|konkreten plan|konkreter plan|roadmap|ablauf)\b/i,
    /mach.*plan/i,
  ]);
  const isActionOptionsRequest = includesAny(text, [
    /\b(optionen|options|was.*tun|what.*do|was.*machen|what.*can i do|was ich jetzt tun kann|was kann ich jetzt tun)\b/i,
    /\b(gib mir|give me)\b.*\b(optionen|options|handlungen|actions|next moves|n.chste bewegungen|naechste bewegungen)\b/i,
  ]);

  if (isMetaSystemQuestion) signals.push('meta_system_question');
  if (isModeFeedback) signals.push('mode_feedback');
  if (isBehaviorTest) signals.push('user_tests_behavior');
  if (isListeningWithoutPressure) signals.push('listening_without_pressure');
  if (isActionOptionsRequest) signals.push('user_requests_action_options');
  if (stateAwareness) signals.push('state_awareness');
  if (stateNarrativeCharge === 'HIGH') signals.push('state_narrative_charge');
  if (stateNeedsPause) signals.push('impulse_pressure');
  if (stateImpulseKind === 'CONTROL' || stateImpulseKind === 'WITHDRAW') {
    signals.push('control_or_withdrawal_impulse');
  }
  if (['CONSCIOUS_CONNECTION', 'SHARED_RESPONSIBILITY'].includes(String(stateAwareness?.connectionResponsibility?.orientation || '').toUpperCase())) {
    signals.push('connection_responsibility');
  }

  if (includesAny(text, [
    /\b(plan|steps|struktur|structure|prompt|codex|umsetzen|bauen|build|what now|was jetzt|was soll ich|nächster schritt|naechster schritt)\b/i,
    /mach.*plan/i,
  ])) signals.push('user_requests_structure');

  if (includesAny(text, [
    /\b(council|rat|runde|perspektiven|alle stimmen|mehrere stimmen|round table)\b/i,
    /was sagt.*rat/i,
  ])) signals.push('user_requests_council');

  if ((isPlanRequest || isBuildRequest || isActionOptionsRequest) && !signals.includes('user_requests_structure')) {
    signals.push('user_requests_structure');
  }

  if (includesAny(text, [
    /\b(does not need solving|doesn't need solving|do not think this needs solving|don't think this needs solving|do not think this needs to be solved|don't think this needs to be solved|needs no solving|not need solving|not a problem to solve|does not need to become|doesn't need to become)\b/i,
    /\b(muss nicht gel.st werden|braucht nicht gel.st werden|nicht.*gel.st werden|kein problem.*l[oö]sen|nicht weiterentwickel|keine n[aä]chste schicht|keine weitere schicht)\b/i,
  ])) signals.push('no_solution_needed');

  if (includesAny(text, [
    /\b(i trust love|trust love|i will not let fear|will not let fear|answer seems to arrive|answer arrived|rather than being produced|rather than be produced|finally understand|something settled|something has landed|let it land|already arrived|do not need certainty|don't need certainty|do not need to know|don't need to know)\b/i,
    /\b(ich vertraue.*liebe|vertraue auf die liebe|nicht von angst leiten|antwort scheint.*anzukommen|antwort.*angekommen|ich verstehe.*endlich|endlich.*verstanden|etwas.*gelandet|f[uü]hlt sich.*gelandet|ankommen.*erzeuge|keine sicherheit.*mut|brauche keine sicherheit|ich muss es nicht wissen)\b/i,
  ])) signals.push('arrival');

  if (includesAny(text, [
    /\b(it feels better|this feels better|that feels better|feels more resonant|that resonates|this resonates|i feel more understood|this feels different|i like this version|this version works|that lands better)\b/i,
    /\b(f.hlt sich besser an|fuehlt sich besser an|fÃ¼hlt sich besser an|resoniert mehr|das resoniert|ich f.hle mich verstandener|ich fuehle mich verstandener|ich fÃ¼hle mich verstandener|f.hlt sich anders an|fuehlt sich anders an|fÃ¼hlt sich anders an|die version mag ich|landet besser)\b/i,
  ])) signals.push('user_sharing_feedback');

  if (includesAny(text, [
    /\b(comes before|always leads to|true growth requires|real growth requires|the key is|the answer is|real freedom is|human beings need|healing starts with|healing requires|you must|always|never)\b/i,
    /\b(kommt vor|fuehrt immer zu|fÃ¼hrt immer zu|wahres wachstum braucht|der schluessel ist|der schlÃ¼ssel ist|die antwort ist|echte freiheit ist|menschen brauchen|heilung beginnt mit|heilung braucht|du musst|immer|niemals|nie)\b/i,
  ])) signals.push('possible_false_absolute');

  if (hasCouncilWorthyTension(text)) signals.push('internal_conflict');

  if (includesAny(text, [
    /\b(should i|soll ich|sollte ich|do i choose|do i stay|do i leave|bleiben oder gehen|quit|abbrechen|move|umziehen|commit|trennen|separate|entscheidung treffen)\b/i,
  ])) signals.push('decision_tension');

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

  if (!isMetaSystemQuestion && !isModeFeedback && countSymbolicTerms(text) > 0) signals.push('symbolic_language');

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

  const intent: UserIntent = (() => {
    if (signals.includes('mode_feedback') || signals.includes('user_tests_behavior')) return 'TEST_SYSTEM';
    if (signals.includes('meta_system_question')) return 'ASK_META';
    if (isBuildRequest) return 'BUILD';
    if (isPlanRequest) return 'PLAN';
    if (signals.includes('user_requests_action_options')) return 'ACT';
    if (signals.includes('no_solution_needed') || signals.includes('arrival')) return 'ARRIVE';
    if (signals.includes('decision_tension') || signals.includes('internal_conflict')) return 'DECIDE';
    if (signals.includes('listening_without_pressure')) return 'TEST_SYSTEM';
    if (signals.includes('emotional_clarity')) return 'FEEL';
    if (signals.includes('symbolic_language')) return 'EXPLORE';
    if (signals.includes('meaning_emerging')) return 'REFLECT';
    return 'SHARE';
  })();

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
  if (intent === 'ASK_META' || signals.includes('mode_feedback') || signals.includes('user_tests_behavior')) mode = 'structure';
  else if (signals.includes('listening_without_pressure')) mode = 'hold';
  else if (signals.includes('no_solution_needed') || signals.includes('arrival') || signals.includes('user_sharing_feedback')) mode = 'arrival';
  else if (signals.includes('user_requests_structure')) mode = 'structure';
  else if (signals.includes('shame_loop')) mode = 'exit_room';
  else if (signals.includes('dysregulation')) mode = 'grounding';
  else if (
    signals.includes('user_requests_council')
    || (options.mode === 'council'
      && (options.conversationLength ?? 0) <= 1
      && (signals.includes('internal_conflict') || signals.includes('decision_tension'))
      && !signals.includes('meaning_emerging')
      && !signals.includes('dysregulation')
      && !signals.includes('overprocessing'))
  ) mode = 'council';
  else if (signals.includes('shadow_recognition') && signals.includes('breakthrough')) mode = 'hold';
  else if (signals.includes('symbolic_language') && !signals.includes('breakthrough')) mode = 'clarify';
  else if (signals.includes('meaning_emerging')) mode = 'mirror';
  else if (selectedArchetypes.length > 0) mode = 'one_voice';

  if (
    stateAwareness
    && intent !== 'ASK_META'
    && intent !== 'TEST_SYSTEM'
    && !signals.includes('user_requests_structure')
    && !signals.includes('dysregulation')
  ) {
    if (stateNeedsPause && (stateImpulseKind === 'CONTROL' || stateImpulseKind === 'WITHDRAW')) {
      mode = options.overloadRisk ? 'grounding' : 'hold';
    } else if (stateNarrativeCharge === 'HIGH' && mode === 'mirror') {
      mode = 'hold';
    }
  }

  if (
    options.communicationMode === 'ACT'
    && intent !== 'ASK_META'
    && intent !== 'TEST_SYSTEM'
    && mode !== 'arrival'
    && mode !== 'structure'
    && mode !== 'council'
    && !signals.includes('dysregulation')
    && !signals.includes('overprocessing')
    && !stateNeedsPause
  ) {
    mode = 'integration';
  }

  const shouldUseCouncil = mode === 'council';
  const shouldGroundFirst = mode === 'grounding' || signals.includes('dysregulation') || Boolean(options.overloadRisk);
  const permissions = buildPermissions(mode, intent, shouldUseCouncil);
  const tone = mode === 'structure'
    ? 'structured'
    : mode === 'arrival' || mode === 'grounding' || mode === 'hold' || mode === 'exit_room'
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
  const promptInstructions = buildOrganicInstructions({ mode, intent, signals: unique(signals), tone, maxResponseLength, language, selectedArchetypes, permissions, stateAwareness });

  return {
    intent,
    mode,
    signals: unique(signals),
    selectedArchetypes: unique(selectedArchetypes).slice(0, shouldUseCouncil ? 4 : 1),
    shouldUseCouncil,
    shouldUpdateLore: (signals.includes('breakthrough') || signals.includes('meaning_emerging'))
      && stateBreakthroughCandidate !== false,
    shouldGroundFirst,
    permissions,
    tone,
    maxResponseLength,
    promptInstructions,
  };
};

const buildPermissions = (
  mode: ResponseMode,
  intent: UserIntent,
  shouldUseCouncil: boolean,
): ResponsePlan['permissions'] => {
  if (intent === 'ASK_META' || intent === 'TEST_SYSTEM') {
    return {
      allowQuestions: false,
      allowNextSteps: false,
      allowSuggestions: false,
      allowCouncil: false,
      maxVisibleVoices: 0,
      shouldExplainState: true,
    };
  }

  if (mode === 'arrival') {
    return {
      allowQuestions: false,
      allowNextSteps: false,
      allowSuggestions: false,
      allowCouncil: false,
      maxVisibleVoices: 0,
      shouldExplainState: false,
    };
  }

  if (mode === 'structure' || mode === 'integration') {
    return {
      allowQuestions: mode === 'structure',
      allowNextSteps: true,
      allowSuggestions: true,
      allowCouncil: false,
      maxVisibleVoices: 0,
      shouldExplainState: false,
    };
  }

  return {
    allowQuestions: mode !== 'grounding',
    allowNextSteps: mode === 'grounding',
    allowSuggestions: mode === 'grounding',
    allowCouncil: shouldUseCouncil,
    maxVisibleVoices: shouldUseCouncil ? 4 : mode === 'one_voice' ? 1 : 0,
    shouldExplainState: false,
  };
};

const buildOrganicInstructions = (plan: {
  mode: ResponseMode;
  intent: UserIntent;
  signals: ConversationSignal[];
  tone: ResponsePlan['tone'];
  maxResponseLength: ResponsePlan['maxResponseLength'];
  language: 'EN' | 'DE';
  selectedArchetypes: OrganicArchetypeId[];
  permissions: ResponsePlan['permissions'];
  stateAwareness?: StateAwarenessPlanInput;
}): string[] => {
  const isGerman = plan.language === 'DE';
  const base = isGerman
    ? [
        'Antworte organisch, nicht wie ein Panel oder Workshop.',
        'Der Nutzer bleibt fuehrend. Deute nicht mehr als noetig.',
        'Maximal eine praezise Frage am Ende. Keine Frageketten.',
        'Keine generische Bewunderung, kein Coaching-Ton, kein Therapie-Sound.',
        'Bevor du eine weise klingende Regel formulierst, pruefe innerlich: Ist sie immer wahr, oder nur eine nuetzliche Perspektive? Bevorzuge Beobachtungen statt Lebensgesetze.',
        'Vermeide Absolutheiten wie "die Antwort ist", "der Schluessel ist", "du musst", "immer", "nie". Formuliere nuancierter: "eine Moeglichkeit ist", "in dieser Situation wirkt es so", "oft, aber nicht immer".',
      ]
    : [
        'Respond organically, not like a panel or workshop.',
        'The user remains in the lead. Do not interpret more than needed.',
        'End with at most one precise question. No question chains.',
        'No generic admiration, coaching tone, or therapy voice.',
        'Before making a wise-sounding rule, check internally: is it always true, or only one useful perspective? Prefer observations over life laws.',
        'Avoid absolutes like "the answer is", "the key is", "you must", "always", "never". Use nuance: "one possibility is", "in this situation", "often, but not always".',
      ];

  const modeInstruction: Record<ResponseMode, string> = {
    arrival: isGerman
      ? 'ARRIVAL MODE: Markiere, dass etwas moeglicherweise bereits angekommen ist. Nicht vertiefen, nicht loesen, nicht symbolisch ausbauen, nicht in eine Quest oder Handlung uebersetzen. Keine vorwaerts treibende Coaching-Frage; wenn ueberhaupt, bestaetige dass es Zeit haben darf.'
      : 'ARRIVAL MODE: Mark that something may already have arrived. Do not deepen, solve, symbolize, convert into a quest, or translate into action. No forward-moving coaching question; if anything, affirm that it may need time.',
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

  const situationalInstructions: string[] = [];
  if (plan.intent === 'ASK_META' || plan.intent === 'TEST_SYSTEM') {
    situationalInstructions.push(isGerman
      ? 'META/TEST INTENT: Der Nutzer fragt ueber das Kommunikationssystem oder testet das Verhalten. Antworte nicht emotional spiegelnd. Erklaere knapp den erkannten Zustand, was sich bei Handlungswunsch aendern wuerde, und bestaetige ggf. den beobachteten Mismatch. Keine Rueckfrage nach Gefuehlen.'
      : 'META/TEST INTENT: The user is asking about the communication system or testing behavior. Do not emotionally mirror. Briefly explain the detected state, what would change if they want action, and acknowledge any observed mismatch. Do not ask a feelings question.');
  }
  if (plan.signals.includes('user_sharing_feedback')) {
    situationalInstructions.push(isGerman
      ? 'FEEDBACK SIGNAL: Der Nutzer gibt Resonanz/Feedback. Anerkennen und kurz spiegeln; nicht automatisch optimieren, keinen Prozess starten, keine naechsten Schritte anbieten, ausser der Nutzer fragt danach.'
      : 'FEEDBACK SIGNAL: The user is sharing resonance/feedback. Acknowledge and briefly reflect; do not automatically optimize, start a process, or offer next steps unless the user asks.');
  }
  if (plan.signals.includes('possible_false_absolute')) {
    situationalInstructions.push(isGerman
      ? 'FALSE-WISDOM CHECK: Behandle allgemeine Weisheitssaetze als Perspektiven, nicht als Wahrheiten. Wenn du einen Grundsatz formulierst, nenne mindestens eine Gegenbedingung oder Alternative.'
      : 'FALSE-WISDOM CHECK: Treat general wisdom statements as perspectives, not truths. If you state a principle, include at least one counter-condition or alternative.');
  }
  if (plan.signals.includes('state_awareness')) {
    const charge = plan.stateAwareness?.narrativeCharge || 'UNKNOWN';
    const impulse = plan.stateAwareness?.impulseKind || 'UNKNOWN';
    const orientation = plan.stateAwareness?.connectionResponsibility?.orientation || 'UNCLEAR';

    situationalInstructions.push(isGerman
      ? `STATE-AWARENESS BEFORE INSIGHT: Nutze intern state -> narrative -> impulse -> action. Narrative charge=${charge}, impulse=${impulse}, orientation=${orientation}. Sage nicht "das ist nur eine Story/Projektion". Frage eher, welcher Satz Macht hat, wohin die Geschichte Aufmerksamkeit zieht, welcher Impuls entsteht, und ob er Verbindung, Verantwortung, Kontrolle oder Rueckzug dient.`
      : `STATE AWARENESS BEFORE INSIGHT: Internally track state -> narrative -> impulse -> action. Narrative charge=${charge}, impulse=${impulse}, orientation=${orientation}. Do not say "this is just a story/projection." Instead ask which sentence has power, where the story pulls attention, what impulse arises, and whether it serves connection, responsibility, control, or withdrawal.`);
  }
  if (plan.signals.includes('state_narrative_charge')) {
    situationalInstructions.push(isGerman
      ? 'DO NOT BREAK THE SPELL: Wenn die Geschichte stark geladen ist, entzaubere sie nicht frontal. Arbeite ueber Aufmerksamkeit, Sprache, Koerpertempo, Verantwortung, Verbundenheit und eine kleine ehrliche Handlung.'
      : 'DO NOT BREAK THE SPELL: When a story is strongly charged, do not debunk it head-on. Work through attention, language, pacing, responsibility, connection, and one small honest action.');
  }
  if (plan.signals.includes('impulse_pressure')) {
    situationalInstructions.push(isGerman
      ? 'PHRONESIS + HORME: Behandle Handlungsdruck als Signal, nicht als Befehl. Pruefe, ob der Impuls jetzt weise ist und dem Gemeinsamen dient, bevor du Handlung empfiehlst.'
      : 'PHRONESIS + HORME: Treat action pressure as a signal, not a command. Check whether the impulse is wise now and serves the shared field before recommending action.');
  }
  if (plan.signals.includes('control_or_withdrawal_impulse')) {
    situationalInstructions.push(isGerman
      ? 'CONNECTION CHECK: Schuetze Eigeninitiative, ohne Vereinzelung zu verherrlichen; schuette Zugehoerigkeit nicht mit Kontrolle zusammen. Frage nach bewusster Verbindung, gemeinsamer Verantwortung oder unbewusster Verstrickung.'
      : 'CONNECTION CHECK: Protect agency without glorifying isolation; protect belonging without justifying control. Ask whether this is conscious connection, shared responsibility, or unconscious entanglement.');
  }

  return [
    ...base,
    modeInstruction[plan.mode],
    ...situationalInstructions,
    isGerman
      ? `Response plan: intent=${plan.intent}, mode=${plan.mode}, signals=${plan.signals.join(', ') || 'none'}, tone=${plan.tone}, length=${plan.maxResponseLength}, permissions=${JSON.stringify(plan.permissions)}.`
      : `Response plan: intent=${plan.intent}, mode=${plan.mode}, signals=${plan.signals.join(', ') || 'none'}, tone=${plan.tone}, length=${plan.maxResponseLength}, permissions=${JSON.stringify(plan.permissions)}.`,
  ];
};

export const buildOrganicPromptBlock = (plan: ResponsePlan): string => {
  return [
    'ORGANIC CONVERSATION ORCHESTRATOR:',
    ...plan.promptInstructions.map(instruction => `- ${instruction}`),
  ].join('\n');
};
