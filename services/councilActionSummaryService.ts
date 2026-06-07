import { getUserScopedKey } from './userService';

export interface CouncilActionSummary {
  schemaVersion: number;
  sessionId: string;
  createdAt: string;
  title: string;
  lines: string[];
}

const LAST_COUNCIL_ACTION_SUMMARY_KEY = 'last_council_action_summary';
const SUMMARY_SCHEMA_VERSION = 1;

const stripSpeakerHeaders = (text: string): string => {
  return text
    .replace(/\[\[SPEAKER:[^\]]+\]\]/gi, '')
    .replace(/SOVEREIGN DECISION:\s*/gi, '')
    .replace(/NEXT STEPS:\s*/gi, '')
    .trim();
};

export const extractCouncilActionLines = (rawText: string): string[] => {
  const nextStepsMatch = rawText.match(/NEXT STEPS:\s*([\s\S]*?)(?=\n\s*\[\[SPEAKER:|SOVEREIGN DECISION:|$)/i);
  if (!nextStepsMatch?.[1]) return [];
  const source = nextStepsMatch[1];

  const lines = source
    .split(/\r?\n/)
    .map(line => stripSpeakerHeaders(line).replace(/^[-*•]\s*/, '').trim())
    .filter(line => line.length > 0)
    .filter(line => !/^moderator:/i.test(line))
    .slice(0, 4);

  return lines.length > 0 ? lines : [];
};

export const saveLastCouncilActionSummary = (
  userId: string,
  rawText: string,
  language: 'EN' | 'DE',
): CouncilActionSummary | null => {
  const lines = extractCouncilActionLines(rawText);
  if (lines.length === 0) return null;

  const summary: CouncilActionSummary = {
    schemaVersion: SUMMARY_SCHEMA_VERSION,
    sessionId: `council-${Date.now()}`,
    createdAt: new Date().toISOString(),
    title: language === 'DE' ? 'Letzte Aktionslinien' : 'Last Action Lines',
    lines,
  };

  localStorage.setItem(getUserScopedKey(LAST_COUNCIL_ACTION_SUMMARY_KEY, userId), JSON.stringify(summary));
  return summary;
};

export const loadLastCouncilActionSummary = (userId: string): CouncilActionSummary | null => {
  const saved = localStorage.getItem(getUserScopedKey(LAST_COUNCIL_ACTION_SUMMARY_KEY, userId));
  if (!saved) return null;

  try {
    const parsed = JSON.parse(saved) as Partial<CouncilActionSummary>;
    if (!Array.isArray(parsed.lines) || parsed.lines.length === 0) return null;
    return {
      schemaVersion: SUMMARY_SCHEMA_VERSION,
      sessionId: parsed.sessionId || 'council-unknown',
      createdAt: parsed.createdAt || new Date(0).toISOString(),
      title: parsed.title || 'Last Action Lines',
      lines: parsed.lines.slice(0, 4),
    };
  } catch (error) {
    console.warn('Failed to parse last council action summary', error);
    return null;
  }
};
