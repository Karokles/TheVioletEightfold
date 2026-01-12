
import React, { useState, useRef, useEffect } from 'react';
import { Message, ChatStatus, Language, EightfoldMode, GuardedState } from '../types';
import { ArchetypeId, getArchetypes, ICON_MAP, getUIText } from '../constants';
import { sendMessageToArchetype } from '../services/aiService';
import { Send, Sparkles, Bot } from 'lucide-react';
import { getArchetypeTheme } from '../theme/archetypeTheme';

interface ChatInterfaceProps {
  activeArchetype: ArchetypeId;
  language: Language;
  currentLore: string;
  eightfoldMode: EightfoldMode;
  guardedState: GuardedState;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  activeArchetype, 
  language, 
  currentLore,
  eightfoldMode,
  guardedState
}) => {
  const archetypes = getArchetypes(language);
  const currentArchetypeData = archetypes[activeArchetype];
  const ui = getUIText(language);

  const getInitMessage = (): Message => ({
    id: `init-${activeArchetype}-${Date.now()}`,
    role: 'model',
    content: language === 'DE' 
        ? `Ich bin ${currentArchetypeData.name}. Wie kann ich dich heute unterstützen?`
        : `I am ${currentArchetypeData.name}. How can I assist you today?`,
    timestamp: Date.now(),
    archetypeId: activeArchetype
  });

  const [messages, setMessages] = useState<Message[]>([getInitMessage()]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<ChatStatus>(ChatStatus.IDLE);
  const [streamingContent, setStreamingContent] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cancel any pending request when archetype changes
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setMessages([getInitMessage()]);
    setStatus(ChatStatus.IDLE);
    setInput(''); // Clear input as well
  }, [activeArchetype, language]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = async () => {
    if (!input.trim() || status !== ChatStatus.IDLE) return;

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    const userInput = input;
    setInput('');
    setStatus(ChatStatus.THINKING);

    try {
      // Build conversation history from existing messages (excluding the init message)
      // Filter by current archetype to ensure per-archetype isolation
      const initMsgId = `init-${activeArchetype}-${Date.now()}`;
      const conversationHistory: Message[] = messages
        .filter(msg => msg.id !== initMsgId && msg.archetypeId === activeArchetype)
        .map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
        }));

      const stream = await sendMessageToArchetype(
          activeArchetype, 
          userInput, 
          language, 
          currentLore,
          conversationHistory
      );
      
      setStatus(ChatStatus.STREAMING);
      let fullContent = '';
      
      // Stream response from backend (returns { text: string } chunks)
      // CRITICAL: In DIRECT mode, response is plain text - NO [[SPEAKER]] parsing
      for await (const chunk of stream) {
        // Check if request was aborted
        if (abortController.signal.aborted) {
          return;
        }

        const text = chunk.text;
        if (text) {
          fullContent += text;
          setStreamingContent(fullContent);
        }
      }
      
      // Validate response is plain text (no council structure in direct mode)
      // Log warning if council structure detected (dev only)
      if (import.meta.env.DEV) {
        if (fullContent.includes('[[SPEAKER:') || fullContent.includes('MODERATOR:') || fullContent.includes('SOVEREIGN DECISION:')) {
          console.warn('[DIRECT CHAT] WARNING: Response contains council structure!', {
            hasSpeakerTags: fullContent.includes('[[SPEAKER:'),
            hasModerator: fullContent.includes('MODERATOR:'),
            hasSovereignDecision: fullContent.includes('SOVEREIGN DECISION:'),
            archetype: activeArchetype,
          });
        }
      }

      // Clear abort controller on success
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }

      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: fullContent,
        timestamp: Date.now(),
        archetypeId: activeArchetype
      };

      setMessages(prev => [...prev, modelMsg]);
      setStreamingContent('');
      setStatus(ChatStatus.IDLE);
    } catch (error: any) {
      // Ignore abort errors
      if (error.name === 'AbortError' || abortController.signal.aborted) {
        return;
      }

      console.error('Chat error:', error);
      const errorMessage = error?.message || error?.toString() || 'Connection error';
      
      // Show error message to user
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'model',
        content: language === 'DE' 
          ? `Fehler: ${errorMessage}` 
          : `Error: ${errorMessage}`,
        timestamp: Date.now(),
        archetypeId: activeArchetype
      }]);
      setStatus(ChatStatus.ERROR);
      
      // Clear abort controller on error
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  };

  const activeTheme = getArchetypeTheme(activeArchetype);
  const cssVars = React.useMemo(() => {
    const theme = getArchetypeTheme(activeArchetype);
    return {
      '--archetype-accent': theme.accent,
      '--archetype-accent-strong': theme.accentStrong,
      '--archetype-glow': theme.glow,
      '--archetype-ring': theme.ring,
      '--archetype-gradient-from': theme.gradientFrom,
      '--archetype-gradient-to': theme.gradientTo,
    } as React.CSSProperties;
  }, [activeArchetype]);

  return (
    <div 
      className="flex-1 flex flex-col h-full w-full relative"
      data-archetype={activeArchetype}
      style={cssVars}
    >
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6 scrollbar-thin">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const arch = msg.archetypeId ? archetypes[msg.archetypeId as ArchetypeId] : null;
          const Icon = isUser ? Bot : (arch ? ICON_MAP[arch.iconName] : Bot);
          
          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in-up mb-4 md:mb-6`}>
              <div className={`flex gap-2 md:gap-3 max-w-[90%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar - Uses Archetype Colors via CSS Variables */}
                <div 
                  className={`w-8 h-8 md:w-10 md:h-10 rounded-full shrink-0 flex items-center justify-center border shadow-lg ${isUser 
                    ? 'bg-purple-900/40 border-purple-500/30 text-purple-200' 
                    : 'border-white/30 text-white shadow-[0_0_15px_rgba(0,0,0,0.3)]'
                  }`}
                  style={!isUser && arch ? {
                    background: `linear-gradient(to bottom right, rgb(var(--archetype-gradient-from)), rgb(var(--archetype-gradient-to)))`,
                  } : {}}
                  data-archetype={!isUser && arch ? arch.id : undefined}
                >
                  <Icon size={isUser ? 14 : 18} strokeWidth={1.5} />
                </div>
                {/* Message Card - Original Style */}
                <div className={`p-3 md:p-4 rounded-2xl shadow-xl backdrop-blur-md border ${isUser 
                  ? 'bg-purple-600/20 border-purple-500/30 text-purple-50 rounded-tr-none' 
                  : `bg-[#150a26]/70 border-white/10 text-violet-100 rounded-tl-none`
                }`}>
                  {/* Archetype Name Label for Model Messages - Uses CSS Variables */}
                  {!isUser && arch && (
                    <div className="mb-2 pb-2 border-b border-white/5">
                      <span 
                        className="text-[10px] font-bold uppercase tracking-widest opacity-80"
                        style={{
                          color: `rgb(var(--archetype-accent))`,
                        }}
                        data-archetype={arch.id}
                      >
                        {arch.name}
                      </span>
                    </div>
                  )}
                  <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            </div>
          );
        })}
        {streamingContent && (
           <div className="flex justify-start animate-fade-in mb-4 md:mb-6">
             <div className="flex gap-2 md:gap-3 max-w-[90%] md:max-w-[75%] flex-row">
                <div 
                  className="w-8 h-8 md:w-10 md:h-10 rounded-full shrink-0 flex items-center justify-center border shadow-lg border-white/30 text-white shadow-[0_0_15px_rgba(0,0,0,0.3)]"
                  style={{
                    background: `linear-gradient(to bottom right, rgb(var(--archetype-gradient-from)), rgb(var(--archetype-gradient-to)))`,
                  }}
                  data-archetype={activeArchetype}
                >
                  {(() => { const Icon = ICON_MAP[currentArchetypeData.iconName]; return <Icon size={18} strokeWidth={1.5} />; })()}
                </div>
                <div className="p-3 md:p-4 rounded-2xl shadow-xl backdrop-blur-md border bg-[#150a26]/70 border-white/10 text-violet-100 rounded-tl-none">
                  <div className="mb-2 pb-2 border-b border-white/5">
                    <span 
                      className="text-[10px] font-bold uppercase tracking-widest opacity-80"
                      style={{
                        color: `rgb(var(--archetype-accent))`,
                      }}
                      data-archetype={activeArchetype}
                    >
                      {currentArchetypeData.name}
                    </span>
                  </div>
                  <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">{streamingContent}</p>
                </div>
             </div>
           </div>
        )}
        {status === ChatStatus.THINKING && (
            <div className="flex justify-start animate-pulse">
                <div className="w-8 h-8 rounded-full bg-purple-900/40 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Sparkles size={14} className="animate-spin-slow" />
                </div>
            </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="p-4 md:p-6 bg-[#0f0716]/80 backdrop-blur-xl border-t border-purple-900/30">
        <div className="max-w-4xl mx-auto flex gap-2 md:gap-3 items-center">
          <div className="flex-1 relative">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={ui.INPUT_PLACEHOLDER}
              className="w-full bg-[#150a26] border border-purple-500/20 rounded-xl px-4 md:px-5 py-3 md:py-3.5 text-sm md:text-base text-white placeholder-purple-400/30 focus:border-purple-500 outline-none transition-all shadow-inner"
            />
            <div className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none opacity-20">
                <span className="text-[9px] md:text-[10px] font-mono">⌘ ↵</span>
            </div>
          </div>
          <button 
            onClick={handleSend}
            disabled={!input.trim() || status !== ChatStatus.IDLE}
            className="w-11 h-11 md:w-12 md:h-12 flex items-center justify-center bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-lg shadow-purple-900/20 disabled:opacity-20 transition-all duration-300 active:scale-95 shrink-0"
          >
            <Send size={16} className="md:w-[18px] md:h-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
};
