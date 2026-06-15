import { MeaningAnalysisResult } from '../types';
import { getUserScopedKey } from './userService';

const MEANING_STATE_KEY = 'meaning_state';
const LION_SOUL_TIMELINE_SEED_KEY = 'lion_soul_timeline_seed_v1';

const emptyMeaningState = (): MeaningAnalysisResult => ({
  questLogEntries: [],
  soulTimelineEvents: [],
  breakthroughs: [],
});

const dedupeById = <T extends { id: string }>(items: T[]): T[] => {
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.id)) return false;
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

export const normalizeMeaningState = (state: Partial<MeaningAnalysisResult>): MeaningAnalysisResult => ({
  questLogEntries: byNewestCreatedAt(Array.isArray(state.questLogEntries) ? state.questLogEntries : []),
  soulTimelineEvents: byNewestCreatedAt(Array.isArray(state.soulTimelineEvents) ? state.soulTimelineEvents : []),
  breakthroughs: byNewestCreatedAt(Array.isArray(state.breakthroughs) ? state.breakthroughs : []),
  emotionalState: state.emotionalState,
  attributeUpdates: Array.isArray(state.attributeUpdates) ? state.attributeUpdates : undefined,
  skillUpdates: Array.isArray(state.skillUpdates) ? state.skillUpdates : undefined,
  nextQuestState: state.nextQuestState,
});

const lionSoulTimelineSeed: MeaningAnalysisResult = {
  questLogEntries: [],
  soulTimelineEvents: [
    {
      id: 'lion-soul-2026-06-arrival',
      createdAt: '2026-06-09T12:00:00.000Z',
      label: 'Arrival',
      summary: 'Eine neue Unterscheidung entsteht: Nicht jede Einsicht braucht einen naechsten Schritt. Nicht jede Erkenntnis braucht eine Quest. Manche Dinge duerfen einfach landen.',
      type: 'BREAKTHROUGH',
      tags: ['ARRIVAL', 'INTEGRATION', 'PRESENCE'],
      sourceSessionId: 'lion-soul-timeline-seed-v1',
    },
    {
      id: 'lion-soul-2026-06-mut-statt-gewissheit',
      createdAt: '2026-06-08T12:00:00.000Z',
      label: 'Mut statt Gewissheit',
      summary: 'Handeln benoetigt keine vollstaendige Sicherheit. Die zentrale Frage wird: "Wer moechte ich jetzt sein?" statt "Was wird passieren?"',
      type: 'BREAKTHROUGH',
      tags: ['COURAGE', 'ACTION', 'IDENTITY'],
      sourceSessionId: 'lion-soul-timeline-seed-v1',
    },
    {
      id: 'lion-soul-2026-06-vertrauen-ohne-garantie',
      createdAt: '2026-06-07T12:00:00.000Z',
      label: 'Vertrauen ohne Garantie',
      summary: 'Liebe bedeutet nicht Kontrolle ueber das Ergebnis. Im Kontext von Tuana entsteht die Haltung: "Ich vertraue auf die Liebe, ohne von ihr Gewissheit zu verlangen."',
      type: 'BREAKTHROUGH',
      tags: ['LOVE', 'TRUST', 'RELATIONSHIP'],
      sourceSessionId: 'lion-soul-timeline-seed-v1',
    },
    {
      id: 'lion-soul-2026-05-kritik-am-spieler',
      createdAt: '2026-05-15T12:00:00.000Z',
      label: 'Die Kritik am Spieler',
      summary: 'Durch Dostojewski entsteht die Einsicht: Nicht nur Gluecksspiel kann suechtig machen. Auch Erkenntnis, Wachstum, Bedeutung und Transformation koennen zum naechsten Dreh am Roulette werden.',
      type: 'BREAKTHROUGH',
      tags: ['DOSTOEVSKY', 'MEANING', 'THE_GAMBLER'],
      sourceSessionId: 'lion-soul-timeline-seed-v1',
    },
    {
      id: 'lion-soul-2026-03-unsicherheit-tragen',
      createdAt: '2026-03-15T12:00:00.000Z',
      label: 'Unsicherheit tragen',
      summary: 'Die Frage verschiebt sich von "Was ist die richtige Entscheidung?" zu "Wer moechte ich in Unsicherheit sein?"',
      type: 'BREAKTHROUGH',
      tags: ['COURAGE', 'UNCERTAINTY', 'CHARACTER'],
      sourceSessionId: 'lion-soul-timeline-seed-v1',
    },
    {
      id: 'lion-soul-2025-11-rat-als-spiegel',
      createdAt: '2025-11-15T12:00:00.000Z',
      label: 'Der Rat als Spiegel',
      summary: 'Archetypen sollen keine Autoritaeten sein. Sie werden zunehmend als Perspektiven verstanden.',
      type: 'BREAKTHROUGH',
      tags: ['COUNCIL', 'ARCHETYPES', 'SELF_LEADERSHIP'],
      sourceSessionId: 'lion-soul-timeline-seed-v1',
    },
    {
      id: 'lion-soul-2025-08-lebensweben',
      createdAt: '2025-08-15T12:00:00.000Z',
      label: 'Vom Problemloesen zum Lebensweben',
      summary: 'Der Nutzer beginnt zu hinterfragen, ob das Leben ueberhaupt geloest werden muss. Die Metapher verschiebt sich von "Probleme beseitigen" zu "Einen Teppich durch die Zeit weben."',
      type: 'BREAKTHROUGH',
      tags: ['LIFE_DESIGN', 'ACCEPTANCE', 'PROCESS'],
      sourceSessionId: 'lion-soul-timeline-seed-v1',
    },
    {
      id: 'lion-soul-2025-05-lazarus-form',
      createdAt: '2025-05-15T12:00:00.000Z',
      label: 'Lazarus Engine Takes Form',
      summary: 'KI, Philosophie, Archetypen, Reflexion, Technologie und Geschichten verbinden sich zu einem gemeinsamen Projekt.',
      type: 'BREAKTHROUGH',
      tags: ['CREATION', 'INTEGRATION', 'PRODUCT_VISION'],
      sourceSessionId: 'lion-soul-timeline-seed-v1',
    },
    {
      id: 'lion-soul-2025-02-lanzarote-reflection',
      createdAt: '2025-02-25T12:00:00.000Z',
      label: 'Lanzarote Reflection',
      summary: 'Menschen koennen Spiegel sein, ohne Feinde oder Erloeser werden zu muessen.',
      type: 'BREAKTHROUGH',
      tags: ['RELATIONSHIP', 'REFLECTION', 'PROJECTION'],
      sourceSessionId: 'lion-soul-timeline-seed-v1',
    },
    {
      id: 'lion-soul-2025-02-fuerteventura-reduction',
      createdAt: '2025-02-20T12:00:00.000Z',
      label: 'Fuerteventura Reduction',
      summary: 'Bewusste Vereinfachung: Nicht jede Situation benoetigt Erklaerung. Nicht jede Spannung benoetigt Analyse. Stille wird als Werkzeug erkannt.',
      type: 'BREAKTHROUGH',
      tags: ['SIMPLICITY', 'SILENCE', 'REDUCTION'],
      sourceSessionId: 'lion-soul-timeline-seed-v1',
    },
    {
      id: 'lion-soul-2025-02-21-63-realization',
      createdAt: '2025-02-15T12:00:00.000Z',
      label: 'The 21/63 Realization',
      summary: 'Biologische Grenzen von Veraenderung werden akzeptiert. Abkuerzungen sind oft taktische Fehler. Stabilitaet entsteht durch Wiederholung, nicht durch Einsicht allein.',
      type: 'BREAKTHROUGH',
      tags: ['GROUNDING', 'NEUROPLASTICITY', 'DISCIPLINE'],
      sourceSessionId: 'lion-soul-timeline-seed-v1',
    },
    {
      id: 'lion-soul-2025-02-tuana-noah-nigredo',
      createdAt: '2025-02-10T12:00:00.000Z',
      label: 'The Tuana-Noah Nigredo',
      summary: 'Das alte Selbst wird in Dynamiken anderer Menschen erkannt. Der Fokus verschiebt sich von "Wer hat Recht?" zu "Welche Verantwortung trage ich selbst?"',
      type: 'BREAKTHROUGH',
      tags: ['SHADOW', 'RELATIONSHIPS', 'LEADERSHIP'],
      sourceSessionId: 'lion-soul-timeline-seed-v1',
    },
    {
      id: 'lion-soul-2024-12-rueckkehr-geschichten',
      createdAt: '2024-12-15T12:00:00.000Z',
      label: 'Die Rueckkehr der Geschichten',
      summary: 'Philosophie, Mythologie, Literatur und Narrative werden nicht laenger als Unterhaltung betrachtet, sondern als Werkzeuge zur Selbst- und Welterkenntnis.',
      type: 'BREAKTHROUGH',
      tags: ['MYTH', 'STORY', 'MEANING_MAKING'],
      sourceSessionId: 'lion-soul-timeline-seed-v1',
    },
    {
      id: 'lion-soul-2024-09-grenzen-optimierung',
      createdAt: '2024-09-15T12:00:00.000Z',
      label: 'Die Grenzen der Optimierung',
      summary: 'Produktivitaet und Optimierung allein erzeugen keine Orientierung. Erste Zweifel entstehen an rein leistungsorientierten Modellen von Erfolg.',
      type: 'BREAKTHROUGH',
      tags: ['MEANING', 'ORIENTATION', 'ANTI_OPTIMIZATION'],
      sourceSessionId: 'lion-soul-timeline-seed-v1',
    },
    {
      id: 'lion-soul-2024-06-systeme-hinter-systemen',
      createdAt: '2024-06-15T12:00:00.000Z',
      label: 'Das System hinter den Systemen',
      summary: 'Der Blick verschiebt sich von einzelnen Tools, Jobs und Prozessen hin zu Systemen, Netzwerken, Narrativen und Bewusstseinsstrukturen.',
      type: 'BREAKTHROUGH',
      tags: ['SYSTEMS_THINKING', 'PATTERN_RECOGNITION'],
      sourceSessionId: 'lion-soul-timeline-seed-v1',
    },
  ],
  breakthroughs: [],
};

lionSoulTimelineSeed.breakthroughs = lionSoulTimelineSeed.soulTimelineEvents.map(event => ({
  id: event.id,
  createdAt: event.createdAt,
  title: event.label,
  insight: event.summary,
  tags: event.tags,
  sourceSessionId: event.sourceSessionId,
}));

export const loadLocalMeaningState = (userId: string): MeaningAnalysisResult => {
  ensureLionSoulTimelineSeed(userId);
  const saved = localStorage.getItem(getUserScopedKey(MEANING_STATE_KEY, userId));
  if (!saved) return emptyMeaningState();

  try {
    const parsed = JSON.parse(saved) as Partial<MeaningAnalysisResult>;
    return normalizeMeaningState(parsed);
  } catch (error) {
    console.warn('Failed to parse local meaning state', error);
    return emptyMeaningState();
  }
};

export const saveLocalMeaningState = (
  userId: string,
  state: MeaningAnalysisResult,
): MeaningAnalysisResult => {
  const normalized = normalizeMeaningState(state);

  localStorage.setItem(getUserScopedKey(MEANING_STATE_KEY, userId), JSON.stringify(normalized));
  return normalized;
};

export const mergeLocalMeaningState = (
  userId: string,
  patch: Partial<MeaningAnalysisResult>,
): MeaningAnalysisResult => {
  const existing = loadLocalMeaningState(userId);
  const merged = normalizeMeaningState({
    ...existing,
    questLogEntries: dedupeById([...(patch.questLogEntries || []), ...existing.questLogEntries]),
    soulTimelineEvents: dedupeById([...(patch.soulTimelineEvents || []), ...existing.soulTimelineEvents]),
    breakthroughs: dedupeById([...(patch.breakthroughs || []), ...existing.breakthroughs]),
    emotionalState: patch.emotionalState || existing.emotionalState,
    attributeUpdates: patch.attributeUpdates || existing.attributeUpdates,
    skillUpdates: patch.skillUpdates || existing.skillUpdates,
    nextQuestState: patch.nextQuestState || existing.nextQuestState,
  });

  localStorage.setItem(getUserScopedKey(MEANING_STATE_KEY, userId), JSON.stringify(merged));
  return merged;
};

const ensureLionSoulTimelineSeed = (userId: string): void => {
  if (userId !== 'lion') return;

  const seedKey = getUserScopedKey(LION_SOUL_TIMELINE_SEED_KEY, userId);
  if (localStorage.getItem(seedKey) === 'applied') return;

  const stateKey = getUserScopedKey(MEANING_STATE_KEY, userId);
  let existing = emptyMeaningState();
  const saved = localStorage.getItem(stateKey);

  if (saved) {
    try {
      existing = normalizeMeaningState(JSON.parse(saved) as Partial<MeaningAnalysisResult>);
    } catch (error) {
      console.warn('Failed to parse existing meaning state before Lion seed migration', error);
    }
  }

  const merged = normalizeMeaningState({
    ...existing,
    questLogEntries: dedupeById([...existing.questLogEntries, ...lionSoulTimelineSeed.questLogEntries]),
    soulTimelineEvents: dedupeById([...existing.soulTimelineEvents, ...lionSoulTimelineSeed.soulTimelineEvents]),
    breakthroughs: dedupeById([...existing.breakthroughs, ...lionSoulTimelineSeed.breakthroughs]),
  });

  localStorage.setItem(stateKey, JSON.stringify(merged));
  localStorage.setItem(seedKey, 'applied');
};
