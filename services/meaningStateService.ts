import { MeaningAnalysisResult } from '../types';
import { getUserScopedKey } from './userService';

const MEANING_STATE_KEY = 'meaning_state';

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

export const loadLocalMeaningState = (userId: string): MeaningAnalysisResult => {
  const saved = localStorage.getItem(getUserScopedKey(MEANING_STATE_KEY, userId));
  if (!saved) return emptyMeaningState();

  try {
    const parsed = JSON.parse(saved) as Partial<MeaningAnalysisResult>;
    return {
      questLogEntries: Array.isArray(parsed.questLogEntries) ? parsed.questLogEntries : [],
      soulTimelineEvents: Array.isArray(parsed.soulTimelineEvents) ? parsed.soulTimelineEvents : [],
      breakthroughs: Array.isArray(parsed.breakthroughs) ? parsed.breakthroughs : [],
      emotionalState: parsed.emotionalState,
      attributeUpdates: Array.isArray(parsed.attributeUpdates) ? parsed.attributeUpdates : undefined,
      skillUpdates: Array.isArray(parsed.skillUpdates) ? parsed.skillUpdates : undefined,
      nextQuestState: parsed.nextQuestState,
    };
  } catch (error) {
    console.warn('Failed to parse local meaning state', error);
    return emptyMeaningState();
  }
};

export const saveLocalMeaningState = (
  userId: string,
  state: MeaningAnalysisResult,
): MeaningAnalysisResult => {
  const normalized: MeaningAnalysisResult = {
    questLogEntries: Array.isArray(state.questLogEntries) ? state.questLogEntries : [],
    soulTimelineEvents: Array.isArray(state.soulTimelineEvents) ? state.soulTimelineEvents : [],
    breakthroughs: Array.isArray(state.breakthroughs) ? state.breakthroughs : [],
    emotionalState: state.emotionalState,
    attributeUpdates: Array.isArray(state.attributeUpdates) ? state.attributeUpdates : undefined,
    skillUpdates: Array.isArray(state.skillUpdates) ? state.skillUpdates : undefined,
    nextQuestState: state.nextQuestState,
  };

  localStorage.setItem(getUserScopedKey(MEANING_STATE_KEY, userId), JSON.stringify(normalized));
  return normalized;
};

export const mergeLocalMeaningState = (
  userId: string,
  patch: Partial<MeaningAnalysisResult>,
): MeaningAnalysisResult => {
  const existing = loadLocalMeaningState(userId);
  const merged: MeaningAnalysisResult = {
    ...existing,
    questLogEntries: dedupeById([...(patch.questLogEntries || []), ...existing.questLogEntries]),
    soulTimelineEvents: dedupeById([...(patch.soulTimelineEvents || []), ...existing.soulTimelineEvents]),
    breakthroughs: dedupeById([...(patch.breakthroughs || []), ...existing.breakthroughs]),
    emotionalState: patch.emotionalState || existing.emotionalState,
    attributeUpdates: patch.attributeUpdates || existing.attributeUpdates,
    skillUpdates: patch.skillUpdates || existing.skillUpdates,
    nextQuestState: patch.nextQuestState || existing.nextQuestState,
  };

  localStorage.setItem(getUserScopedKey(MEANING_STATE_KEY, userId), JSON.stringify(merged));
  return merged;
};
