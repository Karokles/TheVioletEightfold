import { Attribute, CycleDayRecord, IntegrationCycle, Language, MeaningAnalysisResult, Milestone, UserStats } from '../types';
import { cycleMilestones, getCycleDayGuide } from '../config/integrationCycle';

const BLUEPRINT_MILESTONE_DAYS = new Set([7, 21, 42, 63]);

const compact = (parts: Array<string | undefined>): string => {
  return parts.map(part => part?.trim()).filter(Boolean).join(' ');
};

export const isBlueprintCycleMilestone = (day: number): boolean => {
  return BLUEPRINT_MILESTONE_DAYS.has(day);
};

export const buildCycleMilestoneMeaning = (
  cycle: IntegrationCycle,
  record: CycleDayRecord,
  language: Language,
): Partial<MeaningAnalysisResult> | null => {
  if (!isBlueprintCycleMilestone(record.day)) return null;

  const guide = getCycleDayGuide(record.day, language);
  const milestone = guide.milestone || cycleMilestones.find(item => item.day === record.day);
  if (!milestone) return null;

  const createdAt = record.completedAt || new Date().toISOString();
  const title = language === 'DE'
    ? `Tag ${record.day}: ${milestone.title.DE}`
    : `Day ${record.day}: ${milestone.title.EN}`;
  const fallback = milestone.description[language];
  const summary = compact([
    language === 'DE'
      ? `Zyklus: ${cycle.theme}.`
      : `Cycle: ${cycle.theme}.`,
    record.sense ? `${language === 'DE' ? 'Signal' : 'Signal'}: ${record.sense}` : undefined,
    record.reframe ? `${language === 'DE' ? 'Neue Deutung' : 'Reframe'}: ${record.reframe}` : undefined,
    record.embody ? `${language === 'DE' ? 'Handlung' : 'Active reach'}: ${record.embody}` : undefined,
    record.antiEgoCheck ? `${language === 'DE' ? 'Anti-Ego' : 'Anti-ego'}: ${record.antiEgoCheck}` : undefined,
  ]) || fallback;

  const baseId = `${cycle.id}-cycle-day-${record.day}`;
  const patch: Partial<MeaningAnalysisResult> = {
    questLogEntries: [
      {
        id: `${baseId}-quest`,
        createdAt,
        title,
        content: summary,
        tags: ['cycle', `day-${record.day}`, guide.phase.title.EN.toLowerCase()],
        sourceSessionId: cycle.id,
      },
    ],
    soulTimelineEvents: [
      {
        id: `${baseId}-timeline`,
        createdAt,
        label: title,
        summary: fallback,
        intensity: record.day >= 42 ? 7 : 5,
        type: record.day === 63 ? 'CYCLE_CLOSURE' : 'CYCLE_MILESTONE',
        tags: ['cycle', `day-${record.day}`],
        sourceSessionId: cycle.id,
      },
    ],
  };

  if (record.day === 21 || record.day === 42 || record.day === 63) {
    patch.breakthroughs = [
      {
        id: `${baseId}-breakthrough`,
        createdAt,
        title,
        insight: fallback,
        trigger: cycle.theme,
        action: record.embody || undefined,
        tags: ['cycle', `day-${record.day}`],
        sourceSessionId: cycle.id,
      },
    ];
  }

  return patch;
};

const buildStatsMilestone = (cycle: IntegrationCycle, record: CycleDayRecord, language: Language): Milestone | null => {
  if (!isBlueprintCycleMilestone(record.day)) return null;
  const guide = getCycleDayGuide(record.day, language);
  if (!guide.milestone) return null;

  return {
    id: `${cycle.id}-stats-milestone-day-${record.day}`,
    title: language === 'DE'
      ? `Zyklus Tag ${record.day}: ${guide.milestone.title.DE}`
      : `Cycle Day ${record.day}: ${guide.milestone.title.EN}`,
    date: record.date,
    description: guide.milestone.description[language],
    type: record.day === 63 ? 'BENCHMARK' : 'REALIZATION',
    icon: record.day === 63 ? 'Trophy' : 'Sparkles',
  };
};

const buildStatsAttribute = (cycle: IntegrationCycle, record: CycleDayRecord): Attribute | null => {
  const baseDescription = `Observed through cycle "${cycle.theme}" on day ${record.day}.`;

  if (record.day === 21) {
    return {
      name: 'Practicing: Pattern Recognition',
      level: 'Emerging',
      description: baseDescription,
      type: 'SKILL',
    };
  }

  if (record.day === 42) {
    return {
      name: 'Practicing: Integration Rhythm',
      level: 'Developing',
      description: baseDescription,
      type: 'SKILL',
    };
  }

  if (record.day === 63) {
    return {
      name: 'Observed: Cycle Completion',
      level: 'Integrated',
      description: baseDescription,
      type: 'BUFF',
    };
  }

  return null;
};

export const applyCycleMilestoneToStats = (
  stats: UserStats,
  cycle: IntegrationCycle,
  record: CycleDayRecord,
  language: Language,
): UserStats => {
  if (!isBlueprintCycleMilestone(record.day)) return stats;

  const milestone = buildStatsMilestone(cycle, record, language);
  const attribute = buildStatsAttribute(cycle, record);

  return {
    ...stats,
    currentQuest: stats.currentQuest || `Cycle: ${cycle.theme}`,
    milestones: milestone && !stats.milestones.some(item => item.id === milestone.id)
      ? [milestone, ...stats.milestones]
      : stats.milestones,
    attributes: attribute && !stats.attributes.some(item => item.name === attribute.name)
      ? [attribute, ...stats.attributes]
      : stats.attributes,
  };
};
