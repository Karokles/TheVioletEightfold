import { CyclePacingMode, Language } from '../types';

export interface CyclePhase {
  id: number;
  startDay: number;
  endDay: number;
  title: Record<Language, string>;
  focus: Record<Language, string>;
  statement: Record<Language, string>;
}

export interface CycleMilestone {
  day: number;
  title: Record<Language, string>;
  description: Record<Language, string>;
}

export interface CycleQuestion {
  id: string;
  label: Record<Language, string>;
  placeholder: Record<Language, string>;
}

export interface CycleDayGuide {
  day: number;
  phase: CyclePhase;
  milestone?: CycleMilestone;
  title: string;
  focus: string;
  antiEgoPrompt: string;
  pacingNote: string;
}

export const CYCLE_LENGTH_DAYS = 63;

export const cyclePhases: CyclePhase[] = [
  {
    id: 1,
    startDay: 1,
    endDay: 21,
    title: { EN: 'Formation', DE: 'Formung' },
    focus: {
      EN: 'Notice the old pattern without becoming it.',
      DE: 'Das alte Muster erkennen, ohne es zu werden.',
    },
    statement: {
      EN: 'I can see the pattern clearly enough to work with it.',
      DE: 'Ich kann das Muster klar genug sehen, um damit zu arbeiten.',
    },
  },
  {
    id: 2,
    startDay: 22,
    endDay: 42,
    title: { EN: 'Stabilization', DE: 'Stabilisierung' },
    focus: {
      EN: 'Practice the new response in ordinary life.',
      DE: 'Die neue Antwort im gewöhnlichen Leben üben.',
    },
    statement: {
      EN: 'I can repeat the new pattern without forcing it.',
      DE: 'Ich kann das neue Muster wiederholen, ohne es zu erzwingen.',
    },
  },
  {
    id: 3,
    startDay: 43,
    endDay: 63,
    title: { EN: 'Embodiment', DE: 'Verkörperung' },
    focus: {
      EN: 'Let the practice become part of how you move.',
      DE: 'Die Praxis Teil deiner natürlichen Bewegung werden lassen.',
    },
    statement: {
      EN: 'This is becoming part of how I live.',
      DE: 'Das wird Teil davon, wie ich lebe.',
    },
  },
];

export const cycleMilestones: CycleMilestone[] = [
  {
    day: 1,
    title: { EN: 'Orientation', DE: 'Ausrichtung' },
    description: {
      EN: 'Name the pattern and begin without rushing depth.',
      DE: 'Benenne das Muster und beginne ohne Tiefen-Überdruck.',
    },
  },
  {
    day: 7,
    title: { EN: 'First Pattern Shift', DE: 'Erste Muster-Verschiebung' },
    description: {
      EN: 'Look for evidence of contact, not perfection.',
      DE: 'Suche nach Kontakt mit dem Muster, nicht nach Perfektion.',
    },
  },
  {
    day: 21,
    title: { EN: 'Formation Complete', DE: 'Formung abgeschlossen' },
    description: {
      EN: 'The first layer has enough shape to be practiced.',
      DE: 'Die erste Schicht hat genug Form, um geübt zu werden.',
    },
  },
  {
    day: 42,
    title: { EN: 'Integration Deepening', DE: 'Integration vertieft' },
    description: {
      EN: 'Practice has moved from idea toward behavior.',
      DE: 'Die Praxis bewegt sich von Idee in Verhalten.',
    },
  },
  {
    day: 63,
    title: { EN: 'Cycle Closed', DE: 'Zyklus geschlossen' },
    description: {
      EN: 'Summarize, archive, and choose the next honest step.',
      DE: 'Zusammenfassen, archivieren und den nächsten ehrlichen Schritt wählen.',
    },
  },
];

export const cycleOnboardingQuestions: CycleQuestion[] = [
  {
    id: 'pattern',
    label: {
      EN: 'What pattern, thought, or inner state will this cycle work with?',
      DE: 'Mit welchem Muster, Gedanken oder inneren Zustand arbeitet dieser Zyklus?',
    },
    placeholder: {
      EN: 'Example: defending myself before I am attacked',
      DE: 'Beispiel: mich verteidigen, bevor ich angegriffen werde',
    },
  },
  {
    id: 'where',
    label: {
      EN: 'Where does this pattern show up most clearly?',
      DE: 'Wo zeigt sich dieses Muster am deutlichsten?',
    },
    placeholder: {
      EN: 'Conversations, work, intimacy, money, body, creativity...',
      DE: 'Gespräche, Arbeit, Nähe, Geld, Körper, Kreativität...',
    },
  },
  {
    id: 'body',
    label: {
      EN: 'How does your body tell you the pattern is active?',
      DE: 'Woran zeigt dein Körper, dass das Muster aktiv ist?',
    },
    placeholder: {
      EN: 'Tension, heat, numbness, speed, shutdown...',
      DE: 'Spannung, Hitze, Taubheit, Tempo, Rückzug...',
    },
  },
  {
    id: 'protection',
    label: {
      EN: 'What has this pattern been trying to protect?',
      DE: 'Was versucht dieses Muster zu schützen?',
    },
    placeholder: {
      EN: 'Image, belonging, control, grief, shame, safety...',
      DE: 'Image, Zugehörigkeit, Kontrolle, Trauer, Scham, Sicherheit...',
    },
  },
  {
    id: 'softening',
    label: {
      EN: 'What would change if the pattern softened?',
      DE: 'Was würde sich verändern, wenn das Muster weicher wird?',
    },
    placeholder: {
      EN: 'More honesty, less performance, clearer action...',
      DE: 'Mehr Ehrlichkeit, weniger Performance, klareres Handeln...',
    },
  },
  {
    id: 'reach',
    label: {
      EN: 'What small daily action would prove a new pattern is forming?',
      DE: 'Welche kleine tägliche Handlung zeigt, dass ein neues Muster entsteht?',
    },
    placeholder: {
      EN: 'One message, one pause, one clean boundary...',
      DE: 'Eine Nachricht, eine Pause, eine klare Grenze...',
    },
  },
];

const dayTitles = {
  EN: [
    'See the signal',
    'Name the protective move',
    'Locate the body cue',
    'Reduce the speed',
    'Separate image from truth',
    'Choose one clean action',
    'Review without punishment',
  ],
  DE: [
    'Das Signal sehen',
    'Die Schutzbewegung benennen',
    'Das Körpersignal finden',
    'Das Tempo senken',
    'Image von Wahrheit trennen',
    'Eine klare Handlung wählen',
    'Ohne Strafe zurückblicken',
  ],
};

const antiEgoPrompts = {
  EN: [
    'Where am I trying to be impressive instead of honest?',
    'What am I defending that does not need defense today?',
    'Where did I confuse control with care?',
    'What truth becomes available if I stop performing strength?',
    'Where can I choose clean humility without self-erasure?',
  ],
  DE: [
    'Wo versuche ich beeindruckend statt ehrlich zu sein?',
    'Was verteidige ich heute, das keine Verteidigung braucht?',
    'Wo verwechsle ich Kontrolle mit Fürsorge?',
    'Welche Wahrheit wird sichtbar, wenn ich Stärke nicht performe?',
    'Wo kann ich klare Demut wählen, ohne mich selbst zu löschen?',
  ],
};

const pacingNotes: Record<CyclePacingMode, Record<Language, string>> = {
  STABILIZATION: {
    EN: 'Stabilization: keep it small. Depth is not the same as speed.',
    DE: 'Stabilisierung: halte es klein. Tiefe ist nicht dasselbe wie Tempo.',
  },
  EXPLORATION: {
    EN: 'Exploration: look closer, but keep one foot in ordinary life.',
    DE: 'Erkundung: schau näher hin, aber bleib mit einem Fuß im Alltag.',
  },
  INTEGRATION: {
    EN: 'Integration: repeat the new move until it becomes simple.',
    DE: 'Integration: wiederhole die neue Bewegung, bis sie schlicht wird.',
  },
};

export const getCyclePhase = (day: number): CyclePhase => {
  return cyclePhases.find(phase => day >= phase.startDay && day <= phase.endDay) || cyclePhases[0];
};

export const getRecommendedPacing = (day: number): CyclePacingMode => {
  if (day <= 7 || day === 21 || day === 42 || day === 63) return 'STABILIZATION';
  if (day <= 21) return 'EXPLORATION';
  return 'INTEGRATION';
};

export const getCycleDayGuide = (day: number, language: Language): CycleDayGuide => {
  const normalizedDay = Math.min(Math.max(day, 1), CYCLE_LENGTH_DAYS);
  const titleIndex = (normalizedDay - 1) % dayTitles[language].length;
  const promptIndex = (normalizedDay - 1) % antiEgoPrompts[language].length;
  const pacing = getRecommendedPacing(normalizedDay);

  return {
    day: normalizedDay,
    phase: getCyclePhase(normalizedDay),
    milestone: cycleMilestones.find(milestone => milestone.day === normalizedDay),
    title: dayTitles[language][titleIndex],
    focus: getCyclePhase(normalizedDay).focus[language],
    antiEgoPrompt: antiEgoPrompts[language][promptIndex],
    pacingNote: pacingNotes[pacing][language],
  };
};
