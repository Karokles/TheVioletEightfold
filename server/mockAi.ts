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
}) => {
  const isGerman = options.language === 'DE';
  const topic = options.topic?.trim() || (isGerman ? 'dieses Thema' : 'this topic');

  if (options.mode === 'direct') {
    const name = options.activeArchetype || 'SAGE';
    return isGerman
      ? `[Mock-Modus: KI deaktiviert] Ich bin ${name}. Ich kann lokal ohne API-Kosten antworten, aber echte KI-Antworten sind bis zur Aktivierung des Providers gesperrt. Notiz zum Thema "${topic}": Halte die Frage fest, priorisiere den naechsten kleinen Schritt und verbinde spaeter den echten Anbieter serverseitig.`
      : `[Mock mode: AI disabled] I am ${name}. I can respond locally without API cost, but real AI responses stay locked until the provider is enabled. Note for "${topic}": capture the question, choose the next small step, and connect the real provider later on the server.`;
  }

  return isGerman
    ? `[[SPEAKER: SAGE]]\n[Mock-Modus: KI deaktiviert] Der Rat laeuft lokal ohne bezahlten Provider. Thema: "${topic}".\n\n[[SPEAKER: SOVEREIGN]]\nWir behandeln dies als vorbereitende Sitzung. Sammle Kontext, entscheide den naechsten Schritt, und aktiviere echte KI erst mit Budget und Credentials.\n\nSOVEREIGN DECISION:\nDer no-budget Modus ist aktiv. Keine bezahlten API-Aufrufe wurden ausgefuehrt.\n\nNEXT STEPS:\n- Kontext lokal pruefen\n- Naechste Handlung notieren\n- Provider spaeter serverseitig aktivieren`
    : `[[SPEAKER: SAGE]]\n[Mock mode: AI disabled] The council is running locally without a paid provider. Topic: "${topic}".\n\n[[SPEAKER: SOVEREIGN]]\nWe treat this as a preparation session. Gather context, choose the next step, and enable real AI only when budget and credentials exist.\n\nSOVEREIGN DECISION:\nNo-budget mode is active. No paid API call was made.\n\nNEXT STEPS:\n- Review context locally\n- Record the next action\n- Enable the provider later on the server`;
};

export const createMockMeaningResult = () => emptyMeaningResult();
