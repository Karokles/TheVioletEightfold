import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Language } from '../../types';
import {
  completeTutorial,
  isTutorialsEnabled,
  loadTutorialProgress,
  saveTutorialProgress,
  skipTutorial,
  tutorialDefinitions,
  tutorialEventBus,
  TutorialId,
} from '../../services/tutorialProgressService';

interface TutorialOverlayProps {
  userId?: string;
  language: Language;
  tutorialId: TutorialId | null;
  onClose: () => void;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const getTargetRect = (targetId?: string): TargetRect | null => {
  if (!targetId) return null;
  const element = document.querySelector(`[data-tutorial-id="${targetId}"]`);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
};

const getTutorialElement = (targetId?: string): Element | null => {
  if (!targetId) return null;
  return document.querySelector(`[data-tutorial-id="${targetId}"]`);
};

const getElementWordCount = (targetId?: string): number => {
  const element = getTutorialElement(targetId);
  if (!element) return 0;
  const value = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
    ? element.value
    : element.textContent || '';
  return value.trim().split(/\s+/).filter(Boolean).length;
};

const inferStepIndexFromCurrentUi = (tutorialId: TutorialId): number => {
  if (tutorialId === 'single_voice_intro') {
    if (getElementWordCount('singlevoice-input') >= 1) {
      return tutorialDefinitions.single_voice_intro.steps.findIndex(item => item.id === 'send_thought');
    }
    return 0;
  }

  if (tutorialId === 'council_intro') {
    const replyInputExists = Boolean(getTutorialElement('council-reply-input'));
    if (replyInputExists && getElementWordCount('council-reply-input') >= 1) {
      return tutorialDefinitions.council_intro.steps.findIndex(item => item.id === 'send_reply');
    }
    if (replyInputExists) {
      return tutorialDefinitions.council_intro.steps.findIndex(item => item.id === 'answer_back');
    }
    if (getElementWordCount('council-topic-input') >= 1) {
      return tutorialDefinitions.council_intro.steps.findIndex(item => item.id === 'invite_room');
    }
  }

  return 0;
};

const eventFromCurrentUi = (waitFor?: string, targetId?: string) => {
  if (!waitFor || !waitFor.endsWith('_words')) return null;
  return {
    type: waitFor,
    payload: { count: getElementWordCount(targetId) },
  };
};

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  userId,
  tutorialId,
  onClose,
}) => {
  const definition = tutorialId ? tutorialDefinitions[tutorialId] : null;
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [completed, setCompleted] = useState(false);

  const step = definition?.steps[stepIndex];

  useEffect(() => {
    if (!definition || !userId || !isTutorialsEnabled()) return;
    const progress = loadTutorialProgress(userId, definition.id);
    const savedStepIndex = definition.steps.findIndex(item => item.id === progress?.current_step_id);
    const inferredStepIndex = inferStepIndexFromCurrentUi(definition.id);
    setStepIndex(Math.max(savedStepIndex, inferredStepIndex, 0));
    setCompleted(false);
  }, [definition, userId]);

  useEffect(() => {
    if (!step) return;

    const updateRect = () => {
      setTargetRect(getTargetRect(step.targetId));
    };

    updateRect();
    window.setTimeout(updateRect, 120);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [step?.targetId, step?.id]);

  useEffect(() => {
    if (!definition || !step || !userId) return;

    saveTutorialProgress(userId, definition.id, { current_step_id: step.id });

    const advanceFromEvent = (event: Parameters<typeof tutorialEventBus.emit>[0]) => {
      if (!step.waitFor || event.type !== step.waitFor) return;
      if (step.validator && !step.validator(event)) return;

      const nextIndex = stepIndex + 1;
      if (nextIndex >= definition.steps.length) {
        completeTutorial(userId, definition.id);
        setCompleted(true);
        return;
      }
      setStepIndex(nextIndex);
    };

    const initialStateTimer = window.setTimeout(() => {
      const initialEvent = eventFromCurrentUi(step.waitFor, step.targetId);
      if (initialEvent) {
        advanceFromEvent(initialEvent as Parameters<typeof tutorialEventBus.emit>[0]);
      }
    }, 80);

    const unsubscribe = tutorialEventBus.subscribe(advanceFromEvent);

    return () => {
      window.clearTimeout(initialStateTimer);
      unsubscribe();
    };
  }, [definition, step, stepIndex, userId]);

  const completionPosition = useMemo(() => {
    if (!targetRect) return { top: '50%', left: '50%' };
    return {
      top: `${Math.max(20, targetRect.top + targetRect.height / 2 - 18)}px`,
      left: `${Math.max(20, targetRect.left + targetRect.width / 2 - 18)}px`,
    };
  }, [targetRect]);

  useEffect(() => {
    if (!definition || !userId) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      skipTutorial(userId, definition.id);
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [definition, onClose, userId]);

  useEffect(() => {
    if (!completed) return;
    const timer = window.setTimeout(onClose, 950);
    return () => window.clearTimeout(timer);
  }, [completed, onClose]);

  if (!tutorialId || !definition || !step || !userId || !isTutorialsEnabled()) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[80]">
      {targetRect && !completed && (
        <>
          <div
            className="tutorial-spotlight pointer-events-none fixed overflow-hidden rounded-[24px] bg-violet-200/[0.014] shadow-[0_0_34px_rgba(168,85,247,0.18),inset_0_0_26px_rgba(255,255,255,0.028)]"
            style={{
              top: targetRect.top - 10,
              left: targetRect.left - 10,
              width: targetRect.width + 20,
              height: targetRect.height + 20,
            }}
          >
            <span className="tutorial-spotlight-scan" />
            <span className="tutorial-corner tutorial-corner-tl" />
            <span className="tutorial-corner tutorial-corner-tr" />
            <span className="tutorial-corner tutorial-corner-bl" />
            <span className="tutorial-corner tutorial-corner-br" />
          </div>
          <div
            className="pointer-events-none fixed h-4 w-4 rotate-45 border-l border-t border-violet-300/28"
            style={{
              top: Math.max(14, targetRect.top + targetRect.height + 5),
              left: Math.max(20, targetRect.left + targetRect.width / 2 - 10),
            }}
          />
        </>
      )}

      {completed && (
        <div
          className="pointer-events-none fixed flex h-9 w-9 items-center justify-center rounded-full border border-lime-200/22 bg-lime-300/8 text-lime-100 shadow-[0_0_24px_rgba(190,242,100,0.22)] backdrop-blur-md animate-ping"
          style={completionPosition}
        >
          <Sparkles size={16} />
        </div>
      )}
    </div>
  );
};
