
import React, { useState, useEffect, useRef } from 'react';
import { startCouncilSession, sendMessageToCouncil, integrateSession } from '../services/aiService';
import { getArchetypes, ArchetypeId, ICON_MAP, getUIText } from '../constants';
import { Play, Sparkles, Send, Download, Save, CheckCircle2, User, RefreshCw, AlertTriangle, Key, ChevronRight, MessageSquare } from 'lucide-react';
import { Language, UserStats, ScribeAnalysis, EightfoldMode, GuardedState, Message } from '../types';
import { getArchetypeTheme } from '../theme/archetypeTheme';

interface DialogueTurn {
  id: string;
  speaker: string;
  content: string;
  isUser?: boolean;
}

interface CouncilSessionProps {
    language: Language;
    currentStats: UserStats;
    currentLore: string;
    onIntegrate: (analysis: ScribeAnalysis) => void;
    eightfoldMode: EightfoldMode;
    guardedState: GuardedState;
}

export const CouncilSession: React.FC<CouncilSessionProps> = ({ 
  language, 
  currentStats, 
  currentLore, 
  onIntegrate,
  eightfoldMode,
  guardedState
}) => {
  const [topic, setTopic] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [history, setHistory] = useState<DialogueTurn[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isIntegrating, setIsIntegrating] = useState(false); 
  const [error, setError] = useState<string | null>(null);
  const [needsKey, setNeedsKey] = useState(false);
  
  const dialogueEndRef = useRef<HTMLDivElement>(null);
  const ui = getUIText(language);
  const archetypes = getArchetypes(language);

  const handleKeySelect = async () => {
    if ((window as any).aistudio) {
        await (window as any).aistudio.openSelectKey();
        setNeedsKey(false);
        setError(null);
    } else {
        setError("AI Studio environment not detected.");
    }
  };

  const parseBufferToTurns = (buffer: string, startIndex: number): DialogueTurn[] => {
    const parts = buffer.split(/\[\[SPEAKER:\s*([A-Z_]+)\]\]/i);
    const turns: DialogueTurn[] = [];
    
    if (parts[0].trim().length > 0 && parts.length > 1) {
        turns.push({ id: `pre-${startIndex}`, speaker: 'SAGE', content: parts[0].trim(), isUser: false });
    }

    for (let i = 1; i < parts.length; i += 2) {
        const speakerId = parts[i].toUpperCase();
        const content = parts[i+1] || '';
        if (content.trim()) {
            turns.push({ id: `stream-${startIndex}-${i}`, speaker: speakerId, content: content.trim(), isUser: false });
        }
    }
    return turns;
  };

  const handleStream = async (streamPromise: Promise<AsyncIterable<{ text: string }>>) => {
    setIsStreaming(true);
    setStreamingContent('');
    setError(null);
    setNeedsKey(false);
    
    try {
        const stream = await streamPromise;
        let buffer = '';
        for await (const chunk of stream) {
            const text = chunk.text;
            if (text) {
                buffer += text;
                setStreamingContent(buffer);
            }
        }
        const newTurns = parseBufferToTurns(buffer, history.length);
        setHistory(prev => [...prev, ...newTurns]);
        setStreamingContent('');
    } catch (err: any) {
        console.error("Council error:", err);
        const errMsg = err?.message || "";
        // Handle auth errors
        if (errMsg.toLowerCase().includes("not authenticated") || errMsg.toLowerCase().includes("session expired")) {
            setError(language === 'DE' ? 'Sitzung abgelaufen. Bitte erneut anmelden.' : 'Session expired. Please sign in again.');
        } else if (errMsg.toLowerCase().includes("permission denied") || errMsg.toLowerCase().includes("not found")) {
            setNeedsKey(true);
            setError(language === 'DE' ? 'API-Schlüssel ungültig oder nicht ausgewählt.' : 'API Key invalid or not selected.');
        } else {
            setError(language === 'DE' ? 'Der Rat wurde durch einen Fehler unterbrochen.' : 'The Council was interrupted by an error.');
        }
    } finally {
        setIsStreaming(false);
    }
  };

  const handleStart = async () => {
    if (!topic.trim()) return;
    setIsSessionActive(true);
    setHistory([{ id: 'init-topic', speaker: 'USER', content: topic, isUser: true }]);
    // Note: eightfoldMode and guardedState are not used in backend API (backend uses its own prompt)
    await handleStream(startCouncilSession(topic, language, currentLore));
  };

  const handleReply = async () => {
    if (!userInput.trim() || isStreaming) return;
    const content = userInput;
    setUserInput('');
    
    // Add user message to history for UI display
    setHistory(prev => [...prev, { id: `user-${Date.now()}`, speaker: 'USER', content: content, isUser: true }]);
    
    // Build conversation history from current history (before adding the new user message)
    // Convert DialogueTurn[] to Message[] format for API
    const conversationHistory: Message[] = history
      .filter(turn => turn.speaker !== 'SYSTEM')
      .map(turn => ({
        id: turn.id,
        role: turn.isUser ? 'user' : 'assistant',
        content: turn.content,
        timestamp: Date.now(),
      }));
    
    await handleStream(sendMessageToCouncil(content, conversationHistory, language, currentLore));
  };

  const handleIntegrateAndAdjourn = async () => {
    if (history.length === 0) { setIsSessionActive(false); return; }
    setIsIntegrating(true);
    setError(null);
    
    try {
      // Convert history to Message format for API
      const sessionHistory: Message[] = history
        .filter(turn => turn.speaker !== 'SYSTEM')
        .map(turn => ({
          id: turn.id,
          role: turn.isUser ? 'user' : 'assistant',
          content: turn.content,
          timestamp: Date.now(),
        }));

      // Call backend integration endpoint
      const analysis = await integrateSession(sessionHistory, topic);
      
      // Call parent handler with analysis
      onIntegrate(analysis);
      
      // Extended delay for the cinematic effect
      setTimeout(() => { 
        setIsIntegrating(false); 
        setIsSessionActive(false); 
        setHistory([]); 
        setTopic(''); 
      }, 2500);
    } catch (error: any) {
      console.error('Integration error:', error);
      const errorMessage = error?.message || error?.toString() || 'Integration failed';
      setError(errorMessage);
      setIsIntegrating(false);
    }
  };

  useEffect(() => { dialogueEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history, streamingContent]);

  const activeTurns = parseBufferToTurns(streamingContent, history.length);
  const displayTurns = [...history, ...activeTurns];

  return (
    <div className="flex flex-col h-full w-full bg-transparent relative overflow-hidden">
      <div className="flex-1 relative flex flex-col items-center min-h-0">
        <div className="w-full h-full max-w-4xl px-6 py-10 overflow-y-auto z-10 scrollbar-thin">
            
            {/* INITIAL STATE: THE THOUGHT CHAMBER */}
            {!isSessionActive && !isIntegrating && (
                <div className="flex flex-col items-center justify-center min-h-[85vh] animate-fade-in py-20">
                    <div className="relative w-64 h-64 mb-16 flex items-center justify-center">
                        <div className="absolute inset-[-40%] bg-purple-600/5 rounded-full blur-[100px] animate-pulse-slow" />
                        <svg className="absolute inset-[-20%] w-[140%] h-[140%] animate-[spin_40s_linear_infinite]">
                            <circle cx="50%" cy="50%" r="48%" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                            <circle cx="50%" cy="50%" r="48%" fill="none" stroke="white" strokeWidth="1.2" strokeDasharray="3 150" className="animate-[dash_3s_ease-in-out_infinite] opacity-40" />
                        </svg>
                        <svg className="absolute inset-[-5%] w-[110%] h-[110%] animate-[spin_25s_linear_infinite_reverse]">
                            <circle cx="50%" cy="50%" r="48%" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" strokeDasharray="10 20" />
                            <circle cx="50%" cy="50%" r="48%" fill="none" stroke="rgba(168,85,247,0.3)" strokeWidth="1" strokeDasharray="40 200" className="animate-[dash_6s_linear_infinite] filter blur-[0.5px]" />
                        </svg>
                        <div className="absolute inset-14 border border-white/5 rounded-full animate-spin-slow opacity-15" />
                        
                        {/* THE SOUL CORE */}
                        <div className="relative w-16 h-16 flex items-center justify-center">
                            <div className="absolute inset-[-50%] bg-purple-500/10 rounded-full blur-3xl animate-[pulse_4s_ease-in-out_infinite]" />
                            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-indigo-600 via-purple-700 to-fuchsia-800 shadow-[0_0_40px_rgba(168,85,247,0.4)] overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent animate-[spin_8s_linear_infinite]" />
                                <div className="absolute top-1 left-2 right-2 h-1/2 bg-gradient-to-b from-white/30 to-transparent rounded-full blur-[1px]" />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full blur-[4px] opacity-80 animate-pulse" />
                            </div>
                            <div className="absolute inset-[-10%] rounded-full border border-purple-400/20 animate-[pulse_3s_ease-in-out_infinite]" />
                        </div>
                    </div>

                    <div className="text-center mb-12 z-20">
                        <h2 className="text-2xl font-light tracking-[0.6em] uppercase text-purple-100/80 mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-purple-400">
                            {ui.AWAITING}
                        </h2>
                        <div className="h-px w-20 bg-gradient-to-r from-transparent via-purple-500/40 to-transparent mx-auto" />
                    </div>

                    <div className="w-full max-w-sm flex flex-col gap-6 z-20">
                        <div className="relative group">
                            <input
                                type="text" value={topic} onChange={(e) => setTopic(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                                placeholder={ui.ENTER_TOPIC_PLACEHOLDER}
                                className="w-full bg-[#150a26]/40 border border-white/10 rounded-2xl px-6 py-5 text-base text-violet-100 outline-none focus:border-purple-500/40 focus:bg-[#1a0c30]/60 shadow-xl transition-all placeholder-purple-400/20"
                            />
                            {topic.trim() && (
                                <button onClick={handleStart} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center justify-center hover:bg-purple-500/40 transition-all animate-fade-in">
                                    <ChevronRight size={20} />
                                </button>
                            )}
                        </div>
                        {topic.trim() && (
                             <button onClick={handleStart} className="w-full py-4 bg-[#150a26]/80 text-amber-400/90 border border-amber-500/20 font-bold uppercase text-[10px] tracking-[0.5em] rounded-xl shadow-lg transition-all hover:bg-amber-500/10 active:scale-[0.98] animate-fade-in">
                                {ui.CONVENE}
                             </button>
                        )}
                    </div>
                </div>
            )}

            {/* CINEMATIC INTEGRATING STATE */}
            {isIntegrating && (
                 <div className="flex flex-col items-center justify-center min-h-[85vh] animate-fade-in py-40 relative">
                    {/* Matrix Lore Background (Subtle) */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none font-mono text-[8px] leading-tight overflow-hidden select-none">
                        {Array.from({length: 40}).map((_, i) => (
                            <div key={i} className="whitespace-nowrap animate-[float_10s_linear_infinite]" style={{ animationDelay: `${i * 0.2}s` }}>
                                {currentLore.repeat(5)}
                            </div>
                        ))}
                    </div>

                    {/* CENTRAL CRYSTAL CORE */}
                    <div className="relative w-64 h-64 mb-16 flex items-center justify-center">
                        <div className="absolute inset-[-40%] bg-emerald-600/10 rounded-full blur-[100px] animate-pulse" />
                        
                        {/* Expanding Synchronization Rings */}
                        <div className="absolute inset-0 border border-emerald-500/20 rounded-full animate-[ping_3s_infinite]" />
                        <div className="absolute inset-[-20%] border border-emerald-500/10 rounded-full animate-[ping_4s_infinite]" />

                        <div className="relative w-20 h-20 flex items-center justify-center">
                            {/* The Core turning Emerald */}
                            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-emerald-400 via-teal-600 to-cyan-800 shadow-[0_0_60px_rgba(16,185,129,0.6)] animate-pulse">
                                <RefreshCw className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/40 animate-spin-slow" size={40} />
                            </div>
                        </div>
                    </div>

                    <div className="text-center z-10">
                        <h2 className="text-sm font-bold tracking-[0.8em] uppercase text-emerald-400/80 mb-2 animate-pulse">
                            {language === 'DE' ? 'INTEGRIERE PROTOKOLL' : 'INTEGRATING PROTOCOL'}
                        </h2>
                        <p className="text-[9px] text-emerald-500/40 uppercase tracking-[0.4em] font-mono">Synchronizing Lifeline Memory...</p>
                    </div>
                </div>
            )}

            {/* ACTIVE SESSION CONTENT */}
            {isSessionActive && !isIntegrating && (
                <div className="space-y-12 pb-32">
                    {displayTurns.map((turn) => {
                        const isUser = turn.isUser;
                        const archetype = !isUser && turn.speaker in archetypes ? archetypes[turn.speaker as ArchetypeId] : null;
                        const Icon = isUser ? User : (archetype ? ICON_MAP[archetype.iconName] : Sparkles);
                        const archetypeTheme = archetype ? getArchetypeTheme(archetype.id as ArchetypeId) : null;
                        const archetypeCssVars = archetypeTheme ? {
                          '--archetype-accent': archetypeTheme.accent,
                          '--archetype-accent-strong': archetypeTheme.accentStrong,
                          '--archetype-glow': archetypeTheme.glow,
                          '--archetype-ring': archetypeTheme.ring,
                          '--archetype-gradient-from': archetypeTheme.gradientFrom,
                          '--archetype-gradient-to': archetypeTheme.gradientTo,
                        } as React.CSSProperties : {};

                        return (
                            <div 
                              key={turn.id} 
                              className={`flex flex-col ${isUser ? 'items-end' : 'items-center'} animate-fade-in-up w-full mb-8 md:mb-12`}
                              data-archetype={!isUser && archetype ? archetype.id : undefined}
                              style={archetypeCssVars}
                            >
                                <div className={`flex items-center gap-2 md:gap-3 mb-3 opacity-80 ${isUser ? 'flex-row-reverse' : ''}`}>
                                    {/* Avatar with Archetype Colors - Uses CSS Variables */}
                                    <div 
                                      className={`p-1.5 md:p-2 rounded-lg border border-white/10 shadow-lg ${isUser ? 'bg-gradient-to-br from-purple-900 to-slate-900' : ''}`}
                                      style={!isUser && archetype ? {
                                        background: `linear-gradient(to bottom right, rgb(var(--archetype-gradient-from)), rgb(var(--archetype-gradient-to)))`,
                                      } : {}}
                                    >
                                        <Icon size={14} className="text-white" strokeWidth={1.5} />
                                    </div>
                                    {/* Speaker Label - Uses CSS Variables */}
                                    <span 
                                      className={`text-[9px] md:text-[10px] font-bold tracking-[0.2em] uppercase ${
                                        isUser ? 'text-purple-300' : ''
                                      }`}
                                      style={!isUser && archetype ? {
                                        color: `rgb(var(--archetype-accent))`,
                                      } : {}}
                                    >
                                        {isUser ? (language === 'DE' ? 'ICH' : 'SELF') : (archetype?.name || turn.speaker)}
                                    </span>
                                </div>
                                {/* Message Card - Original Style */}
                                <div className={`relative max-w-[95%] md:max-w-2xl p-5 md:p-7 rounded-2xl border backdrop-blur-md ${isUser 
                                  ? 'bg-purple-900/10 border-purple-500/20 text-right rounded-tr-none' 
                                  : `bg-[#0f0716]/70 border-white/10 text-center shadow-lg rounded-tl-none`
                                }`}>
                                    {/* Decorative Corner Accents for Archetypes */}
                                    {!isUser && archetype && (
                                        <>
                                            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/20" />
                                            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/20" />
                                            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/20" />
                                            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/20" />
                                        </>
                                    )}
                                    <p className="text-sm md:text-base lg:text-lg leading-relaxed font-serif tracking-wide opacity-90 whitespace-pre-wrap">{turn.content}</p>
                                </div>
                            </div>
                        );
                    })}
                    
                    {error && (
                        <div className="flex flex-col items-center justify-center p-8 bg-red-950/20 border border-red-500/20 rounded-2xl animate-fade-in gap-5 backdrop-blur-md">
                            <AlertTriangle size={40} className="text-red-500/60" />
                            <p className="text-xs font-bold text-center text-red-300 tracking-wider uppercase leading-relaxed max-w-xs">{error}</p>
                            <div className="flex gap-3">
                                {needsKey ? (
                                    <button onClick={handleKeySelect} className="px-6 py-2.5 bg-white text-black rounded-lg font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-gray-100 transition-all active:scale-95">
                                        <Key size={14} /> Select API Key
                                    </button>
                                ) : (
                                    <button onClick={() => {
                                      if (history.length > 1) {
                                        const lastUserMsg = history.filter(t => t.isUser).pop();
                                        if (lastUserMsg) {
                                          const conversationHistory: Message[] = history
                                            .filter(turn => turn.speaker !== 'SYSTEM' && turn.id !== lastUserMsg.id)
                                            .map(turn => ({
                                              id: turn.id,
                                              role: turn.isUser ? 'user' : 'assistant',
                                              content: turn.content,
                                              timestamp: Date.now(),
                                            }));
                                          handleStream(sendMessageToCouncil(lastUserMsg.content, conversationHistory, language, currentLore));
                                        }
                                      } else {
                                        handleStart();
                                      }
                                    }} className="px-6 py-2.5 bg-red-600 text-white rounded-lg font-bold uppercase text-[10px] tracking-widest hover:bg-red-500 transition-all active:scale-95">
                                        Retry Connection
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {isStreaming && !streamingContent && (
                        <div className="flex justify-center p-8">
                            <div className="flex gap-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-500/40 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                                ))}
                            </div>
                        </div>
                    )}
                    <div ref={dialogueEndRef} />
                </div>
            )}
        </div>
      </div>

      {/* INPUT CONTROLS */}
      {isSessionActive && !isIntegrating && (
          <div className="bg-[#0a0510]/95 backdrop-blur-3xl border-t border-white/5 p-6 z-50">
            <div className="max-w-3xl mx-auto flex gap-4 items-end">
                <div className="flex-1 relative group">
                    <textarea 
                        value={userInput} onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleReply();
                          }
                        }}
                        placeholder={isStreaming ? ui.COUNCIL_THINKING : ui.INPUT_COUNCIL_PLACEHOLDER}
                        className="w-full bg-[#150a26]/40 border border-white/5 rounded-xl p-5 text-base text-white outline-none resize-none focus:border-purple-500/30 shadow-inner min-h-[60px] max-h-32 transition-all placeholder-purple-400/20"
                        rows={1} disabled={isStreaming}
                    />
                </div>
                <div className="flex gap-2 shrink-0">
                    <button onClick={handleReply} disabled={!userInput.trim() || isStreaming} className="h-14 w-14 bg-[#150a26]/80 hover:bg-purple-900/40 text-purple-300 border border-white/5 rounded-xl flex items-center justify-center shadow-lg disabled:opacity-20 transition-all active:scale-90">
                        <Send size={22} />
                    </button>
                    <button onClick={handleIntegrateAndAdjourn} disabled={isStreaming} className="h-14 px-6 bg-[#0f0716]/80 hover:bg-emerald-950/30 text-emerald-400 border border-emerald-500/20 rounded-xl font-bold uppercase text-[10px] tracking-[0.3em] flex items-center gap-2 shadow-lg disabled:opacity-20 transition-all active:scale-90">
                        <Save size={18} />
                        <span className="hidden sm:inline">Integrate</span>
                    </button>
                </div>
            </div>
          </div>
      )}

      <style>{`
          @keyframes dash {
              0% { stroke-dashoffset: 1000; }
              100% { stroke-dashoffset: 0; }
          }
      `}</style>
    </div>
  );
};
