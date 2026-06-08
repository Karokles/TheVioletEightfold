import { Language } from '../types';
import { getUserScopedKey } from './userService';

const TUTORIAL_PROGRESS_KEY = 'tutorial_progress';

export const isTutorialsEnabled = (): boolean => {
  const env = import.meta.env as Record<string, string | undefined>;
  const raw = env.VITE_TUTORIALS_ENABLED ?? env.TUTORIALS_ENABLED;
  return raw === undefined ? true : raw !== 'false';
};

export type TutorialId = 'single_voice_intro' | 'council_intro';

export type TutorialEventType =
  | 'archetype_selected'
  | 'single_voice_input_words'
  | 'single_voice_message_sent'
  | 'single_voice_response_received'
  | 'council_topic_words'
  | 'council_started'
  | 'council_initial_response_received'
  | 'council_reply_input_words'
  | 'council_reply_sent'
  | 'council_reply_response_received';

export interface TutorialEvent {
  type: TutorialEventType;
  payload?: Record<string, unknown>;
}

export interface TutorialStepDefinition {
  id: string;
  targetId?: string;
  message: Record<Language, string>;
  waitFor?: TutorialEventType;
  validator?: (event: TutorialEvent) => boolean;
}

export interface TutorialDefinition {
  id: TutorialId;
  hiddenNoteId: string;
  steps: TutorialStepDefinition[];
}

export interface TutorialProgressRecord {
  tutorial_id: TutorialId;
  user_id: string;
  current_step_id?: string;
  completed_at?: string;
  skipped_at?: string;
  hidden_note_unlocked_at?: string;
  local_only: boolean;
  metadata_json: Record<string, unknown>;
}

const listeners = new Set<(event: TutorialEvent) => void>();

export const tutorialEventBus = {
  emit(event: TutorialEvent) {
    listeners.forEach(listener => listener(event));
  },
  subscribe(listener: (event: TutorialEvent) => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export const tutorialDefinitions: Record<TutorialId, TutorialDefinition> = {
  single_voice_intro: {
    id: 'single_voice_intro',
    hiddenNoteId: 'single_voice_is_a_lens',
    steps: [
      {
        id: 'choose_voice',
        targetId: 'roundtable-voices',
        message: {
          EN: 'Choose a voice.',
          DE: 'Waehle eine Stimme.',
        },
        waitFor: 'archetype_selected',
      },
      {
        id: 'write_thought',
        targetId: 'singlevoice-input',
        message: {
          EN: 'Give it one thought.',
          DE: 'Gib ihr einen Gedanken.',
        },
        waitFor: 'single_voice_input_words',
        validator: event => Number(event.payload?.count || 0) >= 1,
      },
      {
        id: 'send_thought',
        targetId: 'singlevoice-send',
        message: {
          EN: 'Send it through this lens.',
          DE: 'Schick ihn durch diese Linse.',
        },
        waitFor: 'single_voice_message_sent',
      },
      {
        id: 'see_response',
        targetId: 'singlevoice-thread',
        message: {
          EN: 'One voice. One angle. Not the whole truth.',
          DE: 'Eine Stimme. Ein Winkel. Nicht die ganze Wahrheit.',
        },
        waitFor: 'single_voice_response_received',
      },
    ],
  },
  council_intro: {
    id: 'council_intro',
    hiddenNoteId: 'council_is_perspective',
    steps: [
      {
        id: 'name_question',
        targetId: 'council-topic-input',
        message: {
          EN: 'Bring one question.',
          DE: 'Bring eine Frage.',
        },
        waitFor: 'council_topic_words',
        validator: event => Number(event.payload?.count || 0) >= 1,
      },
      {
        id: 'invite_room',
        targetId: 'council-start',
        message: {
          EN: 'Invite the room.',
          DE: 'Rufe den Raum.',
        },
        waitFor: 'council_started',
      },
      {
        id: 'watch_room',
        targetId: 'council-thread',
        message: {
          EN: 'The room answers.',
          DE: 'Der Raum antwortet.',
        },
        waitFor: 'council_initial_response_received',
      },
      {
        id: 'answer_back',
        targetId: 'council-reply-input',
        message: {
          EN: 'Answer back.',
          DE: 'Antworte zurueck.',
        },
        waitFor: 'council_reply_input_words',
        validator: event => Number(event.payload?.count || 0) >= 1,
      },
      {
        id: 'send_reply',
        targetId: 'council-reply-send',
        message: {
          EN: 'Return it to the room.',
          DE: 'Gib es in den Raum zurueck.',
        },
        waitFor: 'council_reply_sent',
      },
      {
        id: 'second_answer',
        targetId: 'council-thread',
        message: {
          EN: 'Perspective, not truth.',
          DE: 'Perspektive, nicht Wahrheit.',
        },
        waitFor: 'council_reply_response_received',
      },
    ],
  },
};

const loadProgressMap = (userId: string): Record<TutorialId, TutorialProgressRecord> => {
  const saved = localStorage.getItem(getUserScopedKey(TUTORIAL_PROGRESS_KEY, userId));
  if (!saved) return {} as Record<TutorialId, TutorialProgressRecord>;

  try {
    return JSON.parse(saved) as Record<TutorialId, TutorialProgressRecord>;
  } catch (error) {
    console.warn('Failed to parse tutorial progress', error);
    return {} as Record<TutorialId, TutorialProgressRecord>;
  }
};

const saveProgressMap = (userId: string, records: Record<TutorialId, TutorialProgressRecord>) => {
  localStorage.setItem(getUserScopedKey(TUTORIAL_PROGRESS_KEY, userId), JSON.stringify(records));
};

export const loadTutorialProgress = (userId: string, tutorialId: TutorialId): TutorialProgressRecord | null => {
  return loadProgressMap(userId)[tutorialId] || null;
};

export const saveTutorialProgress = (
  userId: string,
  tutorialId: TutorialId,
  patch: Partial<TutorialProgressRecord>,
): TutorialProgressRecord => {
  const records = loadProgressMap(userId);
  const existing = records[tutorialId];
  const next: TutorialProgressRecord = {
    tutorial_id: tutorialId,
    user_id: userId,
    current_step_id: tutorialDefinitions[tutorialId].steps[0]?.id,
    local_only: true,
    ...existing,
    ...patch,
    metadata_json: {
      ...(existing?.metadata_json || {}),
      ...(patch.metadata_json || {}),
    },
  };
  records[tutorialId] = next;
  saveProgressMap(userId, records);
  return next;
};

export const completeTutorial = (userId: string, tutorialId: TutorialId): TutorialProgressRecord => {
  const now = new Date().toISOString();
  return saveTutorialProgress(userId, tutorialId, {
    current_step_id: undefined,
    completed_at: now,
    hidden_note_unlocked_at: now,
  });
};

export const skipTutorial = (userId: string, tutorialId: TutorialId): TutorialProgressRecord => {
  return saveTutorialProgress(userId, tutorialId, {
    current_step_id: undefined,
    skipped_at: new Date().toISOString(),
  });
};
