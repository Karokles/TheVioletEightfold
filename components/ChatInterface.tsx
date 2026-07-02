
import React, { useState, useRef, useEffect } from 'react';
import { Message, ChatStatus, Language, MeaningContext } from '../types';
import { ArchetypeId, ICON_MAP } from '../constants';
import { getArchetypes, getUIText } from '../config/loader';
import { PaywallRequiredError, sendMessageToArchetype } from '../services/aiService';
import { Send, Sparkles, Bot } from 'lucide-react';
import { getCurrentUser } from '../services/userService';
import { analyzePlayfulDiscovery, DiscoveryNotice } from '../services/playfulDiscoveryService';
import { DiscoveryCard } from './DiscoveryCard';
import { TutorialOverlay } from './tutorial/TutorialOverlay';
import { TutorialTrigger } from './tutorial/TutorialTrigger';
import { tutorialEventBus, TutorialId } from '../services/tutorialProgressService';
import { VoiceInputButton } from './VoiceInputButton';
import { PaywallNotice } from './PaywallNotice';

interface ChatInterfaceProps {
  activeArchetype: ArchetypeId;
  language: Language;
  currentLore: string;
  meaningContext: MeaningContext;
  onUserSignal?: (content: string) => MeaningContext | void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ activeArchetype, language, currentLore, meaningContext, onUserSignal }) => {
  const archetypes = getArchetypes(language);
  const currentArchetypeData = archetypes[activeArchetype];
  const ui = getUIText(language);

  // AbortController for cancelling in-flight requests when switching archetypes
  const abortControllerRef = useRef<AbortController | null>(null);

  const getInitMessage = (archetype: ArchetypeId, lang: Language): Message => {
    const archetypeData = archetypes[archetype];
    return {
      id: `init-${archetype}-${lang}`,
      role: 'model',
      content: lang === 'DE' 
          ? `Ich bin ${archetypeData.name}. ${archetypeData.role}. Bereit zu dienen.` 
          : `I am ${archetypeData.name}. ${archetypeData.role}. Ready to assist.`,
      timestamp: Date.now(),
      archetypeId: archetype
    };
  };

  const [messages, setMessages] = useState<Message[]>(() => [getInitMessage(activeArchetype, language)]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<ChatStatus>(ChatStatus.IDLE);
  const [discoveries, setDiscoveries] = useState<DiscoveryNotice[]>([]);
  const [activeTutorialId, setActiveTutorialId] = useState<TutorialId | null>(null);
  const [paywallMessage, setPaywallMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentUser = getCurrentUser();

  // Reset messages and cancel any in-flight requests when archetype or language changes
  useEffect(() => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Reset messages with new archetype's greeting
    setMessages([getInitMessage(activeArchetype, language)]);
    setStatus(ChatStatus.IDLE);
    setInput(''); // Clear input as well
    setPaywallMessage('');
  }, [activeArchetype, language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const updateInput = (value: string) => {
    setInput(value);
    tutorialEventBus.emit({
      type: 'single_voice_input_words',
      payload: { count: value.trim().split(/\s+/).filter(Boolean).length },
    });
  };

  const appendVoiceTranscript = (text: string) => {
    setInput(prev => {
      const next = `${prev}${prev.trim() ? ' ' : ''}${text}`.trimStart();
      tutorialEventBus.emit({
        type: 'single_voice_input_words',
        payload: { count: next.trim().split(/\s+/).filter(Boolean).length },
      });
      return next;
    });
    textareaRef.current?.focus();
  };

  const handleSend = async () => {
    if (!input.trim() || status === ChatStatus.STREAMING) return;

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
      timestamp: Date.now(),
      archetypeId: activeArchetype
    };

    setMessages(prev => [...prev, userMsg]);
    tutorialEventBus.emit({
      type: 'single_voice_message_sent',
      payload: { archetypeId: activeArchetype },
    });
    const interactionMeaningContext = onUserSignal?.(userMsg.content) || meaningContext;
    const user = getCurrentUser();
    if (user?.id) {
      const notices = analyzePlayfulDiscovery({
        userId: user.id,
        text: userMsg.content,
        source: 'chat',
        language,
        archetype: activeArchetype,
        meaningContext: interactionMeaningContext,
      });
      if (notices.length > 0) {
        setDiscoveries(prev => [...prev, ...notices]);
      }
    }
    setInput('');
    setStatus(ChatStatus.STREAMING);
    setPaywallMessage('');

    try {
      // Build conversation history from existing messages (excluding the init message)
      // Filter by current archetype to ensure per-archetype isolation
      const initMsgId = `init-${activeArchetype}-${language}`;
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
        userMsg.content,
        language,
        currentLore,
        conversationHistory,
        interactionMeaningContext,
        abortController.signal
      );
      
      const botMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, {
        id: botMsgId,
        role: 'model',
        content: '',
        timestamp: Date.now(),
        archetypeId: activeArchetype
      }]);

      let fullText = '';

      for await (const chunk of stream) {
        // Check if request was aborted
        if (abortController.signal.aborted) {
          return;
        }

        const text = chunk.text;
        if (text) {
            fullText += text;
            setMessages(prev => prev.map(m => 
                m.id === botMsgId ? { ...m, content: fullText } : m
            ));
        }
      }
      
      // Clear abort controller on success
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      tutorialEventBus.emit({
        type: 'single_voice_response_received',
        payload: { archetypeId: activeArchetype },
      });
      setStatus(ChatStatus.IDLE);
    } catch (error: any) {
      // Ignore abort errors
      if (error.name === 'AbortError' || abortController.signal.aborted) {
        return;
      }

      const errorMessage = error?.message || error?.toString() || 'Connection error';
      if (error instanceof PaywallRequiredError) {
        setPaywallMessage(errorMessage);
        setStatus(ChatStatus.IDLE);
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
        return;
      }

      console.error('Chat error:', error);
      console.error('Full error details:', {
        message: errorMessage,
        stack: error?.stack,
        name: error?.name,
      });
      
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const CurrentIcon = ICON_MAP[currentArchetypeData.iconName];

  return (
    <div className="relative flex flex-col h-full max-w-5xl mx-auto w-full">
      <div className="absolute right-5 top-5 z-30">
        <TutorialTrigger tutorialId="single_voice_intro" onStart={setActiveTutorialId} />
      </div>
      <TutorialOverlay
        userId={currentUser?.id}
        language={language}
        tutorialId={activeTutorialId}
        onClose={() => setActiveTutorialId(null)}
      />
      {/* Chat Area */}
      <div data-tutorial-id="singlevoice-thread" className="flex-1 overflow-y-auto px-6 py-8 space-y-8 scroll-smooth">
        {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            const msgArchetype = msg.archetypeId ? archetypes[msg.archetypeId as ArchetypeId] : currentArchetypeData;
            const MsgIcon = msg.role === 'model' ? ICON_MAP[msgArchetype.iconName] : Bot;
            const delayStyle = { animationDelay: `${index * 0.1}s` };

            return (
                <div 
                    key={msg.id} 
                    className={`flex gap-5 ${isUser ? 'flex-row-reverse' : ''} animate-fade-in-up opacity-0 fill-mode-forwards`}
                >
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-lg ring-1 ring-white/5
                        ${isUser ? 'bg-slate-800' : 'bg-[#150a26]'} relative overflow-hidden group`}>
                        {isUser ? (
                             <div className="w-4 h-4 bg-slate-500 rounded-sm rotate-45" />
                        ) : (
                             <>
                                <div className={`absolute inset-0 bg-gradient-to-br ${msgArchetype.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
                                <MsgIcon size={24} className="text-white relative z-10" strokeWidth={1.5} />
                             </>
                        )}
                    </div>

                    {/* Message Card */}
                    <div className={`relative max-w-[80%] rounded-2xl p-6 shadow-md border backdrop-blur-sm
                        ${isUser 
                            ? 'bg-violet-900/30 border-violet-700/30 text-violet-50 rounded-tr-sm' 
                            : 'bg-[#1a102e]/60 border-purple-500/10 text-slate-200 rounded-tl-sm'}`}>
                        
                        {msg.role === 'model' && (
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
                                <span className={`text-[10px] font-bold uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r ${msgArchetype.color}`}>
                                    {msgArchetype.name}
                                </span>
                            </div>
                        )}
                        <p className="whitespace-pre-wrap leading-7 font-light tracking-wide text-[15px]">{msg.content}</p>
                    </div>
                </div>
            );
        })}
        {discoveries.map(notice => (
          <DiscoveryCard
            key={notice.id}
            notice={notice}
            onDismiss={() => setDiscoveries(prev => prev.filter(item => item.id !== notice.id))}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 pt-2 z-10">
        {paywallMessage && (
          <div className="mb-4">
            <PaywallNotice
              language={language}
              message={paywallMessage}
              onClose={() => setPaywallMessage('')}
            />
          </div>
        )}
        <div className="relative flex items-end gap-3 bg-[#0f0716]/80 border border-purple-500/20 rounded-2xl p-3 focus-within:ring-1 focus-within:ring-purple-500/50 focus-within:border-purple-500/50 transition-all shadow-[0_0_30px_rgba(0,0,0,0.2)] backdrop-blur-xl">
            {/* Console Left Deco */}
            <div className="w-1 h-8 bg-purple-500/20 rounded-full self-center ml-1" />
            
            <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  updateInput(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                data-tutorial-id="singlevoice-input"
                placeholder={`${ui.INPUT_PLACEHOLDER} ${currentArchetypeData.name}...`}
                className="flex-1 bg-transparent border-none text-violet-100 placeholder-violet-500/30 focus:ring-0 resize-none max-h-32 py-3 px-2 leading-relaxed text-sm"
                rows={1}
            />
            <VoiceInputButton
                language={language}
                disabled={status !== ChatStatus.IDLE}
                onTranscript={appendVoiceTranscript}
            />
            <button
                onClick={handleSend}
                data-tutorial-id="singlevoice-send"
                disabled={status !== ChatStatus.IDLE || !input.trim()}
                className={`p-3 rounded-xl transition-all duration-300 shadow-lg ${
                    input.trim() 
                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/20' 
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
            >
                {status === ChatStatus.STREAMING ? (
                    <Sparkles className="animate-spin" size={20} />
                ) : (
                    <Send size={20} />
                )}
            </button>
        </div>
        <div className="text-center text-[10px] text-violet-500/30 mt-3 tracking-widest uppercase font-light">
            {ui.FOOTER_TEXT} • {currentArchetypeData.domains.join(' • ')}
        </div>
      </div>
    </div>
  );
};
