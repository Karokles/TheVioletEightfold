
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CommunicationMode, IntegrationCycle, Language, MeaningContext, QuestLogEntry, SoulTimelineEvent, Breakthrough, UserStats } from '../types';
import { ICON_MAP } from '../constants';
import { Shield, Zap, Brain, Activity, Target, Lock, Database, Trophy, Star, BookOpen, Sparkles, Calendar, Hourglass, ChevronDown } from 'lucide-react';
import { getMeaningState } from '../services/aiService';
import { getSupabaseSession } from '../services/supabaseAuth';
import { getCurrentUser, setCurrentUserDisplayName } from '../services/userService';
import { CYCLE_LENGTH_DAYS, cycleMilestones } from '../config/integrationCycle';
import { getCompletedCycleParticipationDays, getCycleCalendarDayNumber, getCycleDayNumber, getCycleRecordCompletedToday } from '../services/cycleService';
import { buildCommunicationStanceExplanation, suggestCommunicationMode } from '../services/communicationService';

interface StatsInterfaceProps {
    language: Language;
    stats: UserStats;
    cycle?: IntegrationCycle | null;
    meaningContext?: MeaningContext;
    currentLore?: string;
    onUpdateCycleStarter?: (answers: IntegrationCycle['onboardingAnswers']) => void;
    onRefresh?: () => void; // Optional refresh trigger
}

const communicationModeLabels: Record<CommunicationMode, { EN: string; DE: string }> = {
  HOLD: { EN: 'Hold', DE: 'Halten' },
  MIRROR: { EN: 'Mirror', DE: 'Spiegeln' },
  EXPLORE: { EN: 'Explore', DE: 'Erkunden' },
  GROUND: { EN: 'Ground', DE: 'Erden' },
  ACT: { EN: 'Act', DE: 'Handeln' },
};

const uiLabels = {
  EN: {
    state: 'State',
    quest: 'Quest',
    className: 'Architect Class',
    activeAttributes: 'Active Attributes',
    skillInventory: 'Skill Inventory',
    soulTimeline: 'Soul Timeline',
    breakthroughs: 'Breakthroughs',
    noBreakthroughs: 'No breakthroughs',
    noEntries: 'No entries',
    beyond: 'The Beyond...',
    starterBlueprint: 'Initial Starter Inputs',
    starterEmpty: 'No starter inputs saved',
    starterOpen: 'Open',
    starterClose: 'Close',
    starterSaving: 'Saving',
    starterSaved: 'Saved',
  },
  DE: {
    state: 'Zustand',
    quest: 'Quest',
    className: 'Architekt-Klasse',
    activeAttributes: 'Aktive Attribute',
    skillInventory: 'Skill-Inventar',
    soulTimeline: 'Seelen-Zeitlinie',
    breakthroughs: 'Durchbrüche',
    noBreakthroughs: 'Keine Durchbrüche',
    noEntries: 'Keine Einträge',
    beyond: 'Das Danach...',
    starterBlueprint: 'Initiale Starter-Eingaben',
    starterEmpty: 'Keine Starter-Eingaben gespeichert',
    starterOpen: 'Oeffnen',
    starterClose: 'Schliessen',
    starterSaving: 'Speichert',
    starterSaved: 'Gespeichert',
  },
};

export const StatsInterface: React.FC<StatsInterfaceProps> = ({ language, stats, cycle, meaningContext, currentLore = '', onUpdateCycleStarter, onRefresh }) => {
  const breakthroughLabel = language === 'DE' ? 'DURCHBRUCH' : 'BREAKTHROUGH';
  const t = uiLabels[language];
  const activeCycleDay = cycle ? getCycleCalendarDayNumber(cycle) : undefined;
  const nextSealDay = cycle ? getCycleDayNumber(cycle) : undefined;
  const completedCycleDays = cycle ? getCompletedCycleParticipationDays(cycle) : 0;
  const completedToday = cycle ? getCycleRecordCompletedToday(cycle) : undefined;
  const nextMilestone = cycle && activeCycleDay
    ? cycleMilestones.find(milestone => milestone.day >= activeCycleDay)
    : undefined;
  const progressPercent = cycle ? Math.min(100, Math.round((completedCycleDays / CYCLE_LENGTH_DAYS) * 100)) : 0;
  const sealedLevel = cycle ? completedCycleDays : Number(stats.level.match(/\d+/)?.[0] || 0);
  const currentCommunicationMode = meaningContext?.communicationMode || 'MIRROR';
  const recommendedCommunicationMode = suggestCommunicationMode(cycle || null, 'STATS');
  const communicationExplanation = buildCommunicationStanceExplanation(
    recommendedCommunicationMode,
    currentCommunicationMode,
    language,
  );
  const currentUser = getCurrentUser();
  const isUuid = (value?: string) => Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
  const initialDisplayName = currentUser?.displayName && !isUuid(currentUser.displayName)
    ? currentUser.displayName
    : '';
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [questLogEntries, setQuestLogEntries] = useState<QuestLogEntry[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<SoulTimelineEvent[]>([]);
  const [breakthroughs, setBreakthroughs] = useState<Breakthrough[]>([]);
  const [isLoadingMeaning, setIsLoadingMeaning] = useState(true);
  const [starterOpen, setStarterOpen] = useState(false);
  const [starterDraftAnswers, setStarterDraftAnswers] = useState<Record<string, string>>({});
  const [starterSaveState, setStarterSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const lastStarterSignatureRef = useRef('');

  const normalizeMeaningText = (value: string): string => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9äöüß]+/gi, ' ')
      .replace(/\b(the|a|an|der|die|das|den|dem|ein|eine|einer|eines|und|and|of|into|to|as|from|their|the user|user|nutzer)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  useEffect(() => {
    const nextDraftAnswers = Object.fromEntries(
      (cycle?.onboardingAnswers || []).map(answer => [answer.questionId, answer.value])
    );
    const signature = JSON.stringify(nextDraftAnswers);
    setStarterDraftAnswers(nextDraftAnswers);
    setStarterSaveState('idle');
    lastStarterSignatureRef.current = signature;
  }, [cycle?.id]);

  useEffect(() => {
    if (!cycle?.onboardingAnswers.length || !onUpdateCycleStarter) return;

    const signature = JSON.stringify(starterDraftAnswers);
    if (signature === lastStarterSignatureRef.current) return;

    setStarterSaveState('saving');

    const timer = window.setTimeout(() => {
      const nextAnswers = cycle.onboardingAnswers.map(answer => ({
        ...answer,
        value: starterDraftAnswers[answer.questionId] ?? '',
      }));

      lastStarterSignatureRef.current = signature;
      onUpdateCycleStarter(nextAnswers);
      setStarterSaveState('saved');
    }, 700);

    return () => window.clearTimeout(timer);
  }, [cycle, onUpdateCycleStarter, starterDraftAnswers]);

  // Derive breakthroughs from timeline events (single source of truth)
  const breakthroughTimelineEvents = timelineEvents.filter(e => e.type === 'BREAKTHROUGH');
  
  // Also load from breakthroughs array for backward compatibility
  // Merge both sources, deduplicate by id
  const allBreakthroughs = useMemo(() => {
    const fromTimeline = breakthroughTimelineEvents.map(event => ({
      id: event.id,
      createdAt: event.createdAt,
      title: event.label,
      insight: event.summary,
      trigger: undefined,
      action: undefined,
      tags: event.tags,
      sourceSessionId: event.sourceSessionId
    }));
    
    const fromArray = breakthroughs;
    const merged = [...fromTimeline, ...fromArray];
    
    // Deduplicate by id first, then by translated/normalized meaning for legacy records.
    const seen = new Set<string>();
    const seenMeaning = new Set<string>();
    return merged.filter(bt => {
      if (seen.has(bt.id)) return false;
      seen.add(bt.id);
      const meaningKey = normalizeMeaningText(`${bt.title} ${bt.insight}`).slice(0, 120);
      if (meaningKey && seenMeaning.has(meaningKey)) return false;
      seenMeaning.add(meaningKey);
      return true;
    });
  }, [breakthroughTimelineEvents, breakthroughs]);

  const displayTimelineEvents = useMemo(() => {
    const breakthroughKeys = new Set(
      allBreakthroughs.map(bt => normalizeMeaningText(`${bt.title} ${bt.insight}`).slice(0, 120))
    );
    const seen = new Set<string>();

    return timelineEvents.filter(event => {
      const eventKey = normalizeMeaningText(`${event.label} ${event.summary}`).slice(0, 120);
      if (seen.has(event.id) || (eventKey && seen.has(eventKey))) return false;
      seen.add(event.id);
      if (eventKey) seen.add(eventKey);

      if (event.type === 'BREAKTHROUGH') {
        return breakthroughKeys.has(eventKey) || !eventKey;
      }

      return true;
    });
  }, [allBreakthroughs, timelineEvents]);

  const displayMilestones = useMemo(() => {
    const timelineMeaningKeys = new Set(
      timelineEvents.map(event => normalizeMeaningText(`${event.label} ${event.summary}`).slice(0, 120))
    );
    const breakthroughMeaningKeys = new Set(
      allBreakthroughs.map(bt => normalizeMeaningText(`${bt.title} ${bt.insight}`).slice(0, 120))
    );
    const seen = new Set<string>();

    return stats.milestones.filter(milestone => {
      const key = normalizeMeaningText(`${milestone.title} ${milestone.description}`).slice(0, 120);
      if (seen.has(milestone.id) || (key && seen.has(key))) return false;
      seen.add(milestone.id);
      if (key) seen.add(key);

      if (milestone.type === 'BREAKTHROUGH' && key) {
        return !timelineMeaningKeys.has(key) && !breakthroughMeaningKeys.has(key);
      }

      return true;
    });
  }, [allBreakthroughs, stats.milestones, timelineEvents]);

  const getTimelineSortTime = (dateString: string): number => {
    const normalized = /^2023-10-\d{2}/.test(dateString)
      ? dateString.replace(/^2023-10-/, '2026-06-')
      : dateString;
    return new Date(normalized).getTime() || 0;
  };

  const displayTimelineItems = useMemo(() => {
    const milestoneItems = displayMilestones.map(milestone => ({
      kind: 'milestone' as const,
      id: milestone.id,
      date: milestone.date,
      milestone,
    }));
    const eventItems = displayTimelineEvents.map(event => ({
      kind: 'event' as const,
      id: event.id,
      date: event.createdAt,
      event,
    }));

    return [...milestoneItems, ...eventItems].sort((a, b) => {
      const bTime = getTimelineSortTime(b.date);
      const aTime = getTimelineSortTime(a.date);
      return bTime - aTime;
    });
  }, [displayMilestones, displayTimelineEvents]);

  const latestMeaningSeed = useMemo(() => {
    const latestQuest = questLogEntries[0]?.title || questLogEntries[0]?.content;
    const latestBreakthrough = allBreakthroughs[0]?.title || allBreakthroughs[0]?.insight;
    const latestTimeline = timelineEvents[0]?.label || timelineEvents[0]?.summary;
    const loreSeed = currentLore
      .split(/\n+/)
      .map(line => line.replace(/^\[SCRIBE ENTRY[^\]]*\]:\s*/i, '').trim())
      .filter(Boolean)
      .slice(-1)[0];
    return latestQuest || latestBreakthrough || latestTimeline || loreSeed || cycle?.theme || stats.currentQuest;
  }, [allBreakthroughs, currentLore, cycle?.theme, questLogEntries, stats.currentQuest, timelineEvents]);

  const derivedState = useMemo(() => {
    if (!cycle) return stats.state;
    if (cycle.status === 'COMPLETED') {
      return language === 'DE' ? 'Zyklus versiegelt' : 'Cycle sealed';
    }
    if (completedToday) {
      return language === 'DE'
        ? `Tag ${completedToday.day} versiegelt. Der Raum hält.`
        : `Day ${completedToday.day} sealed. The room holds.`;
    }
    return language === 'DE'
      ? `Tag ${nextSealDay || 1} wartet auf Versiegelung.`
      : `Day ${nextSealDay || 1} awaits sealing.`;
  }, [completedToday, cycle, language, nextSealDay, stats.state]);

  const derivedQuest = useMemo(() => {
    if (!cycle) return localizeQuest(stats.currentQuest);
    const marker = nextMilestone
      ? (language === 'DE'
        ? `Tag ${nextMilestone.day}: ${nextMilestone.title.DE}`
        : `Day ${nextMilestone.day}: ${nextMilestone.title.EN}`)
      : (language === 'DE' ? 'der geschlossene Kreis' : 'the closed circle');
    const seed = localizeLegacyMeaningTitle(String(latestMeaningSeed || cycle.theme));
    return language === 'DE'
      ? `Nächste Quest: Folge dem nächsten leisen Riss bei "${seed}". Der Marker ruft: ${marker}.`
      : `Next Quest: Follow the nearest quiet fracture around "${seed}". The marker calls: ${marker}.`;
  }, [cycle, language, latestMeaningSeed, nextMilestone, stats.currentQuest]);

  const loadMeaningData = async () => {
    try {
      setIsLoadingMeaning(true);
      const meaningState = await getMeaningState();
      setQuestLogEntries(meaningState.questLogEntries || []);
      setTimelineEvents(meaningState.soulTimelineEvents || []);
      setBreakthroughs(meaningState.breakthroughs || []);
    } catch (error) {
      console.error('Failed to load meaning data:', error);
    } finally {
      setIsLoadingMeaning(false);
    }
  };

  useEffect(() => {
    loadMeaningData();
  }, []); // Load on mount - key prop from parent will force remount on integrate

  useEffect(() => {
    if (displayName) {
      return;
    }

    let isMounted = true;
    const loadDisplayName = async () => {
      try {
        const session = await getSupabaseSession();
        if (!isMounted || !session?.displayName) {
          return;
        }

        setDisplayName(session.displayName);
        setCurrentUserDisplayName(session.displayName);
      } catch (error) {
        console.warn('Failed to load Supabase display name:', error);
      }
    };

    loadDisplayName();
    return () => {
      isMounted = false;
    };
  }, [displayName]);

  // Refresh when onRefresh is called
  useEffect(() => {
    if (onRefresh) {
      const refreshHandler = () => loadMeaningData();
      // This is a simple approach - in a real app you might use a context or event system
      // For now, we'll rely on component remount or manual refresh
    }
  }, [onRefresh]);

  const normalizeLegacyMeaningDate = (dateString: string): string => {
    // Early local meaning test data was accidentally seeded as October 2023.
    // Preserve the day while moving those legacy records into the actual June 2026 build window.
    if (/^2023-10-\d{2}/.test(dateString)) {
      return dateString.replace(/^2023-10-/, '2026-06-');
    }
    return dateString;
  };

  const isLionSoulTimelineSeed = (sourceSessionId?: string): boolean => {
    return sourceSessionId === 'lion-soul-timeline-seed-v1';
  };

  const formatDate = (dateString: string, sourceSessionId?: string) => {
    try {
      const date = new Date(normalizeLegacyMeaningDate(dateString));
      if (isLionSoulTimelineSeed(sourceSessionId)) {
        return date.toLocaleDateString(language === 'DE' ? 'de-DE' : 'en-US', {
          year: 'numeric',
          month: 'long',
        });
      }
      return date.toLocaleDateString(language === 'DE' ? 'de-DE' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getCycleDayFromId = (id: string): number | null => {
    const match = id.match(/cycle-day-(\d+)|stats-milestone-day-(\d+)/);
    const value = match?.[1] || match?.[2];
    return value ? Number(value) : null;
  };

  const getLocalizedCycleMilestone = (day: number | null) => {
    if (!day) return null;
    return cycleMilestones.find(milestone => milestone.day === day) || null;
  };

  const localizeMilestoneTitle = (id: string, fallback: string): string => {
    const day = getCycleDayFromId(id);
    const milestone = getLocalizedCycleMilestone(day);
    if (!day || !milestone) return fallback;
    return language === 'DE'
      ? `Zyklus Tag ${day}: ${milestone.title.DE}`
      : `Cycle Day ${day}: ${milestone.title.EN}`;
  };

  const localizeEventTitle = (id: string, fallback: string): string => {
    const day = getCycleDayFromId(id);
    const milestone = getLocalizedCycleMilestone(day);
    if (!day || !milestone) return fallback;
    return language === 'DE'
      ? `Tag ${day}: ${milestone.title.DE}`
      : `Day ${day}: ${milestone.title.EN}`;
  };

  const localizeCycleSummary = (id: string, fallback: string): string => {
    const milestone = getLocalizedCycleMilestone(getCycleDayFromId(id));
    return milestone?.description[language] || fallback;
  };

  function localizeLegacyMeaningTitle(title: string): string {
    if (language !== 'DE') return title;
    const trimmed = title.trim();
    const legacyTitleMap: Record<string, string> = {
      'Transforming Anxiety into Creative Energy': 'Angst in kreative Energie verwandeln',
      'Understanding Shame as a Path to Growth': 'Scham als Weg zu Wachstum verstehen',
      'Transforming Shame and Fear into Growth': 'Scham und Angst in Wachstum verwandeln',
      'Realization of Emotional Freedom': 'Erkenntnis emotionaler Freiheit',
      'Embracing Vulnerability': 'Verletzlichkeit annehmen',
    };
    return legacyTitleMap[trimmed] || trimmed;
  }

  const localizeLegacyMeaningSummary = (summary: string): string => {
    if (language !== 'DE') return summary;
    const trimmed = summary.trim();
    const legacySummaryMap: Record<string, string> = {
      'The user realized that they can use their nervousness as a source of creative energy for their presentation.':
        'Der Nutzer hat erkannt, dass er seine Nervosität als Quelle kreativer Energie für seine Präsentation nutzen kann.',
      'The user realized that embracing and processing their feelings of shame can lead to personal transformation and empowerment.':
        'Der Nutzer hat erkannt, dass das Annehmen und Verarbeiten von Scham zu persönlicher Transformation und innerer Ermächtigung führen kann.',
      'The user discovered that emotional freedom comes from acknowledging and embracing their feelings, rather than suppressing them.':
        'Der Nutzer hat erkannt, dass emotionale Freiheit daraus entsteht, Gefühle anzuerkennen und anzunehmen, statt sie zu unterdrücken.',
      'The user recognized the importance of accepting their emotions, including shame, as valid parts of their journey towards authenticity and growth.':
        'Der Nutzer hat erkannt, wie wichtig es ist, eigene Gefühle einschließlich Scham als gültige Teile des Weges zu Authentizität und Wachstum anzunehmen.',
    };
    if (legacySummaryMap[trimmed]) return legacySummaryMap[trimmed];
    if (trimmed.startsWith('The session focused on understanding and processing feelings of shame and fear')) {
      return 'Die Sitzung drehte sich darum, Gefühle von Scham und Angst zu verstehen und zu verarbeiten, um sie in Wachstum zu verwandeln.';
    }
    return trimmed;
  };

  const localizeGeneratedBreakthroughTitle = (title: string): string => {
    if (language !== 'DE') return title;
    const trimmed = localizeLegacyMeaningTitle(title);
    const legacyTitleMap: Record<string, string> = {
      'Transforming Anxiety into Creative Energy': 'Angst in kreative Energie verwandeln',
      'Understanding Shame as a Path to Growth': 'Scham als Weg zu Wachstum verstehen',
    };
    if (legacyTitleMap[trimmed]) return legacyTitleMap[trimmed];
    if (/^breakthrough:?$/i.test(trimmed)) return 'Durchbruch';
    return trimmed
      .replace(/^breakthrough:\s*/i, 'Durchbruch: ')
      .replace(/^breakthrough\s+-\s+/i, 'Durchbruch - ');
  };

  const localizeGeneratedBreakthroughSummary = (summary: string): string => {
    if (language !== 'DE') return summary;
    const trimmed = localizeLegacyMeaningSummary(summary);
    const legacySummaryMap: Record<string, string> = {
      'The user realized that they can use their nervousness as a source of creative energy for their presentation.':
        'Der Nutzer hat erkannt, dass er seine Nervosität als Quelle kreativer Energie für seine Präsentation nutzen kann.',
      'The user realized that embracing and processing their feelings of shame can lead to personal transformation and empowerment.':
        'Der Nutzer hat erkannt, dass das Annehmen und Verarbeiten von Scham zu persönlicher Transformation und innerer Ermächtigung führen kann.',
    };
    if (legacySummaryMap[trimmed]) return legacySummaryMap[trimmed];
    return trimmed
      .replace(/\bbreakthrough\b/gi, 'Durchbruch')
      .replace(/\binsight\b/gi, 'Einsicht')
      .replace(/\bnext step\b/gi, 'nächster Schritt');
  };

  function localizeQuest(quest: string): string {
    if (language !== 'DE') return quest;
    return quest.replace(/^Cycle:/, 'Zyklus:');
  }

  const localizeAttributeName = (name: string): string => {
    if (language !== 'DE') return name;
    const map: Record<string, string> = {
      'Practicing: Pattern Recognition': 'Übend: Mustererkennung',
      'Practicing: Integration Rhythm': 'Übend: Integrationsrhythmus',
      'Observed: Cycle Completion': 'Beobachtet: Zyklus-Abschluss',
    };
    return map[name] || name;
  };

  const localizeAttributeLevel = (level: string): string => {
    if (language !== 'DE') return level;
    const map: Record<string, string> = {
      Emerging: 'Entstehend',
      Developing: 'In Entwicklung',
      Integrated: 'Integriert',
    };
    return map[level] || level;
  };

  const localizeAttributeDescription = (description: string): string => {
    if (language !== 'DE') return description;
    const match = description.match(/^Observed through cycle "(.+)" on day (\d+)\.$/);
    return match ? `Im Zyklus "${match[1]}" an Tag ${match[2]} beobachtet.` : description;
  };

  return (
    <div className="flex-1 w-full h-full overflow-y-auto px-6 py-10 relative">
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

        <div className="max-w-5xl mx-auto space-y-8 relative z-10 pb-20">
            
            {/* Header / Hero Section */}
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start p-6 rounded-2xl bg-[#0f0716]/80 border border-purple-500/20 backdrop-blur-md shadow-2xl animate-fade-in-up">
                {/* Avatar / Class Icon */}
                <div className="relative w-24 h-24 shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full blur-lg opacity-40 animate-pulse-slow" />
                    <div className="relative w-full h-full bg-[#150a26] rounded-full border border-amber-500/30 flex items-center justify-center shadow-inner">
                        <ICON_MAP.Crown size={40} className="text-amber-400" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-purple-900 border border-purple-400/50 px-2 py-0.5 rounded text-[10px] font-bold text-purple-200">
                        LVL {sealedLevel}
                    </div>
                </div>

                <div className="flex-1 text-center md:text-left space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.08)]">
                        <Sparkles size={12} className="text-amber-300" />
                        <span>{language === 'DE' ? 'Blueprint von' : 'Blueprint of'}</span>
                        <span className="max-w-[180px] truncate text-white">{displayName || (language === 'DE' ? 'Unbekannt' : 'Unknown')}</span>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-white uppercase tracking-widest">
                            {stats.title}
                        </h2>
                        <span className="hidden md:block w-1.5 h-1.5 rounded-full bg-purple-500/50" />
                        <span className="text-xs text-purple-400 uppercase tracking-widest font-mono">
                            {t.className}
                        </span>
                    </div>
                    
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm">
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/20 border border-blue-500/20 text-blue-200">
                            <Activity size={14} />
                            <span>{t.state}: <span className="text-white font-bold">{derivedState}</span></span>
                         </div>
                         <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-900/20 border border-amber-500/20 text-amber-200">
                            <Target size={14} />
                            <span>{t.quest}: <span className="text-white font-bold">{derivedQuest}</span></span>
                         </div>
                    </div>
                </div>
            </div>

            {cycle && (
                <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6 animate-fade-in-up" style={{ animationDelay: '0.06s' }}>
                    <div className="rounded-xl border border-purple-500/15 bg-[#100719]/75 p-5 backdrop-blur-sm shadow-xl shadow-black/20">
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-purple-400">
                                    <Hourglass size={14} />
                                    {language === 'DE' ? 'Aktiver Zyklus' : 'Active Cycle'}
                                </div>
                                <h3 className="text-lg font-bold text-white">{cycle.title}</h3>
                                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-purple-200/65">{cycle.theme}</p>
                            </div>
                            <div className="rounded-lg border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-right">
                                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200">
                                    {language === 'DE' ? 'Teilnahme-Tag' : 'Participation Day'}
                                </div>
                                <div className="text-2xl font-bold text-white">{activeCycleDay}</div>
                            </div>
                        </div>

                        <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/5">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-purple-500 via-fuchsia-400 to-amber-300 transition-all duration-700"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>

                        <div className={`mb-4 w-full origin-top-left overflow-hidden rounded-lg border border-purple-500/15 bg-[#0d0615]/70 transition-[max-width,border-color,background-color] duration-300 focus-within:border-purple-300/30 ${
                            starterOpen ? 'max-w-[72rem]' : 'max-w-[34rem]'
                        }`}>
                            <button
                                type="button"
                                onClick={() => setStarterOpen(prev => !prev)}
                                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.025]"
                                aria-expanded={starterOpen}
                            >
                                <span className="flex min-w-0 items-center gap-2">
                                    <BookOpen size={14} className="shrink-0 text-purple-300/80" />
                                    <span className="min-w-0">
                                        <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-purple-300">
                                            {t.starterBlueprint}
                                        </span>
                                        <span className="mt-1 block truncate text-xs text-purple-200/45">
                                            {cycle.onboardingAnswers
                                                .map(answer => starterDraftAnswers[answer.questionId] ?? answer.value)
                                                .filter(Boolean)
                                                .slice(0, 2)
                                                .join(' / ') || t.starterEmpty}
                                        </span>
                                    </span>
                                </span>
                                <span className="flex shrink-0 items-center gap-2">
                                    {starterSaveState !== 'idle' && (
                                        <span className={`text-[9px] font-bold uppercase tracking-[0.12em] ${
                                            starterSaveState === 'saving' ? 'text-sky-200/70' : 'text-emerald-200/70'
                                        }`}>
                                            {starterSaveState === 'saving' ? t.starterSaving : t.starterSaved}
                                        </span>
                                    )}
                                    <span className="hidden text-[9px] font-bold uppercase tracking-[0.12em] text-purple-300/55 sm:inline">
                                        {starterOpen ? t.starterClose : t.starterOpen}
                                    </span>
                                    <ChevronDown
                                        size={16}
                                        className={`text-purple-200/65 transition-transform duration-300 ${starterOpen ? 'rotate-180' : ''}`}
                                    />
                                </span>
                            </button>

                            <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                                starterOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                            }`}>
                                <div className="min-h-0 overflow-hidden">
                                    <div className="grid gap-3 border-t border-purple-500/10 p-4 sm:grid-cols-2">
                                        {cycle.onboardingAnswers.length ? (
                                            cycle.onboardingAnswers.map(answer => (
                                                <label key={answer.questionId} className="rounded-lg border border-white/8 bg-white/[0.035] p-3 transition-colors focus-within:border-purple-300/30">
                                                    <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-purple-400">
                                                        {answer.label}
                                                    </span>
                                                    <textarea
                                                        value={starterDraftAnswers[answer.questionId] ?? ''}
                                                        onChange={event => setStarterDraftAnswers(prev => ({
                                                            ...prev,
                                                            [answer.questionId]: event.target.value,
                                                        }))}
                                                        rows={3}
                                                        className="w-full resize-none bg-transparent text-sm leading-relaxed text-purple-100 outline-none placeholder:text-purple-400/30"
                                                    />
                                                </label>
                                            ))
                                        ) : (
                                            <p className="text-sm leading-relaxed text-purple-200/45">{t.starterEmpty}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                            <div className="rounded-lg border border-white/8 bg-white/[0.035] p-3">
                                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-purple-400">
                                    {language === 'DE' ? 'Abgeschlossen' : 'Completed'}
                                </div>
                                <div className="mt-1 font-bold text-white">{completedCycleDays}/63</div>
                            </div>
                            <div className="rounded-lg border border-white/8 bg-white/[0.035] p-3">
                                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-purple-400">
                                    {language === 'DE' ? 'Heute' : 'Today'}
                                </div>
                                <div className="mt-1 font-bold text-white">
                                    {completedToday
                                        ? (language === 'DE' ? `Tag ${completedToday.day} versiegelt` : `Day ${completedToday.day} sealed`)
                                        : (language === 'DE' ? 'Noch offen' : 'Open')}
                                </div>
                            </div>
                            <div className="rounded-lg border border-white/8 bg-white/[0.035] p-3">
                                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-purple-400">
                                    {language === 'DE' ? 'Nächster Marker' : 'Next Marker'}
                                </div>
                                <div className="mt-1 font-bold text-white">
                                    {nextMilestone
                                        ? `${language === 'DE' ? 'Tag' : 'Day'} ${nextMilestone.day}: ${nextMilestone.title[language]}`
                                        : (language === 'DE' ? 'Geschlossen' : 'Closed')}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-sky-300/15 bg-sky-300/[0.045] p-5 backdrop-blur-sm shadow-xl shadow-black/20">
                        <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-sky-200">
                            <Shield size={14} />
                            {language === 'DE' ? 'Kommunikationshaltung' : 'Communication Stance'}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                            <div className="rounded-lg border border-sky-200/12 bg-black/15 p-3">
                                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-200/60">
                                    {language === 'DE' ? 'Empfohlen' : 'Recommended'}
                                </div>
                                <div className="mt-1 text-xl font-bold text-white">
                                    {communicationModeLabels[recommendedCommunicationMode.mode][language]}
                                </div>
                            </div>
                            <div className="rounded-lg border border-sky-200/12 bg-black/15 p-3">
                                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-200/60">
                                    {language === 'DE' ? 'Aktuell' : 'Current'}
                                </div>
                                <div className="mt-1 text-xl font-bold text-white">
                                    {communicationModeLabels[currentCommunicationMode][language]}
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 space-y-2 text-sm leading-relaxed text-sky-100/70">
                            {communicationExplanation.map(sentence => (
                                <p key={sentence}>{sentence}</p>
                            ))}
                        </div>
                        {/* Legacy static stance copy removed in favor of dynamic Meaning stance reasoning. */}
                        <p className="hidden" aria-hidden="true">
                            {language === 'DE'
                                ? 'Der Rat nutzt diese Haltung als leisen Rahmen. Du kannst sie situativ im Header überschreiben.'
                                : 'The council uses this as a quiet frame. You can override it situationally in the header.'}
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Column 1: Attributes, Inventory, Questlog, Breakthroughs */}
                <div className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    
                    {/* Questlog Entries */}
                    <div className="bg-[#150a26]/60 border border-purple-500/10 rounded-xl p-5 backdrop-blur-sm">
                        <h3 className="text-xs font-bold text-purple-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <BookOpen size={14} /> {language === 'DE' ? 'Questlog' : 'Questlog'}
                        </h3>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {questLogEntries.length === 0 ? (
                                <p className="text-xs text-purple-400/40 italic">
                                    {t.noEntries}
                                </p>
                            ) : (
                                questLogEntries.slice(0, 3).map((entry) => (
                                    <div key={entry.id} className="group p-3 rounded-lg bg-[#0a0510] border border-white/5 hover:border-purple-500/30 transition-colors">
                                        <div className="flex items-start justify-between mb-1">
                                            <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                                                {localizeLegacyMeaningTitle(entry.title)}
                                            </h4>
                                            <span className="text-[9px] text-purple-500/50 uppercase tracking-widest font-mono px-1.5 py-0.5 rounded border border-purple-500/10">
                                                {formatDate(entry.createdAt)}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-purple-300/60 leading-relaxed font-light line-clamp-2">
                                            {localizeLegacyMeaningSummary(entry.content)}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Attributes */}
                    <div className="bg-[#150a26]/60 border border-purple-500/10 rounded-xl p-5 backdrop-blur-sm">
                        <h3 className="text-xs font-bold text-purple-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <Brain size={14} /> {t.activeAttributes}
                        </h3>
                        <div className="space-y-3">
                            {stats.attributes.map((attr, idx) => (
                                <div key={idx} className="group p-3 rounded-lg bg-[#0a0510] border border-white/5 hover:border-purple-500/30 transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-sm font-bold ${attr.type === 'DEBUFF' ? 'text-red-400' : 'text-purple-200'}`}>
                                            {localizeAttributeName(attr.name)}
                                        </span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/50 uppercase">
                                            {localizeAttributeLevel(attr.level)}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-purple-300/60 leading-relaxed font-light">
                                        {localizeAttributeDescription(attr.description)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Breakthroughs */}
                    <div className="bg-[#150a26]/60 border border-purple-500/10 rounded-xl p-5 backdrop-blur-sm">
                        <h3 className="text-xs font-bold text-purple-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <Zap size={14} /> {t.breakthroughs}
                        </h3>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {allBreakthroughs.length === 0 ? (
                                <p className="text-xs text-purple-400/40 italic">
                                    {t.noBreakthroughs}
                                </p>
                            ) : (
                                allBreakthroughs.slice(0, 3).map((bt) => (
                                    <div key={bt.id} className="group p-3 rounded-lg bg-amber-900/10 border border-amber-500/20 hover:border-amber-500/40 transition-colors">
                                        <div className="flex items-start justify-between mb-1">
                                            <h4 className="text-sm font-bold text-amber-300 group-hover:text-amber-200 transition-colors">
                                                {localizeGeneratedBreakthroughTitle(localizeEventTitle(bt.id, bt.title))}
                                            </h4>
                                            <span className="text-[9px] text-amber-400 bg-amber-900/20 px-1.5 rounded border border-amber-500/20">
                                                {breakthroughLabel}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-amber-200/80 leading-relaxed font-light line-clamp-2">
                                            {localizeGeneratedBreakthroughSummary(localizeCycleSummary(bt.id, bt.insight))}
                                        </p>
                                        <span className="text-[9px] text-amber-500/50 font-mono mt-1 block">
                                            {formatDate(bt.createdAt)}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Inventory */}
                    <div className="bg-[#150a26]/60 border border-purple-500/10 rounded-xl p-5 backdrop-blur-sm">
                        <h3 className="text-xs font-bold text-purple-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <Database size={14} /> {t.skillInventory}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {stats.inventory.map((item, idx) => (
                                <span key={idx} className="text-[10px] px-2.5 py-1.5 rounded bg-purple-900/30 border border-purple-500/20 text-purple-300">
                                    {item}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Column 2 & 3: Timeline / Milestones & Timeline Events */}
                <div className="md:col-span-2 bg-[#150a26]/60 border border-purple-500/10 rounded-xl p-6 backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    <h3 className="text-xs font-bold text-purple-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <Trophy size={14} /> {t.soulTimeline}
                    </h3>
                    
                    <div className="relative space-y-8 pl-4">
                        {/* Timeline Line */}
                        <div className="absolute top-2 bottom-2 left-[23px] w-px bg-gradient-to-b from-purple-500/50 via-purple-500/20 to-transparent" />

                        {displayTimelineItems.map((item) => {
                            if (item.kind === 'milestone') {
                                const milestone = item.milestone;
                                const Icon = ICON_MAP[milestone.icon] || Star;
                                return (
                                    <div key={item.id} className="relative flex gap-6 group">
                                        <div className="relative z-10 shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-[#0f0716] border border-purple-500/30 shadow-[0_0_15px_rgba(139,92,246,0.1)] group-hover:scale-110 transition-transform duration-300">
                                            <div className="absolute inset-0 rounded-full bg-purple-500/10 animate-pulse-subtle" />
                                            <Icon size={20} className="text-purple-300" />
                                        </div>

                                        <div className="flex-1 pt-1">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-1">
                                                <h4 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                                                    {milestone.type === 'BREAKTHROUGH'
                                                        ? localizeGeneratedBreakthroughTitle(localizeMilestoneTitle(milestone.id, milestone.title))
                                                        : localizeLegacyMeaningTitle(localizeMilestoneTitle(milestone.id, milestone.title))}
                                                </h4>
                                                <span className="text-[10px] text-purple-500/50 uppercase tracking-widest font-mono px-2 py-0.5 rounded border border-purple-500/10">
                                                    {formatDate(milestone.date)}
                                                </span>
                                                {milestone.type === 'BREAKTHROUGH' && (
                                                    <span className="text-[9px] text-amber-400 bg-amber-900/20 px-1.5 rounded border border-amber-500/20">{breakthroughLabel}</span>
                                                )}
                                            </div>
                                            <p className="text-sm text-purple-200/70 leading-relaxed max-w-xl">
                                                {milestone.type === 'BREAKTHROUGH'
                                                    ? localizeGeneratedBreakthroughSummary(localizeCycleSummary(milestone.id, milestone.description))
                                                    : localizeLegacyMeaningSummary(localizeCycleSummary(milestone.id, milestone.description))}
                                            </p>
                                        </div>
                                    </div>
                                );
                            }

                            const event = item.event;
                            const isBreakthrough = event.type === 'BREAKTHROUGH';
                            return (
                                <div key={item.id} className="relative flex gap-6 group">
                                    {/* Icon Node */}
                                    <div className="relative z-10 shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-[#0f0716] border border-purple-500/30 shadow-[0_0_15px_rgba(139,92,246,0.1)] group-hover:scale-110 transition-transform duration-300">
                                        <div className="absolute inset-0 rounded-full bg-purple-500/10 animate-pulse-subtle" />
                                        {isBreakthrough ? (
                                            <Zap size={20} className="text-amber-300" />
                                        ) : (
                                            <Sparkles size={20} className="text-purple-300" />
                                        )}
                                    </div>
                                    
                                    {/* Content */}
                                    <div className="flex-1 pt-1">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-1">
                                            <h4 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                                                {isBreakthrough
                                                    ? localizeGeneratedBreakthroughTitle(localizeEventTitle(event.id, event.label))
                                                    : localizeLegacyMeaningTitle(localizeEventTitle(event.id, event.label))}
                                            </h4>
                                            <span className="text-[10px] text-purple-500/50 uppercase tracking-widest font-mono px-2 py-0.5 rounded border border-purple-500/10">
                                                {formatDate(event.createdAt, event.sourceSessionId)}
                                            </span>
                                            {isBreakthrough && (
                                                <span className="text-[9px] text-amber-400 bg-amber-900/20 px-1.5 rounded border border-amber-500/20">{breakthroughLabel}</span>
                                            )}
                                            {event.intensity && !isBreakthrough && (
                                                <span className="text-[9px] text-purple-400/60">
                                                    {event.intensity}/10
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-purple-200/70 leading-relaxed max-w-xl">
                                            {isBreakthrough
                                                ? localizeGeneratedBreakthroughSummary(localizeCycleSummary(event.id, event.summary))
                                                : localizeLegacyMeaningSummary(localizeCycleSummary(event.id, event.summary))}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Future Node */}
                        <div className="relative flex gap-6 opacity-50">
                             <div className="relative z-10 shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-[#0f0716] border border-dashed border-white/10">
                                <Lock size={16} className="text-white/20" />
                             </div>
                             <div className="pt-3">
                                <span className="text-xs text-white/20 uppercase tracking-[0.2em]">{t.beyond}</span>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
