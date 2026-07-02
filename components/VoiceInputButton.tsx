import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Language } from '../types';

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  [index: number]: { transcript: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const getSpeechRecognition = (): SpeechRecognitionConstructor | null => {
  if (typeof window === 'undefined') return null;
  const candidates = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return candidates.SpeechRecognition || candidates.webkitSpeechRecognition || null;
};

interface VoiceInputButtonProps {
  language: Language;
  disabled?: boolean;
  className?: string;
  onTranscript: (text: string) => void;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  language,
  disabled = false,
  className = '',
  onTranscript,
}) => {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    setIsSupported(Boolean(getSpeechRecognition()));

    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  const stopListening = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  };

  const startListening = () => {
    const Recognition = getSpeechRecognition();
    if (!Recognition || disabled) {
      setIsSupported(false);
      return;
    }

    const recognition = new Recognition();
    recognition.lang = language === 'DE' ? 'de-DE' : 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      let finalText = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result?.isFinal) {
          finalText += result[0]?.transcript || '';
        }
      }
      if (finalText.trim()) {
        onTranscript(finalText.trim());
      }
    };
    recognition.onerror = () => {
      stopListening();
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const handleClick = () => {
    if (isListening) {
      stopListening();
      return;
    }
    startListening();
  };

  const label = language === 'DE'
    ? isListening
      ? 'Aufnahme stoppen'
      : 'Spracheingabe starten'
    : isListening
      ? 'Stop voice input'
      : 'Start voice input';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || !isSupported}
      title={isSupported ? label : (language === 'DE' ? 'Spracheingabe wird in diesem Browser nicht unterstuetzt' : 'Voice input is not supported in this browser')}
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 ${
        isListening
          ? 'border-emerald-300/40 bg-emerald-400/15 text-emerald-100 shadow-[0_0_18px_rgba(52,211,153,0.18)]'
          : 'border-purple-500/20 bg-[#150a26] text-purple-300 hover:border-purple-400/50 hover:bg-purple-900/25 hover:text-white'
      } disabled:cursor-not-allowed disabled:opacity-30 ${className}`}
    >
      {isListening ? <MicOff size={19} /> : <Mic size={19} />}
    </button>
  );
};
