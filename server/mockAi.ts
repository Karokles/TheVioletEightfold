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
    ? `[[SPEAKER: SAGE]]\n[Mock-Modus: KI deaktiviert] Der Rat laeuft lokal ohne bezahlten Provider. Thema: "${topic}".\n\n[[SPEAKER: CAREGIVER]]\nWir muessen das nicht sofort abschliessen. Halte die Frage offen genug, damit sie atmen kann.\n\n[[SPEAKER: SOVEREIGN]]\nDies bleibt eine vorbereitende Runde. Was soll der Rat als Naechstes genauer betrachten?`
    : `[[SPEAKER: SAGE]]\n[Mock mode: AI disabled] The council is running locally without a paid provider. Topic: "${topic}".\n\n[[SPEAKER: CAREGIVER]]\nWe do not need to close this immediately. Keep the question open enough to breathe.\n\n[[SPEAKER: SOVEREIGN]]\nThis remains a preparatory round. What should the council examine next?`;
};

export const createMockMeaningResult = () => emptyMeaningResult();
