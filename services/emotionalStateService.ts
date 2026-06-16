import { EmotionalActivation, EmotionalClarity, EmotionalStateScan, EmotionalSupportNeed, EmotionalValence } from '../types';

const SCAN_SCHEMA_VERSION = 1;

const containsAny = (text: string, terms: string[]): boolean => {
  return terms.some(term => text.includes(term));
};

const countMatches = (text: string, terms: string[]): number => {
  return terms.reduce((count, term) => count + (text.includes(term) ? 1 : 0), 0);
};

const unique = <T,>(items: T[]): T[] => Array.from(new Set(items));

export const scanEmotionalState = (texts: string[]): EmotionalStateScan => {
  const combined = texts.join(' ').toLowerCase();
  const trimmedTexts = texts.map(text => text.trim()).filter(Boolean);
  const exclamationCount = (combined.match(/!/g) || []).length;
  const questionCount = (combined.match(/\?/g) || []).length;
  const averageLength = trimmedTexts.length
    ? trimmedTexts.reduce((sum, text) => sum + text.length, 0) / trimmedTexts.length
    : 0;

  const highActivationTerms = [
    'panik', 'panic', 'angst', 'anxiety', 'stress', 'ueberfordert', 'überfordert',
    'overload', 'overwhelmed', 'crazy', 'wtf', 'scheisse', 'shit', 'kaputt',
    'gar nichts', 'nichts mehr', 'bricht', 'laggt', 'blockt',
  ];
  const lowActivationTerms = ['muede', 'müde', 'leer', 'numb', 'egal', 'erschöpft', 'erschoepft', 'tired'];
  const positiveTerms = ['cool', 'nice', 'gut', 'stark', 'love', 'ja', 'passt', 'smooth', 'crazy'];
  const negativeTerms = ['leider', 'nicht', 'nope', 'kaputt', 'blockt', 'laggt', 'dunkel', 'schief', 'overload'];
  const clarityTerms = ['klar', 'sauber', 'plan', 'next', 'nächster', 'naechster', 'konkret'];
  const uncertaintyTerms = ['hmm', 'irgendwie', 'vielleicht', 'hoffe', 'frage', 'wie', 'scheint'];

  const activationHits = countMatches(combined, highActivationTerms);
  const lowActivationHits = countMatches(combined, lowActivationTerms);
  const positiveHits = countMatches(combined, positiveTerms);
  const negativeHits = countMatches(combined, negativeTerms);
  const clarityHits = countMatches(combined, clarityTerms);
  const uncertaintyHits = countMatches(combined, uncertaintyTerms);

  const activation: EmotionalActivation =
    activationHits >= 2 || exclamationCount >= 3 || averageLength > 420
      ? 'HIGH'
      : lowActivationHits >= 2
        ? 'LOW'
        : 'MEDIUM';

  const valence: EmotionalValence =
    positiveHits > 0 && negativeHits > 0
      ? 'MIXED'
      : negativeHits > positiveHits
        ? 'NEGATIVE'
        : positiveHits > negativeHits
          ? 'POSITIVE'
          : 'NEUTRAL';

  const overloadRisk =
    activation === 'HIGH' ||
    containsAny(combined, ['ueberfordert', 'überfordert', 'overload', 'overwhelmed', 'gar nichts', 'nichts mehr']);

  const clarity: EmotionalClarity =
    overloadRisk && uncertaintyHits > 0
      ? 'OVERLOADED'
      : uncertaintyHits > clarityHits
        ? 'UNCERTAIN'
        : 'CLEAR';

  const supportNeeds: EmotionalSupportNeed[] = [];
  if (overloadRisk) supportNeeds.push('GROUNDING', 'PRESENCE');
  if (clarity === 'UNCERTAIN') supportNeeds.push('MIRRORING', 'CLARITY');
  if (containsAny(combined, ['weiter', 'nächster', 'naechster', 'auf gehts', 'ziel', 'action', 'aktion'])) supportNeeds.push('ACTION');
  if (supportNeeds.length === 0) supportNeeds.push('MIRRORING');

  const primarySignals = unique([
    activation === 'HIGH' ? 'high activation' : activation === 'LOW' ? 'low activation' : 'steady activation',
    valence === 'MIXED' ? 'mixed excitement/friction' : valence.toLowerCase(),
    clarity === 'OVERLOADED' ? 'possible overload' : clarity === 'UNCERTAIN' ? 'needs sorting' : 'clear enough',
  ]);

  const rawConfidence = 0.35 + Math.min(0.4, (activationHits + positiveHits + negativeHits + uncertaintyHits) * 0.05);

  return {
    schemaVersion: SCAN_SCHEMA_VERSION,
    valence,
    activation,
    clarity,
    primarySignals,
    supportNeeds: unique(supportNeeds),
    overloadRisk,
    confidence: Number(rawConfidence.toFixed(2)),
    updatedAt: new Date().toISOString(),
  };
};
