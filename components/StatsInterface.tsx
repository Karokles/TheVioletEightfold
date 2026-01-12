
import React, { useState, useEffect } from 'react';
import { UserStats, Language, QuestLogEntry, SoulTimelineEvent, Breakthrough } from '../types';
import { ICON_MAP } from '../constants';
import { Shield, Zap, Brain, Activity, Target, Lock, Unlock, Database, Trophy, Star, BookOpen, Sparkles, Calendar, RefreshCw } from 'lucide-react';
import { getMeaningState } from '../services/aiService';

interface StatsInterfaceProps {
    language: Language;
    stats: UserStats;
    onRefresh?: () => void; // Optional refresh trigger
}

export const StatsInterface: React.FC<StatsInterfaceProps> = ({ language, stats, onRefresh }) => {
  const [questLogEntries, setQuestLogEntries] = useState<QuestLogEntry[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<SoulTimelineEvent[]>([]);
  const [breakthroughs, setBreakthroughs] = useState<Breakthrough[]>([]);
  const [isLoadingMeaning, setIsLoadingMeaning] = useState(true);

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

  // Refresh when onRefresh is called
  useEffect(() => {
    if (onRefresh) {
      const refreshHandler = () => loadMeaningData();
      // This is a simple approach - in a real app you might use a context or event system
      // For now, we'll rely on component remount or manual refresh
    }
  }, [onRefresh]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(language === 'DE' ? 'de-DE' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
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
                        LVL {stats.level.split(' ')[0]}
                    </div>
                </div>

                <div className="flex-1 text-center md:text-left space-y-2">
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-white uppercase tracking-widest">
                            {stats.title}
                        </h2>
                        <span className="hidden md:block w-1.5 h-1.5 rounded-full bg-purple-500/50" />
                        <span className="text-xs text-purple-400 uppercase tracking-widest font-mono">
                            {language === 'DE' ? 'Architekt' : 'Architect'} Class
                        </span>
                    </div>
                    
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm">
                         <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/20 border border-blue-500/20 text-blue-200">
                            <Activity size={14} />
                            <span>State: <span className="text-white font-bold">{stats.state}</span></span>
                         </div>
                         <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-900/20 border border-amber-500/20 text-amber-200">
                            <Target size={14} />
                            <span>Quest: <span className="text-white font-bold">{stats.currentQuest}</span></span>
                         </div>
                    </div>
                </div>
            </div>

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
                                    {language === 'DE' ? 'Keine Einträge' : 'No entries'}
                                </p>
                            ) : (
                                questLogEntries.slice(0, 3).map((entry) => (
                                    <div key={entry.id} className="group p-3 rounded-lg bg-[#0a0510] border border-white/5 hover:border-purple-500/30 transition-colors">
                                        <div className="flex items-start justify-between mb-1">
                                            <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                                                {entry.title}
                                            </h4>
                                            <span className="text-[9px] text-purple-500/50 uppercase tracking-widest font-mono px-1.5 py-0.5 rounded border border-purple-500/10">
                                                {formatDate(entry.createdAt)}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-purple-300/60 leading-relaxed font-light line-clamp-2">
                                            {entry.content}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Attributes */}
                    <div className="bg-[#150a26]/60 border border-purple-500/10 rounded-xl p-5 backdrop-blur-sm">
                        <h3 className="text-xs font-bold text-purple-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <Brain size={14} /> Active Attributes
                        </h3>
                        <div className="space-y-3">
                            {stats.attributes.map((attr, idx) => (
                                <div key={idx} className="group p-3 rounded-lg bg-[#0a0510] border border-white/5 hover:border-purple-500/30 transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-sm font-bold ${attr.type === 'DEBUFF' ? 'text-red-400' : 'text-purple-200'}`}>
                                            {attr.name}
                                        </span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/50 uppercase">
                                            {attr.level}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-purple-300/60 leading-relaxed font-light">
                                        {attr.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Breakthroughs */}
                    <div className="bg-[#150a26]/60 border border-purple-500/10 rounded-xl p-5 backdrop-blur-sm">
                        <h3 className="text-xs font-bold text-purple-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <Zap size={14} /> {language === 'DE' ? 'Durchbrüche' : 'Breakthroughs'}
                        </h3>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {breakthroughs.length === 0 ? (
                                <p className="text-xs text-purple-400/40 italic">
                                    {language === 'DE' ? 'Keine Durchbrüche' : 'No breakthroughs'}
                                </p>
                            ) : (
                                breakthroughs.slice(0, 3).map((bt) => (
                                    <div key={bt.id} className="group p-3 rounded-lg bg-amber-900/10 border border-amber-500/20 hover:border-amber-500/40 transition-colors">
                                        <div className="flex items-start justify-between mb-1">
                                            <h4 className="text-sm font-bold text-amber-300 group-hover:text-amber-200 transition-colors">
                                                {bt.title}
                                            </h4>
                                            <span className="text-[9px] text-amber-400 bg-amber-900/20 px-1.5 rounded border border-amber-500/20">
                                                BREAKTHROUGH
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-amber-200/80 leading-relaxed font-light line-clamp-2">
                                            {bt.insight}
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
                            <Database size={14} /> Skill Inventory
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
                        <Trophy size={14} /> Soul Timeline
                    </h3>
                    
                    <div className="relative space-y-8 pl-4">
                        {/* Timeline Line */}
                        <div className="absolute top-2 bottom-2 left-[23px] w-px bg-gradient-to-b from-purple-500/50 via-purple-500/20 to-transparent" />

                        {/* Milestones (existing) */}
                        {stats.milestones.map((milestone) => {
                            const Icon = ICON_MAP[milestone.icon] || Star;
                            return (
                                <div key={milestone.id} className="relative flex gap-6 group">
                                    {/* Icon Node */}
                                    <div className="relative z-10 shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-[#0f0716] border border-purple-500/30 shadow-[0_0_15px_rgba(139,92,246,0.1)] group-hover:scale-110 transition-transform duration-300">
                                        <div className="absolute inset-0 rounded-full bg-purple-500/10 animate-pulse-subtle" />
                                        <Icon size={20} className="text-purple-300" />
                                    </div>
                                    
                                    {/* Content */}
                                    <div className="flex-1 pt-1">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-1">
                                            <h4 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                                                {milestone.title}
                                            </h4>
                                            <span className="text-[10px] text-purple-500/50 uppercase tracking-widest font-mono px-2 py-0.5 rounded border border-purple-500/10">
                                                {milestone.date}
                                            </span>
                                            {milestone.type === 'BREAKTHROUGH' && (
                                                <span className="text-[9px] text-amber-400 bg-amber-900/20 px-1.5 rounded border border-amber-500/20">BREAKTHROUGH</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-purple-200/70 leading-relaxed max-w-xl">
                                            {milestone.description}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Timeline Events (from meaning agent) */}
                        {timelineEvents.map((event) => (
                            <div key={event.id} className="relative flex gap-6 group">
                                {/* Icon Node */}
                                <div className="relative z-10 shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-[#0f0716] border border-purple-500/30 shadow-[0_0_15px_rgba(139,92,246,0.1)] group-hover:scale-110 transition-transform duration-300">
                                    <div className="absolute inset-0 rounded-full bg-purple-500/10 animate-pulse-subtle" />
                                    <Sparkles size={20} className="text-purple-300" />
                                </div>
                                
                                {/* Content */}
                                <div className="flex-1 pt-1">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-1">
                                        <h4 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                                            {event.label}
                                        </h4>
                                        <span className="text-[10px] text-purple-500/50 uppercase tracking-widest font-mono px-2 py-0.5 rounded border border-purple-500/10">
                                            {formatDate(event.createdAt)}
                                        </span>
                                        {event.intensity && (
                                            <span className="text-[9px] text-purple-400/60">
                                                {event.intensity}/10
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-purple-200/70 leading-relaxed max-w-xl">
                                        {event.summary}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {/* Future Node */}
                        <div className="relative flex gap-6 opacity-50">
                             <div className="relative z-10 shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-[#0f0716] border border-dashed border-white/10">
                                <Lock size={16} className="text-white/20" />
                             </div>
                             <div className="pt-3">
                                <span className="text-xs text-white/20 uppercase tracking-[0.2em]">The Beyond...</span>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
