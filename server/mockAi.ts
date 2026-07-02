import type { ResponsePlan } from './conversationOrchestrator.js';

const emptyMeaningResult = () => ({
  questLogEntries: [],
  soulTimelineEvents: [],
  breakthroughs: [],
  attributeUpdates: [],
  skillUpdates: [],
  nextQuestState: null,
});

export const createMockCouncilReply = (options: {
  mode: 'direct' | 'council';
  activeArchetype?: string;
  language?: string;
  topic?: string;
  responsePlan?: ResponsePlan;
}) => {
  const isGerman = options.language === 'DE';
  const topic = options.topic?.trim() || (isGerman ? 'dieses Thema' : 'this topic');
  const plan = options.responsePlan;

  if (plan && plan.expression !== 'multi_voice') {
    if (isGerman) {
      const expressionLabel = plan.expression === 'single_voice' ? 'Einzelstimme' : 'Kammer';
      if (plan.mode === 'grounding') {
        return `[Mock-Modus: ${plan.mode} / ${expressionLabel}] Bevor wir das deuten: lass es kleiner werden. Was braucht dein Koerper zuerst - Wasser, Essen, Schlaf, Bewegung oder einfach einen Moment Stille?`;
      }
      if (plan.mode === 'exit_room') {
        return `[Mock-Modus: ${plan.mode} / ${expressionLabel}] Bevor wir das als Wahrheit behandeln: das klingt gerade eher wie eine Anklage als wie Klarheit. Welche kleine andere Tuer waere moeglich?`;
      }
      if (plan.mode === 'structure') {
        return `[Mock-Modus: ${plan.mode} / ${expressionLabel}]\n1. Benenne den Kern.\n2. Waehle eine kleine Handlung.\n3. Teste sie heute.\n4. Schau morgen, was wirklich passiert ist.`;
      }
      if (plan.mode === 'hold') {
        return `[Mock-Modus: ${plan.mode} / ${expressionLabel}] Das klingt wie ein Schwellenmoment. Lass uns kurz dort bleiben: was macht es jetzt erkennbarer als vorher?`;
      }
      if (plan.mode === 'clarify') {
        return `[Mock-Modus: ${plan.mode} / ${expressionLabel}] Das Symbol wirkt wichtig. Was tut es emotional - macht es weiter, enger, trauriger, freier oder wahrer?`;
      }
      return `[Mock-Modus: ${plan.mode} / ${expressionLabel}] Das klingt nach einem wichtigen Unterschied. Ich wuerde es erstmal nicht erklaeren: Was wird daran emotional klarer?`;
    }

    const expressionLabel = plan.expression === 'single_voice' ? 'single voice' : 'chamber';
    if (plan.mode === 'grounding') {
      return `[Mock mode: ${plan.mode} / ${expressionLabel}] Before interpreting this, let it get smaller. What does your body need first - water, food, sleep, movement, or one quiet minute?`;
    }
    if (plan.mode === 'exit_room') {
      return `[Mock mode: ${plan.mode} / ${expressionLabel}] Before we treat that as truth: it sounds more like an accusation than clarity. What small other door might be available?`;
    }
    if (plan.mode === 'structure') {
      return `[Mock mode: ${plan.mode} / ${expressionLabel}]\n1. Name the core.\n2. Choose one small action.\n3. Test it today.\n4. Tomorrow, look at what actually happened.`;
    }
    if (plan.mode === 'hold') {
      return `[Mock mode: ${plan.mode} / ${expressionLabel}] That sounds like a threshold moment. Stay there for a second: what makes it more visible now than before?`;
    }
    if (plan.mode === 'clarify') {
      return `[Mock mode: ${plan.mode} / ${expressionLabel}] The symbol feels important. What does it do emotionally - widen, tighten, sadden, free, or clarify?`;
    }
    return `[Mock mode: ${plan.mode} / ${expressionLabel}] That sounds like an important distinction. I would not explain it too quickly: what becomes emotionally clearer?`;
  }

  if (options.mode === 'direct') {
    const name = options.activeArchetype || 'SAGE';
    return isGerman
      ? `[Mock-Modus: KI deaktiviert] Ich bin ${name}. Ich kann lokal ohne API-Kosten antworten, aber echte KI-Antworten sind bis zur Aktivierung des Providers gesperrt. Notiz zum Thema "${topic}": Halte die Frage fest, priorisiere den naechsten kleinen Schritt und verbinde spaeter den echten Anbieter serverseitig.`
      : `[Mock mode: AI disabled] I am ${name}. I can respond locally without API cost, but real AI responses stay locked until the provider is enabled. Note for "${topic}": capture the question, choose the next small step, and connect the real provider later on the server.`;
  }

  return isGerman
    ? `[[SPEAKER: SAGE]]\n[Mock-Modus: KI deaktiviert] Der Rat laeuft lokal ohne bezahlten Provider. Thema: "${topic}".\n\n[[SPEAKER: CAREGIVER]]\nWir muessen das nicht sofort abschliessen. Halte die Frage offen genug, damit sie atmen kann.\n\n[[SPEAKER: SOVEREIGN]]\nDies bleibt eine vorbereitende Runde. Was soll der Rat als Naechstes genauer betrachten?`
    : `[[SPEAKER: SAGE]]\n[Mock mode: AI disabled] The council is running locally without a paid provider. Topic: "${topic}".\n\n[[SPEAKER: CAREGIVER]]\nWe do not need to close this immediately. Keep the question open enough to breathe.\n\n[[SPEAKER: SOVEREIGN]]\nThis remains a preparatory round. What should the council examine next?`;
};

export const createMockMeaningResult = () => emptyMeaningResult();
