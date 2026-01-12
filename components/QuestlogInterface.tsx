
import React, { useState, useEffect } from 'react';
import { Language, QuestLogEntry, SoulTimelineEvent, Breakthrough } from '../types';
import { ICON_MAP } from '../constants';
import { BookOpen, Sparkles, Zap, Calendar, Tag, RefreshCw } from 'lucide-react';
import { analyzeMeaning, getMeaningState } from '../services/aiService';
import { Message } from '../types';

interface QuestlogInterfaceProps {
  language: Language;
}

export const QuestlogInterface: React.FC<QuestlogInterfaceProps> = ({ language }) => {
  const [questLogEntries, setQuestLogEntries] = useState<QuestLogEntry[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<SoulTimelineEvent[]>([]);
  const [breakthroughs, setBreakthroughs] = useState<Breakthrough[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const state = await getMeaningState();
      setQuestLogEntries(state.questLogEntries || []);
      setTimelineEvents(state.soulTimelineEvents || []);
      setBreakthroughs(state.breakthroughs || []);
    } catch (error) {
      console.error('Failed to load questlog data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
  };

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

  if (isLoading) {
    return (
      <div className="flex-1 w-full h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-12 h-12 mx-auto">
            <div className="absolute inset-0 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin"></div>
          </div>
          <p className="text-sm text-purple-400/70 uppercase tracking-wider">
            {language === 'DE' ? 'Lade Questlog...' : 'Loading Questlog...'}
          </p>
        </div>
      </div>
    );
  }

  const hasData = questLogEntries.length > 0 || timelineEvents.length > 0 || breakthroughs.length > 0;

  return (
    <div className="flex-1 w-full h-full overflow-y-auto px-6 py-10 relative">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10 pb-20">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-white uppercase tracking-widest mb-2">
              {language === 'DE' ? 'Questlog' : 'Questlog'}
            </h1>
            <p className="text-sm text-purple-400/60">
              {language === 'DE' 
                ? 'Deine Reise, Erkenntnisse und Durchbrüche' 
                : 'Your journey, insights, and breakthroughs'}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-purple-900/40 hover:bg-purple-800/60 text-purple-200 border border-purple-500/20 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            <span className="text-xs uppercase tracking-wider">{language === 'DE' ? 'Aktualisieren' : 'Refresh'}</span>
          </button>
        </div>

        {!hasData ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BookOpen size={64} className="text-purple-500/20 mb-6" />
            <h3 className="text-lg font-bold text-purple-300 mb-2 uppercase tracking-wider">
              {language === 'DE' ? 'Noch keine Einträge' : 'No Entries Yet'}
            </h3>
            <p className="text-sm text-purple-400/60 max-w-md">
              {language === 'DE' 
                ? 'Integriere eine Council-Session, um Questlog-Einträge, Timeline-Ereignisse und Durchbrüche zu erstellen.'
                : 'Integrate a council session to create questlog entries, timeline events, and breakthroughs.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Questlog Entries */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-[#150a26]/60 border border-purple-500/10 rounded-xl p-6 backdrop-blur-sm">
                <h2 className="text-xs font-bold text-purple-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <BookOpen size={14} /> {language === 'DE' ? 'Questlog Einträge' : 'Questlog Entries'}
                </h2>
                
                <div className="space-y-4">
                  {questLogEntries.length === 0 ? (
                    <p className="text-sm text-purple-400/40 italic">
                      {language === 'DE' ? 'Keine Einträge' : 'No entries'}
                    </p>
                  ) : (
                    questLogEntries.map((entry) => (
                      <div key={entry.id} className="group p-4 rounded-lg bg-[#0a0510] border border-white/5 hover:border-purple-500/30 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                            {entry.title}
                          </h3>
                          <span className="text-[10px] text-purple-500/50 uppercase tracking-widest font-mono px-2 py-0.5 rounded border border-purple-500/10">
                            {formatDate(entry.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-purple-200/70 leading-relaxed mb-3">
                          {entry.content}
                        </p>
                        {(entry.tags && entry.tags.length > 0) && (
                          <div className="flex flex-wrap gap-2">
                            {entry.tags.map((tag, idx) => (
                              <span key={idx} className="text-[9px] px-2 py-0.5 rounded bg-purple-900/30 border border-purple-500/20 text-purple-300">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar: Timeline & Breakthroughs */}
            <div className="space-y-6">
              
              {/* Soul Timeline Events */}
              <div className="bg-[#150a26]/60 border border-purple-500/10 rounded-xl p-6 backdrop-blur-sm">
                <h2 className="text-xs font-bold text-purple-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <Calendar size={14} /> {language === 'DE' ? 'Soul Timeline' : 'Soul Timeline'}
                </h2>
                
                <div className="relative space-y-4 pl-4">
                  <div className="absolute top-2 bottom-2 left-[23px] w-px bg-gradient-to-b from-purple-500/50 via-purple-500/20 to-transparent" />
                  
                  {timelineEvents.length === 0 ? (
                    <p className="text-sm text-purple-400/40 italic">
                      {language === 'DE' ? 'Keine Ereignisse' : 'No events'}
                    </p>
                  ) : (
                    timelineEvents.map((event) => (
                      <div key={event.id} className="relative flex gap-4 group">
                        <div className="relative z-10 shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-[#0f0716] border border-purple-500/30 shadow-[0_0_10px_rgba(139,92,246,0.1)]">
                          <Sparkles size={14} className="text-purple-300" />
                        </div>
                        <div className="flex-1 pt-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                              {event.label}
                            </h4>
                            {event.intensity && (
                              <span className="text-[9px] text-purple-500/50">
                                {event.intensity}/10
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-purple-200/70 leading-relaxed">
                            {event.summary}
                          </p>
                          <span className="text-[9px] text-purple-500/50 font-mono mt-1 block">
                            {formatDate(event.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Breakthroughs */}
              <div className="bg-[#150a26]/60 border border-purple-500/10 rounded-xl p-6 backdrop-blur-sm">
                <h2 className="text-xs font-bold text-purple-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <Zap size={14} /> {language === 'DE' ? 'Durchbrüche' : 'Breakthroughs'}
                </h2>
                
                <div className="space-y-4">
                  {breakthroughs.length === 0 ? (
                    <p className="text-sm text-purple-400/40 italic">
                      {language === 'DE' ? 'Keine Durchbrüche' : 'No breakthroughs'}
                    </p>
                  ) : (
                    breakthroughs.map((bt) => (
                      <div key={bt.id} className="group p-4 rounded-lg bg-amber-900/10 border border-amber-500/20 hover:border-amber-500/40 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-sm font-bold text-amber-300 group-hover:text-amber-200 transition-colors">
                            {bt.title}
                          </h3>
                          <span className="text-[9px] text-amber-400 bg-amber-900/20 px-1.5 rounded border border-amber-500/20">
                            BREAKTHROUGH
                          </span>
                        </div>
                        <p className="text-xs text-amber-200/80 leading-relaxed mb-2">
                          {bt.insight}
                        </p>
                        {bt.trigger && (
                          <p className="text-[10px] text-amber-400/60 mb-1">
                            <span className="font-bold">Trigger:</span> {bt.trigger}
                          </p>
                        )}
                        {bt.action && (
                          <p className="text-[10px] text-amber-400/60">
                            <span className="font-bold">Action:</span> {bt.action}
                          </p>
                        )}
                        <span className="text-[9px] text-amber-500/50 font-mono mt-2 block">
                          {formatDate(bt.createdAt)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

