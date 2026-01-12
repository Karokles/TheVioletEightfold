import { ArchetypeId } from '../constants';
import { Language, Message } from '../types';
import { getCurrentUser } from './userService';

// Production safety check: ensure API base URL is set in production builds
const getApiBaseUrl = (): string => {
  const url = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  
  // In production build, require VITE_API_BASE_URL to be set
  if (import.meta.env.PROD && !url) {
    throw new Error(
      'VITE_API_BASE_URL is not set. Please configure it in your deployment environment. ' +
      'This is required for production builds to connect to the backend.'
    );
  }
  
  // Fallback to localhost only in development
  return url || 'http://localhost:3001';
};

const API_BASE_URL = getApiBaseUrl();

// Get auth headers for API requests
const getAuthHeaders = () => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  // Normalize token: remove any existing "Bearer " prefix to prevent double prefix
  let token = user.token.trim();
  while (token.startsWith('Bearer ')) {
    token = token.substring(7).trim();
  }
  
  // Ensure single "Bearer " prefix
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

// Direct chat with an archetype (for ChatInterface)
export const sendMessageToArchetype = async (
  archetypeId: ArchetypeId,
  message: string,
  lang: Language,
  currentLore: string,
  conversationHistory?: Message[]
): Promise<AsyncIterable<{ text: string }>> => {
  const user = getCurrentUser();
  if (!user || !user.id) {
    throw new Error('User not authenticated');
  }

  // Validate message is not empty
  if (!message || !message.trim()) {
    throw new Error('Message cannot be empty');
  }

  // Build conversation history - include previous messages if provided
  const messages: Message[] = conversationHistory 
    ? [...conversationHistory, {
        id: Date.now().toString(),
        role: 'user',
        content: message,
        timestamp: Date.now(),
      }]
    : [{
        id: '1',
        role: 'user',
        content: message,
        timestamp: Date.now(),
      }];

  // Ensure messages array is not empty
  if (!messages || messages.length === 0) {
    throw new Error('Messages array cannot be empty');
  }

  // For direct chat, use the council endpoint with activeArchetype set
  // This tells the server to use only that archetype's prompt
  // Note: userId is derived server-side from the auth token, not sent in body
  const response = await fetch(`${API_BASE_URL}/api/council`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      messages,
      userProfile: {
        lore: currentLore,
        activeArchetype: archetypeId, // This signals direct chat mode
        language: lang,
      },
    }),
  });

  if (!response.ok) {
    // Handle 401 Unauthorized: clear tokens and force re-login
    if (response.status === 401) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: 'unauthorized' };
      }
      
      // Check for invalid_* reasons to trigger auto-logout
      const reason = errorData.reason || '';
      // Handle all 401 reasons: invalid_signature, expired, missing_token, legacy_token_invalid, etc.
      if (reason.startsWith('invalid_') || reason === 'expired' || reason === 'missing_token' || reason === 'legacy_token_invalid') {
        const { handleAuthError } = await import('./userService');
        handleAuthError();
        const message = errorData.message || errorData.hint || 'Session expired. Please sign in again.';
        throw new Error(message);
      }
      
      // Other 401 reasons (malformed, etc.) - still clear token
      const { handleAuthError } = await import('./userService');
      handleAuthError();
      throw new Error(errorData.message || 'Session expired. Please sign in again.');
    }
    
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
    }
    const errorMsg = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
    console.error('Direct chat API error:', errorMsg, 'Status:', response.status, 'URL:', API_BASE_URL);
    throw new Error(errorMsg);
  }

  const data = await response.json();
  
  // Return a simple async iterable that yields the reply
  return (async function* () {
    yield { text: data.reply || '' };
  })();
};

// Council session (multi-archetype)
export const startCouncilSession = async (
  topic: string,
  lang: Language,
  currentLore: string
): Promise<AsyncIterable<{ text: string }>> => {
  const user = getCurrentUser();
  if (!user || !user.id) {
    throw new Error('User not authenticated');
  }

  // Validate topic is not empty
  if (!topic || !topic.trim()) {
    throw new Error('Topic cannot be empty');
  }

  const messages: Message[] = [
    {
      id: '1',
      role: 'user',
      content: topic,
      timestamp: Date.now(),
    },
  ];

  // Note: userId is derived server-side from the auth token, not sent in body
  const response = await fetch(`${API_BASE_URL}/api/council`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      messages,
      userProfile: {
        lore: currentLore,
        language: lang,
      },
    }),
  });

  if (!response.ok) {
    // Handle 401 Unauthorized: clear tokens and force re-login
    if (response.status === 401) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: 'unauthorized' };
      }
      
      // Check for invalid_* reasons to trigger auto-logout
      const reason = errorData.reason || '';
      // Handle all 401 reasons: invalid_signature, expired, missing_token, legacy_token_invalid, etc.
      if (reason.startsWith('invalid_') || reason === 'expired' || reason === 'missing_token' || reason === 'legacy_token_invalid') {
        const { handleAuthError } = await import('./userService');
        handleAuthError();
        const message = errorData.message || errorData.hint || 'Session expired. Please sign in again.';
        throw new Error(message);
      }
      
      // Other 401 reasons (malformed, etc.) - still clear token
      const { handleAuthError } = await import('./userService');
      handleAuthError();
      throw new Error(errorData.message || 'Session expired. Please sign in again.');
    }
    
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
    }
    const errorMsg = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
    console.error('Council API error:', errorMsg, 'Status:', response.status);
    throw new Error(errorMsg);
  }

  const data = await response.json();
  
  return (async function* () {
    yield { text: data.reply || '' };
  })();
};

export const sendMessageToCouncil = async (
  message: string,
  conversationHistory: Message[],
  lang: Language,
  currentLore: string
): Promise<AsyncIterable<{ text: string }>> => {
  const user = getCurrentUser();
  if (!user || !user.id) {
    throw new Error('User not authenticated');
  }

  // Validate message is not empty
  if (!message || !message.trim()) {
    throw new Error('Message cannot be empty');
  }

  // Add the new user message to history
  const messages: Message[] = [
    ...conversationHistory,
    {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    },
  ];

  // Ensure messages array is not empty
  if (!messages || messages.length === 0) {
    throw new Error('Messages array cannot be empty');
  }

  // Note: userId is derived server-side from the auth token, not sent in body
  const response = await fetch(`${API_BASE_URL}/api/council`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      messages,
      userProfile: {
        lore: currentLore,
        language: lang,
      },
    }),
  });

  if (!response.ok) {
    // Handle 401 Unauthorized: clear tokens and force re-login
    if (response.status === 401) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: 'unauthorized' };
      }
      
      // Check for invalid_* reasons to trigger auto-logout
      const reason = errorData.reason || '';
      // Handle all 401 reasons: invalid_signature, expired, missing_token, legacy_token_invalid, etc.
      if (reason.startsWith('invalid_') || reason === 'expired' || reason === 'missing_token' || reason === 'legacy_token_invalid') {
        const { handleAuthError } = await import('./userService');
        handleAuthError();
        const message = errorData.message || errorData.hint || 'Session expired. Please sign in again.';
        throw new Error(message);
      }
      
      // Other 401 reasons (malformed, etc.) - still clear token
      const { handleAuthError } = await import('./userService');
      handleAuthError();
      throw new Error(errorData.message || 'Session expired. Please sign in again.');
    }
    
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
    }
    const errorMsg = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
    console.error('Council API error:', errorMsg, 'Status:', response.status);
    throw new Error(errorMsg);
  }

  const data = await response.json();
  
  return (async function* () {
    yield { text: data.reply || '' };
  })();
};

// Login function
export const login = async (username: string, secret: string): Promise<{ userId: string; token: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, secret }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(error.error || 'Login failed');
  }

  return response.json();
}

// Meaning Agent - analyzes session and returns canonical JSON
export async function analyzeMeaning(
  messages: Message[],
  options?: {
    sessionId?: string;
    mode?: 'single' | 'council';
    activeArchetype?: string;
    userLore?: string;
    currentQuestState?: { title?: string; state?: string; objective?: string };
  }
): Promise<import('../types').MeaningAnalysisResult> {
  const user = getCurrentUser();
  if (!user || !user.id) {
    throw new Error('User not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/api/meaning/analyze`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      sessionId: options?.sessionId,
      mode: options?.mode || 'council',
      activeArchetype: options?.activeArchetype,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        meta: msg.archetypeId ? { archetypeId: msg.archetypeId } : undefined
      })),
      userLore: options?.userLore,
      currentQuestState: options?.currentQuestState
    }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: 'unauthorized' };
      }
      
      const { handleAuthError } = await import('./userService');
      handleAuthError();
      const message = errorData.message || errorData.hint || 'Session expired. Please sign in again.';
      throw new Error(message);
    }
    
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
    }
    const errorMsg = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
    console.error('Meaning analysis API error:', errorMsg, 'Status:', response.status);
    throw new Error(errorMsg);
  }

  const data = await response.json();
  
  // Persist to localStorage as fallback
  try {
    const user = getCurrentUser();
    if (user?.id) {
      const storageKey = `user_${user.id}_meaning_state`;
      const existing = localStorage.getItem(storageKey);
      let existingData: import('../types').MeaningAnalysisResult = {
        questLogEntries: [],
        soulTimelineEvents: [],
        breakthroughs: []
      };
      
      if (existing) {
        try {
          existingData = JSON.parse(existing);
        } catch (e) {
          console.warn('Failed to parse existing meaning state from localStorage');
        }
      }
      
      // Merge new data with deduplication by id
      const dedupeById = <T extends { id: string }>(arr: T[]): T[] => {
        const seen = new Set<string>();
        return arr.filter(item => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });
      };
      
      const merged: import('../types').MeaningAnalysisResult = {
        questLogEntries: dedupeById([...data.questLogEntries, ...existingData.questLogEntries]),
        soulTimelineEvents: dedupeById([...data.soulTimelineEvents, ...existingData.soulTimelineEvents]),
        breakthroughs: dedupeById([...data.breakthroughs, ...existingData.breakthroughs])
      };
      
      localStorage.setItem(storageKey, JSON.stringify(merged));
    }
  } catch (e) {
    console.warn('Failed to persist meaning state to localStorage:', e);
  }
  
  return data;
}

// Get persisted meaning state
export async function getMeaningState(): Promise<import('../types').MeaningAnalysisResult> {
  const user = getCurrentUser();
  if (!user || !user.id) {
    return {
      questLogEntries: [],
      soulTimelineEvents: [],
      breakthroughs: []
    };
  }

  // Try backend first
  try {
    const response = await fetch(`${API_BASE_URL}/api/meaning/state`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      const data = await response.json();
      // Also update localStorage as backup
      try {
        localStorage.setItem(`user_${user.id}_meaning_state`, JSON.stringify(data));
      } catch (e) {
        console.warn('Failed to backup meaning state to localStorage');
      }
      return data;
    }
  } catch (e) {
    console.warn('Failed to load meaning state from backend, falling back to localStorage');
  }

  // Fallback to localStorage
  try {
    const storageKey = `user_${user.id}_meaning_state`;
    const existing = localStorage.getItem(storageKey);
    if (existing) {
      return JSON.parse(existing);
    }
  } catch (e) {
    console.warn('Failed to load meaning state from localStorage');
  }

  return {
    questLogEntries: [],
    soulTimelineEvents: [],
    breakthroughs: []
  };
}

// Integration endpoint (for questlog integration) - DEPRECATED: Use analyzeMeaning instead
export async function integrateSession(
  sessionHistory: Message[],
  topic?: string
): Promise<{ newLoreEntry?: string; updatedQuest?: string; updatedState?: string; newMilestone?: string; newAttribute?: string }> {
  const response = await fetch(`${API_BASE_URL}/api/integrate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      sessionHistory: sessionHistory,
      topic: topic
    }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: 'unauthorized' };
      }
      
      const reason = errorData.reason || '';
      if (reason.startsWith('invalid_') || reason === 'expired' || reason === 'missing_token' || reason === 'legacy_token_invalid') {
        const { handleAuthError } = await import('./userService');
        handleAuthError();
        const message = errorData.message || errorData.hint || 'Session expired. Please sign in again.';
        throw new Error(message);
      }
      
      const { handleAuthError } = await import('./userService');
      handleAuthError();
      throw new Error(errorData.message || 'Session expired. Please sign in again.');
    }
    
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: 'Unknown error' };
    }
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

