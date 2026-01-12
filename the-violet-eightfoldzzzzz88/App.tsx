
import React, { useState, useEffect } from 'react';
import { RoundTable } from './components/RoundTable';
import { ChatInterface } from './components/ChatInterface';
import { CouncilSession } from './components/CouncilSession';
import { StatsInterface } from './components/StatsInterface'; 
import { WorldMapInterface } from './components/WorldMapInterface'; 
import { CalendarInterface } from './components/CalendarInterface';
import { FinanceInterface } from './components/FinanceInterface';
import { LandingScreen } from './components/LandingScreen';
import { AtomicIndicator } from './components/AtomicIndicator';
import { ArchetypeId, getUIText, getArchetypes, INITIAL_USER_CONTEXT_LORE, INITIAL_USER_STATS_DATA, INITIAL_USER_MAP_DATA } from './constants';
import { Language, UserStats, MapLocation, ScribeAnalysis, CalendarEvent, Transaction, EightfoldMode, GuardedState } from './types';
import { MessageSquare, ScrollText, Globe, LayoutDashboard, Map, Calendar as CalendarIcon, Wallet, X, ChevronUp, ShieldCheck, Zap } from 'lucide-react';

enum AppMode {
  DIRECT_CHAT = 'DIRECT_CHAT',
  COUNCIL_SESSION = 'COUNCIL_SESSION',
  STATS = 'STATS',
  WORLD_MAP = 'WORLD_MAP', 
  CALENDAR = 'CALENDAR',
  FINANCE = 'FINANCE',
}

/**
 * Hilfsfunktion zum sicheren Mergen von Datenstrukturen (Deep Merge Lite)
 */
const safeMergeStats = (saved: any): UserStats => {
    if (!saved) return INITIAL_USER_STATS_DATA;
    return {
        ...INITIAL_USER_STATS_DATA,
        ...saved,
        finances: {
            ...INITIAL_USER_STATS_DATA.finances,
            ...(saved.finances || {})
        },
        attributes: Array.isArray(saved.attributes) ? saved.attributes : INITIAL_USER_STATS_DATA.attributes,
        milestones: Array.isArray(saved.milestones) ? saved.milestones : INITIAL_USER_STATS_DATA.milestones,
        inventory: Array.isArray(saved.inventory) ? saved.inventory : INITIAL_USER_STATS_DATA.inventory,
        calendarEvents: Array.isArray(saved.calendarEvents) ? saved.calendarEvents : INITIAL_USER_STATS_DATA.calendarEvents,
    };
};

export default function App() {
  const [hasEntered, setHasEntered] = useState(false);
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.DIRECT_CHAT);
  const [activeArchetype, setActiveArchetype] = useState<ArchetypeId>(ArchetypeId.SOVEREIGN);
  const [language, setLanguage] = useState<Language>('EN');
  const [eightfoldMode, setEightfoldMode] = useState<EightfoldMode>('OG');
  const [guardedState, setGuardedState] = useState<GuardedState>('REFLECTION');
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);

  // --- Persistent State mit Fehlerbehandlung ---
  const [lore, setLore] = useState<string>(() => {
      try {
          return localStorage.getItem('user_lore') || INITIAL_USER_CONTEXT_LORE;
      } catch (e) { return INITIAL_USER_CONTEXT_LORE; }
  });

  const [stats, setStats] = useState<UserStats>(() => {
    try {
        const saved = localStorage.getItem('user_stats');
        if (!saved) return INITIAL_USER_STATS_DATA;
        return safeMergeStats(JSON.parse(saved));
    } catch (e) {
        console.error("Failed to parse stats, resetting to default", e);
        return INITIAL_USER_STATS_DATA;
    }
  });

  const [mapData, setMapData] = useState<MapLocation[]>(() => {
    try {
        const saved = localStorage.getItem('user_map');
        if (!saved) return INITIAL_USER_MAP_DATA;
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : INITIAL_USER_MAP_DATA;
    } catch (e) {
        return INITIAL_USER_MAP_DATA;
    }
  });

  useEffect(() => { 
      try {
          localStorage.setItem('user_lore', lore);
          localStorage.setItem('user_stats', JSON.stringify(stats));
          localStorage.setItem('user_map', JSON.stringify(mapData));
      } catch (e) { console.warn("Local storage write failed", e); }
  }, [lore, stats, mapData]);

  const handleScribeUpdate = (updates: ScribeAnalysis) => {
    if (updates.newLoreEntry) setLore(prev => prev + `\n\n[SCRIBE]: ${updates.newLoreEntry}`);
    setStats(prev => {
        let n = { ...prev };
        if (updates.updatedQuest) n.currentQuest = updates.updatedQuest;
        if (updates.newMilestone) n.milestones = [updates.newMilestone, ...prev.milestones];
        if (updates.newAttribute) n.attributes = [updates.newAttribute, ...prev.attributes];
        if (updates.newCalendarEvent) n.calendarEvents = [...prev.calendarEvents, updates.newCalendarEvent];
        return n;
    });
  };

  const ui = getUIText(language);
  const archetypes = getArchetypes(language);
  const activeArchetypeData = archetypes[activeArchetype];

  if (!hasEntered) return <LandingScreen onEnter={() => setHasEntered(true)} />;

  const navItems = [
    { mode: AppMode.DIRECT_CHAT, icon: MessageSquare, label: ui.DIRECT_COUNSEL },
    { mode: AppMode.COUNCIL_SESSION, icon: ScrollText, label: ui.COUNCIL_SESSION },
    { mode: AppMode.STATS, icon: LayoutDashboard, label: ui.BLUEPRINT },
    { mode: AppMode.CALENDAR, icon: CalendarIcon, label: ui.CALENDAR },
    { mode: AppMode.FINANCE, icon: Wallet, label: ui.FINANCE },
    { mode: AppMode.WORLD_MAP, icon: Map, label: ui.WORLD_MAP },
  ];

  return (
    <div className="min-h-screen bg-violet-950 text-violet-100 flex flex-col h-screen overflow-hidden animate-fade-in">
      <header className="h-20 shrink-0 border-b border-purple-900/30 bg-[#0f0716]/90 backdrop-blur-xl flex items-center justify-between px-4 md:px-6 z-50">
        
        {/* Logo öffnet Stimmen-Wähler */}
        <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setShowVoiceSelector(true)}>
          <div className="transition-transform duration-500 group-hover:scale-110">
            <AtomicIndicator mode={eightfoldMode} guardedState={guardedState} />
          </div>
          <div className="hidden sm:flex flex-col border-l border-white/10 pl-3">
            <span className="text-[9px] font-bold text-purple-400/80 uppercase tracking-widest">Select Voice</span>
            <span className="text-[10px] font-bold text-white uppercase group-hover:translate-x-1 transition-transform">{activeArchetypeData.name}</span>
          </div>
        </div>

        {eightfoldMode === 'GUARDED' && (
          <div className="hidden md:flex gap-1 bg-black/40 p-1 rounded-full border border-purple-500/20">
            {['STABILIZATION', 'REFLECTION', 'INTEGRATION'].map((s) => (
              <button key={s} onClick={() => setGuardedState(s as GuardedState)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${guardedState === s ? 'bg-purple-600 text-white shadow-lg' : 'text-purple-400 hover:bg-white/5'}`}>
                {s.slice(0, 5)}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4">
          <button onClick={() => setLanguage(l => l === 'EN' ? 'DE' : 'EN')} className="text-xs font-bold text-purple-400 bg-purple-900/20 px-3 py-1.5 rounded-full border border-purple-500/20 active:scale-95 transition-transform">{language}</button>
          <nav className="hidden md:flex gap-1 bg-black/20 p-1 rounded-xl border border-white/5">
            {navItems.map(item => (
              <button key={item.mode} onClick={() => setCurrentMode(item.mode)} className={`p-2 rounded-lg transition-all ${currentMode === item.mode ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]' : 'text-purple-400 hover:text-white'}`}>
                <item.icon size={18} />
              </button>
            ))}
          </nav>
        </div>
      </header>

      {eightfoldMode === 'GUARDED' && (
        <div className="md:hidden flex justify-center py-2 bg-[#0f0716]/90 border-b border-purple-900/20 animate-fade-in">
            <div className="flex gap-1 bg-black/40 p-1 rounded-full border border-purple-500/20">
                {['STABILIZATION', 'REFLECTION', 'INTEGRATION'].map((s) => (
                <button key={s} onClick={() => setGuardedState(s as GuardedState)} className={`px-4 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all ${guardedState === s ? 'bg-purple-600 text-white shadow-lg' : 'text-purple-400'}`}>
                    {s.slice(0, 7)}
                </button>
                ))}
            </div>
        </div>
      )}

      <main className="flex-1 flex relative overflow-hidden">
        <div className="flex-1 flex flex-col relative pb-[85px] md:pb-0">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.03),transparent_70%)] pointer-events-none" />
           {currentMode === AppMode.DIRECT_CHAT && <ChatInterface activeArchetype={activeArchetype} language={language} currentLore={lore} eightfoldMode={eightfoldMode} guardedState={guardedState} />}
           {currentMode === AppMode.COUNCIL_SESSION && <CouncilSession language={language} currentStats={stats} currentLore={lore} onIntegrate={handleScribeUpdate} eightfoldMode={eightfoldMode} guardedState={guardedState} />}
           {currentMode === AppMode.STATS && <StatsInterface language={language} stats={stats} />}
           {currentMode === AppMode.WORLD_MAP && <WorldMapInterface mapData={mapData} />}
           {currentMode === AppMode.CALENDAR && <CalendarInterface language={language} events={stats.calendarEvents} onAddEvent={(e) => setStats(p => ({...p, calendarEvents: [...p.calendarEvents, e]}))} onRemoveEvent={(id) => setStats(p => ({...p, calendarEvents: p.calendarEvents.filter(e => e.id !== id)}))} onEditEvent={(e) => setStats(p => ({...p, calendarEvents: p.calendarEvents.map(ev => ev.id === e.id ? e : ev)}))} />}
           {currentMode === AppMode.FINANCE && <FinanceInterface language={language} finances={stats.finances} onAddTransaction={(t) => setStats(p => ({...p, finances: {...p.finances, transactions: [t, ...p.finances.transactions], balance: p.finances.balance + (t.type === 'INCOME' ? t.amount : -t.amount)}}))} onEditTransaction={() => {}} onRemoveTransaction={() => {}} onUpdateBalance={(b) => setStats(p => ({...p, finances: {...p.finances, balance: b}}))} />}
        </div>
      </main>

      {/* MOBILE NAV */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 h-16 bg-[#0f0716]/95 backdrop-blur-xl border border-purple-500/20 rounded-2xl z-50 flex items-center justify-around px-2 shadow-2xl">
         {navItems.map(item => (
             <button key={item.mode} onClick={() => setCurrentMode(item.mode)} className={`p-3 transition-all relative ${currentMode === item.mode ? 'text-purple-400' : 'text-purple-500/40'}`}>
                {currentMode === item.mode && <div className="absolute inset-0 bg-purple-500/10 rounded-xl blur-md" />}
                <item.icon size={22} className="relative z-10" />
             </button>
         ))}
      </div>

      {/* FAB Modus-Umschalter - Noch höher positioniert */}
      <button 
        onClick={() => setEightfoldMode(m => m === 'OG' ? 'GUARDED' : 'OG')}
        className="md:hidden fixed bottom-56 right-6 w-14 h-14 rounded-full bg-purple-600 shadow-[0_0_30px_rgba(147,51,234,0.6)] border border-purple-400/40 flex items-center justify-center z-[60] text-white active:scale-90 transition-transform hover:scale-105"
      >
        {eightfoldMode === 'OG' ? <Zap size={24} /> : <ShieldCheck size={24} />}
      </button>

      {/* --- VOICE SELECTOR OVERLAY --- */}
      {showVoiceSelector && (
          <div className="fixed inset-0 z-[100] bg-[#0a0510]/98 backdrop-blur-3xl flex flex-col animate-fade-in">
              <div className="flex justify-between items-center p-6 border-b border-white/5">
                  <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-purple-900/30 border border-purple-500/20">
                        <Zap size={16} className="text-purple-400" />
                      </div>
                      <h2 className="text-lg font-bold uppercase tracking-widest text-white">Voice Selection</h2>
                  </div>
                  <button onClick={() => setShowVoiceSelector(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
                    <X size={24} />
                  </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
                  <div className="mb-12 transform scale-125 md:scale-150 transition-transform">
                      <RoundTable activeArchetype={activeArchetype} onSelectArchetype={setActiveArchetype} language={language} mini={false} />
                  </div>
                  <div className="text-center animate-fade-in-up mt-8">
                      <h3 className="text-3xl font-bold text-white uppercase tracking-[0.2em] mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-100 to-purple-400">{archetypes[activeArchetype].name}</h3>
                      <p className="text-sm text-purple-300/80 leading-relaxed mb-8 font-light italic">"{archetypes[activeArchetype].description}"</p>
                      <button onClick={() => setShowVoiceSelector(false)} className="w-full py-5 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-bold rounded-2xl uppercase tracking-widest shadow-xl shadow-purple-900/40 active:scale-95 transition-all">
                        Initialize Synchronicity
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
