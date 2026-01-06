
import React, { useState, useEffect } from 'react';
import { RoundTable } from './components/RoundTable';
import { ChatInterface } from './components/ChatInterface';
import { CouncilSession } from './components/CouncilSession';
import { StatsInterface } from './components/StatsInterface'; 
import { LandingScreen } from './components/LandingScreen';
import { LoginScreen } from './components/LoginScreen';
import { getUIText, getArchetypes } from './config/loader';
import { ArchetypeId } from './constants';
import { Language, UserStats, ScribeAnalysis } from './types';
import { getCurrentUser, loadUserLore, saveUserLore, loadUserStats, saveUserStats, setAuthErrorHandler } from './services/userService';
import { MessageSquare, ScrollText, Globe, LayoutDashboard, X, ChevronUp } from 'lucide-react';

enum AppMode {
  DIRECT_CHAT = 'DIRECT_CHAT',
  COUNCIL_SESSION = 'COUNCIL_SESSION',
  STATS = 'STATS',
}

// --- Helper for Smart Merging ---
// This ensures that if we update the code (config), those new items are added to the user's local storage data
// without overwriting their runtime changes.
const mergeArrays = <T extends { [key: string]: any }>(initial: T[], saved: T[], key: string): T[] => {
    if (!Array.isArray(saved)) return initial;
    if (!Array.isArray(initial)) return saved;
    
    const savedIds = new Set(saved.map(i => i[key]));
    const initialOnly = initial.filter(i => !savedIds.has(i[key]));
    // Return saved items (preserving user state) + new items from code (updates)
    return [...saved, ...initialOnly];
};

const mergeStrings = (initial: string[], saved: string[]): string[] => {
    if (!Array.isArray(saved)) return initial;
    return Array.from(new Set([...initial, ...saved]));
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getCurrentUser());
  const [hasEntered, setHasEntered] = useState(false);
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.DIRECT_CHAT);
  const [activeArchetype, setActiveArchetype] = useState<ArchetypeId>(ArchetypeId.SOVEREIGN);
  const [language, setLanguage] = useState<Language>('EN');
  
  // Mobile specific state
  const [showMobileArchetypes, setShowMobileArchetypes] = useState(false);

  // Get current user
  const currentUser = getCurrentUser();

  // --- Persistent State for Lifelong System (Per-User Scoped) ---
  
  const [lore, setLore] = useState<string>(() => {
    if (!currentUser) return '';
    return loadUserLore(currentUser.id);
  });

  const [stats, setStats] = useState<UserStats>(() => {
    if (!currentUser) {
      return {
        title: '',
        level: '',
        state: '',
        currentQuest: '',
        attributes: [],
        milestones: [],
        inventory: [],
        calendarEvents: [],
      };
    }
    const saved = loadUserStats(currentUser.id);
    return saved;
  });

  // Save changes to persistence (per-user scoped)
  useEffect(() => { 
    if (currentUser) {
      saveUserLore(currentUser.id, lore);
    }
  }, [lore, currentUser]);

  useEffect(() => { 
    if (currentUser) {
      saveUserStats(currentUser.id, stats);
    }
  }, [stats, currentUser]);

  // --- Data Manipulation Handlers ---
  const handleScribeUpdate = (updates: ScribeAnalysis) => {
    if (updates.newLoreEntry) {
        setLore(prev => prev + `\n\n[SCRIBE ENTRY ${new Date().toLocaleDateString()}]: ${updates.newLoreEntry}`);
    }
    setStats(prev => {
        let newStats = { ...prev };
        if (updates.updatedQuest) newStats.currentQuest = updates.updatedQuest;
        if (updates.updatedState) newStats.state = updates.updatedState;
        if (updates.newMilestone) {
            newStats.milestones = [updates.newMilestone, ...prev.milestones];
        }
        if (updates.newAttribute) {
            newStats.attributes = [updates.newAttribute, ...prev.attributes];
        }
        return newStats;
    });
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    // Reload user data after login
    const user = getCurrentUser();
    if (user) {
      setLore(loadUserLore(user.id));
      setStats(loadUserStats(user.id));
    }
  };

  const handleAuthError = () => {
    // Clear auth state and force re-login
    setIsAuthenticated(false);
    setHasEntered(false);
  };

  // Register auth error handler on mount
  useEffect(() => {
    setAuthErrorHandler(handleAuthError);
    return () => {
      setAuthErrorHandler(() => {}); // Cleanup
    };
  }, []);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'EN' ? 'DE' : 'EN');
  };

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} language={language} />;
  }

  // Show landing screen if not entered
  if (!hasEntered) {
    return <LandingScreen onEnter={() => setHasEntered(true)} />;
  }

  const ui = getUIText(language);
  const activeArchetypeData = getArchetypes(language)[activeArchetype];

  // Navigation Items Config (removed treasury, map, calendar)
  const navItems = [
    { mode: AppMode.DIRECT_CHAT, icon: MessageSquare, label: ui.DIRECT_COUNSEL },
    { mode: AppMode.COUNCIL_SESSION, icon: ScrollText, label: ui.COUNCIL_SESSION },
    { mode: AppMode.STATS, icon: LayoutDashboard, label: ui.BLUEPRINT },
  ];

  const hideSidePanel = currentMode !== AppMode.DIRECT_CHAT && currentMode !== AppMode.COUNCIL_SESSION; 

  return (
    <div className="min-h-screen bg-violet-950 text-violet-100 font-sans selection:bg-purple-500 selection:text-white overflow-hidden flex flex-col h-screen animate-fade-in">
      
      {/* --- HEADER --- */}
      <header className="h-16 shrink-0 border-b border-purple-900/30 bg-[#0f0716]/90 backdrop-blur-xl flex items-center justify-between px-4 md:px-6 sticky top-0 z-50 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
        
        {/* Logo / Mobile Archetype Toggle */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowMobileArchetypes(true)}
            className="w-10 h-10 relative flex items-center justify-center group cursor-pointer transition-transform hover:scale-105 active:scale-95 md:cursor-default"
          >
            <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-md group-hover:bg-purple-500/30 transition-all duration-500"></div>
            <div className="w-full h-full border border-purple-500/30 rounded-full animate-spin-slow"></div>
            <div className="absolute w-[70%] h-[70%] border border-purple-400/50 rounded-full rotate-45"></div>
            <div className="absolute w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-pulse-slow"></div>
            
            {/* Mobile Tap Hint */}
            <span className="md:hidden absolute -bottom-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
            </span>
          </button>
          
          <div className="flex flex-col justify-center">
            <h1 className="text-sm md:text-lg font-bold tracking-[0.2em] bg-clip-text text-transparent bg-gradient-to-r from-purple-100 via-fuchsia-200 to-purple-100 uppercase drop-shadow-sm">
              {ui.APP_TITLE}
            </h1>
            <span className="text-[9px] md:text-[10px] text-purple-400/60 tracking-[0.3em] font-light uppercase">{ui.SUBTITLE}</span>
          </div>
        </div>
        
        {/* Desktop Nav & Language */}
        <div className="flex items-center gap-4">
            <button 
                onClick={toggleLanguage}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-950/40 border border-purple-500/20 text-xs font-bold text-purple-200 hover:bg-violet-800 hover:border-purple-500/40 transition-all duration-300"
            >
                <Globe size={14} className="text-purple-400" />
                <span className={language === 'EN' ? 'text-white' : 'text-purple-500/70'}>EN</span>
                <span className="text-purple-700/50">|</span>
                <span className={language === 'DE' ? 'text-white' : 'text-purple-500/70'}>DE</span>
            </button>

            {/* Desktop Navigation (Hidden on Mobile) */}
            <nav className="hidden md:flex items-center gap-1 bg-[#0a0510]/50 p-1.5 rounded-xl border border-purple-500/10 shadow-inner">
                {navItems.map(item => (
                    <button
                        key={item.mode}
                        onClick={() => setCurrentMode(item.mode)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-500 ease-out shrink-0 ${
                        currentMode === item.mode
                            ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)] ring-1 ring-white/10'
                            : 'hover:bg-purple-500/10 text-purple-400 hover:text-purple-200'
                        }`}
                    >
                        <item.icon size={16} />
                        <span className="hidden lg:inline font-medium tracking-wide text-xs">{item.label}</span>
                    </button>
                ))}
            </nav>
        </div>
      </header>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 flex relative overflow-hidden">
        
        {/* Desktop Sidebar (Hidden on Mobile) */}
        <div className={`${hideSidePanel ? 'hidden' : 'hidden md:flex'} w-80 border-r border-purple-900/30 bg-[#0a0510] relative flex-col justify-center overflow-y-auto shadow-[10px_0_30px_rgba(0,0,0,0.3)] z-20`}>
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_left,rgba(124,58,237,0.03),transparent_70%)] pointer-events-none" />
            
            <div className="w-full flex flex-col items-center p-4 z-10 my-auto">
                <RoundTable 
                  activeArchetype={activeArchetype} 
                  onSelectArchetype={setActiveArchetype} 
                  language={language}
                  mini={false}
                />
                
                {/* Active Archetype Details */}
                <div className="mt-8 px-6 text-center z-10 max-w-[280px] group animate-fade-in-up">
                  <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-white tracking-widest uppercase mb-1">
                    {activeArchetypeData.name}
                  </h3>
                  <div className="h-px w-16 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent mx-auto my-3 group-hover:w-32 transition-all duration-700" />
                  <p className="text-xs text-purple-300/80 leading-relaxed font-light tracking-wide">
                    {activeArchetypeData.description}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2 justify-center">
                    {activeArchetypeData.domains.map(d => (
                      <span key={d} className="text-[9px] uppercase tracking-[0.1em] px-2.5 py-1 rounded-full bg-purple-950/50 border border-purple-500/20 text-purple-400 shadow-sm">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
            </div>
        </div>

        {/* Viewport - Content Area */}
        {/* pb-[85px] on mobile ensures content is not hidden behind the bottom dock */}
        <div className="flex-1 flex flex-col relative bg-gradient-to-b from-[#0f0720] via-[#0d061c] to-[#05020a] overflow-hidden pb-[85px] md:pb-0">
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-32 bg-purple-600/5 blur-[100px] pointer-events-none" />
           
           {currentMode === AppMode.DIRECT_CHAT && (
             <ChatInterface activeArchetype={activeArchetype} language={language} currentLore={lore} />
           )}
           {currentMode === AppMode.COUNCIL_SESSION && (
             <CouncilSession 
                language={language} 
                currentStats={stats} 
                currentLore={lore} 
                onIntegrate={handleScribeUpdate} 
             />
           )}
           {currentMode === AppMode.STATS && (
             <StatsInterface language={language} stats={stats} />
           )}
        </div>
      </main>

      {/* --- MOBILE BOTTOM DOCK --- */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 h-[65px] bg-[#0f0716]/90 backdrop-blur-xl border border-purple-500/20 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] z-50 flex items-center justify-between px-2 overflow-hidden ring-1 ring-white/5">
         {navItems.map(item => {
             const isActive = currentMode === item.mode;
             return (
                 <button
                    key={item.mode}
                    onClick={() => setCurrentMode(item.mode)}
                    className={`relative flex-1 h-full flex flex-col items-center justify-center gap-1 transition-all duration-300 group ${isActive ? 'text-white' : 'text-purple-500/50 hover:text-purple-300'}`}
                 >
                    {isActive && <div className="absolute top-0 w-8 h-1 bg-purple-500 rounded-b-full shadow-[0_0_15px_rgba(168,85,247,0.8)] animate-fade-in-up" />}
                    
                    <item.icon 
                        size={20} 
                        strokeWidth={isActive ? 2.5 : 2} 
                        className={`transition-transform duration-300 ${isActive ? 'scale-110 -translate-y-1' : 'group-hover:scale-110'}`} 
                    />
                    
                    <span className={`text-[9px] font-bold uppercase tracking-wider transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-0 scale-0'}`}>
                        {item.label.split(' ')[0]} 
                    </span>
                 </button>
             );
         })}
      </div>

      {/* --- MOBILE ARCHETYPE OVERLAY --- */}
      {showMobileArchetypes && (
          <div className="md:hidden fixed inset-0 z-[60] bg-[#05020a]/95 backdrop-blur-xl animate-fade-in flex flex-col items-center justify-center p-6">
              
              {/* Close Button */}
              <button 
                onClick={() => setShowMobileArchetypes(false)}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={24} />
              </button>

              <div className="flex flex-col items-center space-y-10 w-full max-w-sm">
                  <h2 className="text-xl font-bold text-white uppercase tracking-[0.3em] opacity-80 border-b border-purple-500/30 pb-4">
                      {language === 'DE' ? 'Rat Versammeln' : 'Summon Council'}
                  </h2>

                  <div className="scale-110">
                    <RoundTable 
                        activeArchetype={activeArchetype} 
                        onSelectArchetype={setActiveArchetype} 
                        language={language}
                        mini={false}
                    />
                  </div>

                  {/* Mobile Archetype Info Card */}
                  <div className="bg-[#150a26] border border-purple-500/20 rounded-xl p-6 w-full shadow-2xl animate-fade-in-up">
                      <div className="flex flex-col items-center text-center">
                          <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-amber-200 tracking-widest uppercase mb-2">
                             {activeArchetypeData.name}
                          </h3>
                          <span className="text-[10px] text-purple-400 font-mono tracking-widest uppercase mb-4 border border-purple-500/20 px-2 py-1 rounded">
                             {activeArchetypeData.role}
                          </span>
                          <p className="text-sm text-purple-200/80 leading-relaxed font-light mb-6">
                            {activeArchetypeData.description}
                          </p>
                          
                          <div className="flex flex-wrap justify-center gap-2 mb-6">
                             {activeArchetypeData.domains.slice(0, 3).map(d => (
                                <span key={d} className="text-[9px] bg-purple-900/30 border border-purple-500/20 text-purple-300 px-2 py-1 rounded-md uppercase tracking-wide">
                                    {d}
                                </span>
                             ))}
                          </div>

                          <button 
                            onClick={() => setShowMobileArchetypes(false)}
                            className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold uppercase tracking-widest rounded-lg shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                          >
                             <span>Select & Close</span>
                             <ChevronUp size={16} />
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}
