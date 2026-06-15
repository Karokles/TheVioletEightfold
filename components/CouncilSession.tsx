
import React, { useState, useEffect, useRef } from 'react';
import { PaywallRequiredError, startCouncilSession, sendMessageToCouncil } from '../services/aiService';
// Note: analyzeSessionForUpdates removed - Scribe functionality can be added back later if needed
import { ArchetypeId, ICON_MAP } from '../constants';
import { getArchetypes, getUIText } from '../config/loader';
import { Play, Sparkles, Send, Save, User, ListChecks, X } from 'lucide-react';
import { Language, UserStats, ScribeAnalysis, Message, MeaningContext } from '../types';
import { getCurrentUser } from '../services/userService';
import { CouncilActionSummary, loadLastCouncilActionSummary, saveLastCouncilActionSummary } from '../services/councilActionSummaryService';
import { analyzePlayfulDiscovery, DiscoveryNotice } from '../services/playfulDiscoveryService';
import { DiscoveryCard } from './DiscoveryCard';
import { TutorialOverlay } from './tutorial/TutorialOverlay';
import { TutorialTrigger } from './tutorial/TutorialTrigger';
import { tutorialEventBus, TutorialId } from '../services/tutorialProgressService';
import { VoiceInputButton } from './VoiceInputButton';
import { PaywallNotice } from './PaywallNotice';

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
    meaningContext: MeaningContext;
    onUserSignal?: (content: string) => void;
    onIntegrate: (analysis: ScribeAnalysis) => void;
}

export const CouncilSession: React.FC<CouncilSessionProps> = ({ language, currentStats, currentLore, meaningContext, onUserSignal, onIntegrate }) => {
  const [topic, setTopic] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [history, setHistory] = useState<DialogueTurn[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isIntegrating, setIsIntegrating] = useState(false); // Scribe State
  const [lastActionSummary, setLastActionSummary] = useState<CouncilActionSummary | null>(null);
  const [showActionSummary, setShowActionSummary] = useState(false);
  const [discoveries, setDiscoveries] = useState<DiscoveryNotice[]>([]);
  const [activeTutorialId, setActiveTutorialId] = useState<TutorialId | null>(null);
  const [paywallMessage, setPaywallMessage] = useState('');
  
  const dialogueEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<DialogueTurn[]>([]);
  const lastCouncilRawRef = useRef('');
  
  // Keep ref in sync with state
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    const user = getCurrentUser();
    if (user?.id) {
      setLastActionSummary(loadLastCouncilActionSummary(user.id));
    }
  }, []);

  const ui = getUIText(language);
  const archetypes = getArchetypes(language);

  const updateTopic = (value: string) => {
    setTopic(value);
    tutorialEventBus.emit({
      type: 'council_topic_words',
      payload: { count: value.trim().split(/\s+/).filter(Boolean).length },
    });
  };

  const updateUserInput = (value: string) => {
    setUserInput(value);
    tutorialEventBus.emit({
      type: 'council_reply_input_words',
      payload: { count: value.trim().split(/\s+/).filter(Boolean).length },
    });
  };

  const appendTopicTranscript = (text: string) => {
    setTopic(prev => {
      const next = `${prev}${prev.trim() ? ' ' : ''}${text}`.trimStart();
      tutorialEventBus.emit({
        type: 'council_topic_words',
        payload: { count: next.trim().split(/\s+/).filter(Boolean).length },
      });
      return next;
    });
  };

  const appendReplyTranscript = (text: string) => {
    setUserInput(prev => {
      const next = `${prev}${prev.trim() ? ' ' : ''}${text}`.trimStart();
      tutorialEventBus.emit({
        type: 'council_reply_input_words',
        payload: { count: next.trim().split(/\s+/).filter(Boolean).length },
      });
      return next;
    });
    textareaRef.current?.focus();
  };

  const parseBufferToTurns = (buffer: string, startIndex: number): DialogueTurn[] => {
    const turns: DialogueTurn[] = [];
    const speakerAliases: Record<string, ArchetypeId | 'MODERATOR'> = {
      MODERATOR: 'MODERATOR',
      SOVEREIGN: ArchetypeId.SOVEREIGN,
      WARRIOR: ArchetypeId.WARRIOR,
      SAGE: ArchetypeId.SAGE,
      LOVER: ArchetypeId.LOVER,
      CREATOR: ArchetypeId.CREATOR,
      CAREGIVER: ArchetypeId.CAREGIVER,
      EXPLORER: ArchetypeId.EXPLORER,
      ALCHEMIST: ArchetypeId.ALCHEMIST,
      SOUVERAEN: ArchetypeId.SOVEREIGN,
      SOUVERÄN: ArchetypeId.SOVEREIGN,
      KRIEGER: ArchetypeId.WARRIOR,
      WEISER: ArchetypeId.SAGE,
      SAGE_DE: ArchetypeId.SAGE,
      LIEBENDER: ArchetypeId.LOVER,
      SCHOEPFER: ArchetypeId.CREATOR,
      SCHÖPFER: ArchetypeId.CREATOR,
      BEWAHRER: ArchetypeId.CAREGIVER,
      ENTDECKER: ArchetypeId.EXPLORER,
      ALCHEMIST_DE: ArchetypeId.ALCHEMIST,
    };

    const normalizeSpeaker = (speaker: string): ArchetypeId | 'MODERATOR' | null => {
      const key = speaker
        .trim()
        .replace(/^DER\s+/i, '')
        .replace(/^DIE\s+/i, '')
        .replace(/\s+/g, '_')
        .toUpperCase();
      return speakerAliases[key] || null;
    };
    
    // First, extract MODERATOR summary if present
    const moderatorMatch = buffer.match(/^MODERATOR:\s*(.+?)(?=\n\[\[SPEAKER:|$)/s);
    if (moderatorMatch) {
      turns.push({
        id: `moderator-${startIndex}`,
        speaker: 'MODERATOR',
        content: moderatorMatch[1].trim(),
        isUser: false
      });
    }

    const speakerPattern = /(?:\[\[\s*SPEAKER\s*:\s*([^\]]+?)\s*\]\]|^\s*(SOVEREIGN|WARRIOR|SAGE|LOVER|CREATOR|CAREGIVER|EXPLORER|ALCHEMIST|SOUVERÄN|SOUVERAEN|KRIEGER|WEISER|LIEBENDER|SCHÖPFER|SCHOEPFER|BEWAHRER|ENTDECKER)\s*:)/gim;
    const matches = Array.from(buffer.matchAll(speakerPattern));

    matches.forEach((match, index) => {
      const speakerId = normalizeSpeaker(match[1] || match[2] || '');
      if (!speakerId || speakerId === 'MODERATOR') return;

      const contentStart = match.index! + match[0].length;
      const contentEnd = matches[index + 1]?.index ?? buffer.length;
      const content = buffer.slice(contentStart, contentEnd).trim();

      if (content) {
        turns.push({
          id: `stream-${startIndex}-${index}`,
          speaker: speakerId,
          content,
          isUser: false
        });
      }
    });

    if (turns.length === 0 && buffer.trim()) {
      turns.push({
        id: `fallback-${startIndex}`,
        speaker: 'CHAMBER',
        content: buffer.trim(),
        isUser: false,
      });
    }
    
    return turns;
  };

  const handleStream = async (streamPromise: Promise<any>, streamKind: 'initial' | 'reply' = 'initial') => {
    setIsStreaming(true);
    setStreamingContent('');
    
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
        
        lastCouncilRawRef.current = buffer;
        const newTurns = parseBufferToTurns(buffer, historyRef.current.length);
        setHistory(prev => [...prev, ...newTurns]);
        setStreamingContent('');
        tutorialEventBus.emit({
          type: streamKind === 'initial' ? 'council_initial_response_received' : 'council_reply_response_received',
          payload: { streamKind },
        });
    } catch (error: any) {
        const errorMessage = error?.message || error?.toString() || 'Unknown error';
        if (error instanceof PaywallRequiredError) {
          setPaywallMessage(errorMessage);
          return;
        }

        console.error("Council error:", error);
        console.error("Full error details:", {
            message: errorMessage,
            stack: error?.stack,
            name: error?.name,
        });
        setHistory(prev => [...prev, { 
            id: `err-${Date.now()}`, 
            speaker: 'SYSTEM', 
            content: language === 'DE' 
                ? `Der Rat wurde durch einen Fehler unterbrochen: ${errorMessage}` 
                : `The council was disrupted: ${errorMessage}`, 
            isUser: false 
        }]);
    } finally {
        setIsStreaming(false);
    }
  };

  const handleStart = async () => {
    if (!topic.trim()) return;
    setPaywallMessage('');
    const startingTopic = topic;
    tutorialEventBus.emit({
      type: 'council_started',
      payload: { topic: startingTopic },
    });
    setIsSessionActive(true);
    setHistory([{
        id: 'init-topic',
        speaker: 'USER',
        content: startingTopic,
        isUser: true
    }]);
    onUserSignal?.(startingTopic);
    const user = getCurrentUser();
    if (user?.id) {
      const notices = analyzePlayfulDiscovery({
        userId: user.id,
        text: startingTopic,
        source: 'council',
        language,
        meaningContext,
      });
      if (notices.length > 0) {
        setDiscoveries(prev => [...prev, ...notices]);
      }
    }
    setTopic(''); 
    
    await handleStream(startCouncilSession(startingTopic, language, currentLore, meaningContext), 'initial');
  };

  const handleReply = async () => {
    if (!userInput.trim() || isStreaming) return;
    setPaywallMessage('');
    
    const content = userInput;
    setUserInput('');
    
    // Use ref to get current history (always up-to-date)
    // sendMessageToCouncil will add the new user message, so we only include previous turns
    const currentHistory = historyRef.current;
    
    // Build conversation history from current history (before adding the new user message)
    const conversationHistory: Message[] = currentHistory
      .filter(turn => turn.speaker !== 'SYSTEM')
      .map(turn => ({
        id: turn.id,
        role: turn.isUser ? 'user' : 'assistant',
        content: turn.content,
        timestamp: Date.now(),
      }));

    // Add user message to history for UI display
    const userTurn: DialogueTurn = {
      id: `user-${Date.now()}`,
      speaker: 'USER',
      content: content,
      isUser: true
    };
    setHistory(prev => [...prev, userTurn]);
    tutorialEventBus.emit({
      type: 'council_reply_sent',
      payload: { length: content.length },
    });
    onUserSignal?.(content);
    const user = getCurrentUser();
    if (user?.id) {
      const notices = analyzePlayfulDiscovery({
        userId: user.id,
        text: content,
        source: 'council',
        language,
        meaningContext,
      });
      if (notices.length > 0) {
        setDiscoveries(prev => [...prev, ...notices]);
      }
    }

    await handleStream(sendMessageToCouncil(content, conversationHistory, language, currentLore, meaningContext), 'reply');
  };

  // --- Meaning Agent Integration Handler ---
  const handleIntegrateAndAdjourn = async () => {
    if (history.length === 0) {
        setIsSessionActive(false);
        return;
    }

    setIsIntegrating(true);

    try {
      const user = getCurrentUser();
      if (user?.id) {
        const fallbackText = history
          .filter(turn => !turn.isUser && turn.speaker !== 'SYSTEM')
          .slice(-2)
          .map(turn => turn.content)
          .join('\n');
        const savedSummary = saveLastCouncilActionSummary(user.id, lastCouncilRawRef.current || fallbackText, language);
        if (savedSummary) {
          setLastActionSummary(savedSummary);
        }
      }

      // Convert history to Message format for API
      const sessionHistory = history
        .filter(turn => turn.speaker !== 'SYSTEM')
        .map(turn => ({
          id: turn.id,
          role: turn.isUser ? 'user' : 'assistant',
          content: turn.content,
          timestamp: Date.now(),
        }));

      // Call meaning agent endpoint
      const { analyzeMeaning } = await import('../services/aiService');
      const meaningResult = await analyzeMeaning(sessionHistory, {
        mode: 'council',
        language,
        userLore: currentLore,
        currentQuestState: {
          title: currentStats.currentQuest,
          state: currentStats.state
        },
        meaningContext,
        persist: true
      });
      
      // Convert MeaningAnalysisResult to ScribeAnalysis for backward compatibility
      const analysis: ScribeAnalysis = {
        newLoreEntry: meaningResult.questLogEntries.length > 0 
          ? meaningResult.questLogEntries[0].content 
          : undefined,
        updatedQuest: meaningResult.nextQuestState?.title || undefined,
        updatedState: meaningResult.nextQuestState?.state || undefined,
        newMilestone: meaningResult.breakthroughs.length > 0 ? {
          id: meaningResult.breakthroughs[0].id,
          title: meaningResult.breakthroughs[0].title,
          date: new Date(meaningResult.breakthroughs[0].createdAt).toISOString().split('T')[0],
          description: meaningResult.breakthroughs[0].insight,
          type: 'BREAKTHROUGH' as const,
          icon: 'Zap'
        } : undefined,
        newAttribute: undefined // Can be enhanced later
      };
      
      // Call parent handler with analysis
      onIntegrate(analysis);
      
      // Close session
      setIsIntegrating(false);
      setIsSessionActive(false);
      setHistory([]);
      setDiscoveries([]);
      setTopic('');
    } catch (error: any) {
      console.error('Integration error:', error);
      // Still close session even if integration fails
      setIsIntegrating(false);
      setIsSessionActive(false);
      setHistory([]);
      setDiscoveries([]);
      setTopic('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleReply();
    }
  };

  useEffect(() => {
    dialogueEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, streamingContent]);

  const activeTurns = parseBufferToTurns(streamingContent, history.length);
  const displayTurns = [...history, ...activeTurns];
  
  const lastTurn = displayTurns.length > 0 ? displayTurns[displayTurns.length - 1] : null;
  const currentSpeakerId = lastTurn && !lastTurn.isUser && lastTurn.speaker in archetypes ? lastTurn.speaker as ArchetypeId : null;
  
  // Heart Visual Logic
  const heartColor = isIntegrating ? "#fbbf24" : "#ff4d4d"; // Gold if integrating, Red if normal
  const heartSpeed = isIntegrating ? '0.2s' : '3s'; // Super fast spin if integrating

  return (
    <div className="flex flex-col h-full w-full bg-transparent relative transition-colors duration-1000 overflow-hidden">
      <div className="absolute left-5 top-5 z-40">
        <TutorialTrigger tutorialId="council_intro" onStart={setActiveTutorialId} />
      </div>
      <TutorialOverlay
        userId={getCurrentUser()?.id}
        language={language}
        tutorialId={activeTutorialId}
        onClose={() => setActiveTutorialId(null)}
      />
      
      {/* Custom Styles for Animation */}
      <style>{`
        @keyframes heartbeat {
            0% { transform: scale(1); filter: brightness(1); }
            15% { transform: scale(1.05); filter: brightness(1.2); }
            30% { transform: scale(1); filter: brightness(1); }
            45% { transform: scale(1.03); filter: brightness(1.1); }
            60% { transform: scale(1); filter: brightness(1); }
            100% { transform: scale(1); filter: brightness(1); }
        }
        @keyframes vein-flow {
            0% { stroke-dashoffset: 100; }
            100% { stroke-dashoffset: 0; }
        }
        @keyframes absorb-data {
            0% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(1.5); opacity: 0.1; }
            100% { transform: scale(0); opacity: 0; }
        }
      `}</style>

      {lastActionSummary && (
        <div className="absolute right-5 top-5 z-40">
          <button
            onClick={() => setShowActionSummary(prev => !prev)}
            className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/70 shadow-[0_0_24px_rgba(255,255,255,0.04)] backdrop-blur-md transition-all hover:border-white/25 hover:bg-white/[0.08] hover:text-white"
            title={language === 'DE' ? 'Letzte Aktionszusammenfassung anzeigen' : 'Show last action summary'}
          >
            <ListChecks size={14} className="text-white/75 transition-colors group-hover:text-white" />
            <span className="hidden sm:inline">{language === 'DE' ? 'Letzte Aktion' : 'Last Action'}</span>
          </button>

          {showActionSummary && (
            <div className="absolute right-0 mt-3 w-[min(340px,calc(100vw-2rem))] rounded-xl border border-white/12 bg-[#09040f]/85 p-4 text-left shadow-[0_18px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl animate-fade-in">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">{lastActionSummary.title}</span>
                <button
                  onClick={() => setShowActionSummary(false)}
                  className="rounded-full p-1 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
                  title={language === 'DE' ? 'Schließen' : 'Close'}
                >
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-2">
                {lastActionSummary.lines.map((line, index) => (
                  <div key={`${line}-${index}`} className="border-l border-white/15 pl-3 text-sm leading-6 text-white/90">
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4D Warp Field Background */}
      <div className={`absolute inset-0 transition-opacity duration-1000 pointer-events-none overflow-hidden ${isSessionActive ? 'opacity-40' : 'opacity-20'}`}>
         {/* Tesseract Grid Simulation */}
         <div className="absolute inset-[-50%] w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,rgba(76,29,149,0.15)_0%,transparent_70%)] animate-spin-slow" />
         <div className="absolute inset-[-50%] w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,rgba(192,38,211,0.1)_0%,transparent_60%)] animate-spin-slow-reverse" style={{ animationDuration: '40s' }} />
         
         {/* Moving Warp Lines */}
         <div className="absolute inset-0 opacity-20 animate-warp">
            <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(transparent_0%,rgba(139,92,246,0.1)_50%,transparent_100%)] bg-[length:100%_4px]" />
         </div>
      </div>

      {/* Main Stage */}
      <div className="flex-1 relative flex flex-col items-center min-h-0">
        
        {/* Dialogue Scroll Area */}
        <div data-tutorial-id="council-thread" className="w-full h-full max-w-4xl px-6 py-10 overflow-y-auto z-10 pb-40 scroll-smooth">
            {(!isSessionActive || isIntegrating) && (
                <div className="flex flex-col items-center justify-center h-full pt-44 md:pt-48 pb-20 space-y-10 md:space-y-20 animate-fade-in relative perspective-1000">
                    
                    {/* The Artifact (Gimbal + Heart) */}
                    {/* Resized for mobile: w-[180px] vs w-[240px] */}
                    <div className="relative w-[180px] h-[180px] md:w-[240px] md:h-[240px] flex items-center justify-center transform-gpu preserve-3d animate-float">
                        
                        {/* Ring 1 - Outer - Z Axis Spin (Slow) */}
                        <div className={`absolute inset-0 flex items-center justify-center ${isIntegrating ? 'animate-[spin_1s_linear_infinite]' : 'animate-[spin_30s_linear_infinite]'}`}>
                            <div className={`w-[170px] h-[170px] md:w-[220px] md:h-[220px] rounded-full border ${isIntegrating ? 'border-amber-400/50 shadow-[0_0_40px_rgba(251,191,36,0.3)]' : 'border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.05)]'}`}></div>
                        </div>

                        {/* Ring 2 - Middle - X/Y Axis Spin - Solid Glowing White */}
                        <div className={`absolute inset-0 flex items-center justify-center ${isIntegrating ? 'animate-[spin_2s_linear_infinite_reverse]' : 'animate-[spin_20s_linear_infinite_reverse]'}`}>
                             <div className={`w-[140px] h-[140px] md:w-[180px] md:h-[180px] rounded-full border ${isIntegrating ? 'border-amber-400/40' : 'border-white/30'} shadow-[0_0_15px_rgba(255,255,255,0.1)]`} style={{ transform: 'rotateX(70deg)' }}></div>
                        </div>
                        
                        {/* Ring 3 - Inner - Off-Axis Spin - Solid Glowing White */}
                        <div className={`absolute inset-0 flex items-center justify-center ${isIntegrating ? 'animate-[spin_1s_linear_infinite]' : 'animate-[spin_15s_linear_infinite]'}`}>
                             <div className={`w-[110px] h-[110px] md:w-[140px] md:h-[140px] rounded-full border ${isIntegrating ? 'border-amber-400/60' : 'border-white/40'} shadow-[0_0_10px_rgba(255,255,255,0.2)]`} style={{ transform: 'rotateY(70deg)' }}></div>
                        </div>
                        
                        {/* Central Organic Core */}
                        <div className="relative z-10 flex items-center justify-center">
                            {/* Inner Glow "Soul" */}
                            <div className={`absolute w-12 h-12 md:w-16 md:h-16 blur-xl rounded-full animate-pulse transition-colors duration-1000 ${isIntegrating ? 'bg-amber-500/50' : 'bg-red-600/20'}`} style={{ animationDuration: '4s' }}></div>
                            
                            {/* Data Absorption Effect (Only when integrating) */}
                            {isIntegrating && (
                                <>
                                    <div className="absolute inset-0 border border-amber-400 rounded-full animate-[absorb-data_1s_infinite]"></div>
                                    <div className="absolute inset-[-20px] border border-amber-200 rounded-full animate-[absorb-data_1s_infinite]" style={{ animationDelay: '0.3s' }}></div>
                                </>
                            )}

                            {/* Crystalline Cyber-Heart SVG */}
                            <div className="relative w-12 h-12 md:w-16 md:h-16 drop-shadow-[0_0_20px_rgba(220,38,38,0.5)]" style={{ animation: `heartbeat ${heartSpeed} infinite ease-in-out` }}>
                                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible transition-colors duration-1000">
                                    <defs>
                                        <linearGradient id="crystalGrad" x1="0" y1="0" x2="1" y2="1">
                                            <stop offset="0%" stopColor={isIntegrating ? "#fbbf24" : "#ff4d4d"} />
                                            <stop offset="50%" stopColor={isIntegrating ? "#b45309" : "#800000"} />
                                            <stop offset="100%" stopColor={isIntegrating ? "#78350f" : "#300000"} />
                                        </linearGradient>
                                    </defs>

                                    {/* Geometric Heart Shape (Low Poly) */}
                                    <g stroke={isIntegrating ? "#fcd34d" : "#ff9999"} strokeWidth="0.2" fill="url(#crystalGrad)" className="opacity-95">
                                        <path d="M50 90 L20 50 L20 30 L50 15 L80 30 L80 50 Z" />
                                        <path d="M50 90 L20 50 L50 60 L80 50 Z" fillOpacity="0.5" />
                                        <path d="M20 50 L20 30 L50 60 Z" fillOpacity="0.6" />
                                        <path d="M80 50 L80 30 L50 60 Z" fillOpacity="0.6" />
                                        <path d="M20 30 L50 15 L50 60 Z" fillOpacity="0.8" />
                                        <path d="M80 30 L50 15 L50 60 Z" fillOpacity="0.8" />
                                    </g>

                                    {/* Walking Glow Veins - White Energy Flowing */}
                                    <g>
                                        {/* Left Artery */}
                                        <path d="M25 35 Q 35 45 50 60" stroke="white" strokeWidth="1" strokeLinecap="round" fill="none"
                                              strokeDasharray="5 15" className="opacity-80" style={{ animation: 'vein-flow 1s linear infinite' }} />
                                        
                                        {/* Right Artery */}
                                        <path d="M75 35 Q 65 45 50 60" stroke="white" strokeWidth="1" strokeLinecap="round" fill="none"
                                              strokeDasharray="5 15" className="opacity-80" style={{ animation: 'vein-flow 1.5s linear infinite reverse' }} />
                                        
                                        {/* Center Vertical */}
                                        <path d="M50 15 L 50 90" stroke="white" strokeWidth="0.5" strokeLinecap="round" fill="none"
                                              strokeDasharray="10 20" className="opacity-60" style={{ animation: 'vein-flow 2s linear infinite' }} />
                                    </g>
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Invitation Card OR Integration Status */}
                    <div className="relative group cursor-default max-w-[340px] w-full animate-float" style={{ animationDelay: '1s' }}>
                        
                        {/* Mystical Fog Effect Behind */}
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160%] h-[160%] blur-[50px] rounded-full pointer-events-none opacity-80 ${isIntegrating ? 'bg-amber-900/40' : 'bg-[#0a0510]'}`} />
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] blur-[40px] rounded-full pointer-events-none ${isIntegrating ? 'bg-amber-600/20' : 'bg-purple-900/20'}`} />
                        
                        {/* Card Container */}
                        <div className="relative p-8 bg-transparent text-center space-y-4 relative z-10 transition-all duration-500">
                                <div className={`text-[9px] uppercase tracking-[0.4em] font-light ${isIntegrating ? 'text-amber-300' : 'text-purple-400/50'}`}>
                                    {isIntegrating ? (language === 'DE' ? 'Lazarus Protokoll' : 'Lazarus Protocol') : ui.CHAMBER_TITLE}
                                </div>
                                
                                <h2 className={`text-xl font-light tracking-[0.2em] uppercase opacity-90 drop-shadow-[0_0_15px_rgba(255,255,255,0.15)] ${isIntegrating ? 'text-amber-100' : 'text-violet-100'}`}>
                                    {isIntegrating ? (language === 'DE' ? 'Kristallisierung...' : 'Crystallizing Memory...') : ui.AWAITING}
                                </h2>

                                {!isIntegrating && lastActionSummary && (
                                  <div className="pt-3 space-y-2">
                                    {lastActionSummary.lines.slice(0, 3).map((line, index) => (
                                      <p
                                        key={`${line}-${index}`}
                                        className="text-[12px] leading-5 text-white/75 drop-shadow-[0_0_14px_rgba(255,255,255,0.22)] animate-pulse-slow"
                                        style={{ animationDelay: `${index * 0.7}s`, animationDuration: '5s' }}
                                      >
                                        {line}
                                      </p>
                                    ))}
                                  </div>
                                )}
                        </div>
                    </div>
                </div>
            )}

            {isSessionActive && displayTurns.length === 0 && (
                 <div className="flex flex-col items-center justify-center h-64 text-purple-400 space-y-6 animate-pulse-slow">
                    <div className="relative w-16 h-16 animate-spin-slow">
                        <div className="absolute inset-0 border border-purple-500/50 rounded-full" />
                        <div className="absolute inset-0 border-t-2 border-white rounded-full" />
                    </div>
                    <p className="text-xs tracking-[0.3em] uppercase opacity-70">{ui.SUMMONING}</p>
                </div>
            )}

            {/* Render Turns */}
            {!isIntegrating && displayTurns.map((turn, idx) => {
                const isSystem = turn.speaker === 'SYSTEM';
                const isUser = turn.isUser;
                const isChamber = !isUser && (turn.speaker === 'MODERATOR' || turn.speaker === 'CHAMBER');
                const archetype = !isUser && turn.speaker in archetypes ? archetypes[turn.speaker as ArchetypeId] : null;
                
                const color = archetype ? archetype.color : (isChamber ? 'from-violet-500 to-sky-400' : 'from-slate-600 to-slate-500');
                const name = isUser
                  ? (language === 'DE' ? 'DU' : 'YOU')
                  : (archetype ? archetype.name : (isChamber ? (language === 'DE' ? 'KAMMER' : 'CHAMBER') : turn.speaker));
                const Icon = isUser ? User : (archetype ? ICON_MAP[archetype.iconName] : Sparkles);

                if (isSystem) return <div key={turn.id} className="text-center text-red-400/70 text-xs tracking-wide py-4">{turn.content}</div>;

                return (
                    <div key={turn.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-center'} mb-12 animate-fade-in-up transition-all group`}>
                        {/* Speaker Label */}
                        <div className={`flex items-center gap-2 mb-4 opacity-80 ${isUser ? 'flex-row-reverse' : ''}`}>
                            <div className={`p-1.5 rounded-full bg-gradient-to-br ${isUser ? 'from-purple-900 to-slate-900' : color} shadow-[0_0_10px_rgba(0,0,0,0.5)] border border-white/10`}>
                                <Icon size={14} className="text-white" />
                            </div>
                            <span className={`text-[10px] font-bold tracking-[0.2em] uppercase ${isUser ? 'text-purple-300' : 'text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200'}`}>
                                {name}
                            </span>
                        </div>
                        
                        {/* Content Card */}
                        <div className={`relative max-w-2xl p-8 rounded-sm shadow-2xl backdrop-blur-md transition-all duration-500 border
                            ${isUser 
                                ? 'bg-purple-900/10 border-purple-500/20 text-right text-purple-100' 
                                : 'bg-[#0f0716]/60 border-white/5 text-center text-gray-200 hover:border-purple-500/20'
                            }`}>
                            
                            {/* Decorative Corner Accents for Archetypes */}
                            {!isUser && (
                                <>
                                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-purple-500/30" />
                                    <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-purple-500/30" />
                                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-purple-500/30" />
                                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-purple-500/30" />
                                </>
                            )}

                            <p className="text-lg leading-8 font-light font-serif tracking-wide opacity-90 whitespace-pre-wrap">
                                {turn.content}
                            </p>
                        </div>
                        
                        {/* Divider between turns */}
                        {!isUser && idx < displayTurns.length - 1 && (
                            <div className="h-8 w-px bg-gradient-to-b from-purple-500/20 to-transparent mt-8" />
                        )}
                    </div>
                );
            })}

            {!isIntegrating && discoveries.map(notice => (
              <DiscoveryCard
                key={notice.id}
                notice={notice}
                onDismiss={() => setDiscoveries(prev => prev.filter(item => item.id !== notice.id))}
              />
            ))}
            
            {/* Custom Mystic Spinner Loading Indicator */}
            {isStreaming && !currentSpeakerId && (
                <div className="flex flex-col items-center justify-center py-8 gap-3 animate-fade-in">
                     <div className="relative w-8 h-8">
                         {/* Spinning Outer Ring */}
                         <div className="absolute inset-0 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin"></div>
                         {/* Counter-Spinning Inner Ring */}
                         <div className="absolute inset-2 border-2 border-purple-500/10 border-b-purple-400/50 rounded-full animate-spin-slow-reverse"></div>
                         {/* Pulsing Core */}
                         <div className="absolute inset-0 flex items-center justify-center">
                             <div className="w-1.5 h-1.5 bg-purple-300 rounded-full animate-pulse shadow-[0_0_10px_rgba(216,180,254,0.8)]"></div>
                         </div>
                     </div>
                </div>
            )}
            
            <div ref={dialogueEndRef} />
        </div>

        {/* Floating Active Speaker Indicator */}
        {currentSpeakerId && isStreaming && (
            <div className="absolute bottom-32 right-8 z-30 animate-fade-in-up">
                <div className={`pl-3 pr-5 py-2.5 bg-[#0f0716]/90 border-l-2 border-purple-500 rounded-r-lg flex items-center gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-md`}>
                    <div className={`relative w-2 h-2 rounded-full bg-gradient-to-r ${archetypes[currentSpeakerId].color} animate-ping`} />
                    <div className="flex flex-col">
                        <span className="text-[9px] text-purple-400 uppercase tracking-wider">Now Speaking</span>
                        <span className="text-xs font-bold text-white tracking-wide">{archetypes[currentSpeakerId].name}</span>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Control Panel (Footer) */}
      {!isIntegrating && (
          <div className="bg-[#0f0716] border-t border-purple-900/20 p-6 z-20 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] shrink-0">
            {paywallMessage && (
              <div className="mx-auto mb-4 max-w-3xl">
                <PaywallNotice
                  language={language}
                  message={paywallMessage}
                  onClose={() => setPaywallMessage('')}
                />
              </div>
            )}
            {!isSessionActive ? (
                <div className="max-w-2xl mx-auto flex flex-col gap-3">
                    <label className="text-[10px] font-bold text-purple-500/70 uppercase tracking-[0.2em] ml-2">
                        {language === 'DE' ? 'Thema Initiieren' : 'Initiate Topic'}
                    </label>
                    <div className="flex gap-0 shadow-lg rounded-xl overflow-hidden ring-1 ring-purple-500/20 bg-[#150a26]">
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => {
                              updateTopic(e.target.value);
                            }}
                            data-tutorial-id="council-topic-input"
                            placeholder={ui.ENTER_TOPIC_PLACEHOLDER}
                            className="flex-1 bg-transparent border-none px-6 py-4 text-violet-100 placeholder-violet-500/30 focus:ring-0 outline-none transition-all"
                            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                        />
                        <button
                            onClick={handleStart}
                            data-tutorial-id="council-start"
                            disabled={!topic.trim()}
                            className="px-8 bg-purple-900/40 hover:bg-purple-800/60 text-purple-200 border-l border-purple-500/10 transition-colors flex items-center justify-center disabled:opacity-50"
                        >
                            <Play size={18} fill="currentColor" className={topic.trim() ? "text-purple-400" : "text-purple-800"} />
                        </button>
                        <VoiceInputButton
                            language={language}
                            disabled={isStreaming}
                            onTranscript={appendTopicTranscript}
                        />
                    </div>
                </div>
            ) : (
                <div className="max-w-3xl mx-auto flex gap-4 items-end">
                    <div className="relative flex-1 bg-[#150a26] border border-purple-500/10 rounded-2xl focus-within:border-purple-500/40 transition-all shadow-inner">
                        <textarea 
                            ref={textareaRef}
                            value={userInput}
                            onChange={(e) => {
                              updateUserInput(e.target.value);
                            }}
                            onKeyDown={handleKeyDown}
                            data-tutorial-id="council-reply-input"
                            placeholder={isStreaming ? ui.COUNCIL_THINKING : ui.INPUT_COUNCIL_PLACEHOLDER}
                            className="w-full bg-transparent border-none text-violet-100 placeholder-violet-500/30 focus:ring-0 resize-none max-h-32 py-4 px-5 leading-relaxed text-sm disabled:opacity-30"
                            rows={1}
                            disabled={isStreaming}
                        />
                    </div>
                    <VoiceInputButton
                        language={language}
                        disabled={isStreaming}
                        onTranscript={appendReplyTranscript}
                    />
                    
                    <button 
                        onClick={handleReply}
                        data-tutorial-id="council-reply-send"
                        disabled={!userInput.trim() || isStreaming}
                        className="h-12 w-12 flex items-center justify-center bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-[0_0_15px_rgba(147,51,234,0.3)] disabled:opacity-20 disabled:shadow-none transition-all duration-300"
                    >
                        {isStreaming ? <Sparkles className="animate-spin" size={20} /> : <Send size={20} />}
                    </button>

                    <button 
                        onClick={handleIntegrateAndAdjourn}
                        data-tutorial-id="council-integrate"
                        className="h-12 flex items-center gap-2 px-4 bg-[#150a26] hover:bg-purple-900/20 text-purple-400 hover:text-white border border-purple-500/20 hover:border-purple-500/50 rounded-xl transition-all shadow-lg"
                        title={ui.ADJOURN_TITLE}
                    >
                        <Save size={18} />
                        <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">{language === 'DE' ? 'Integrieren' : 'Integrate'}</span>
                    </button>
                </div>
            )}
          </div>
      )}
    </div>
  );
};
