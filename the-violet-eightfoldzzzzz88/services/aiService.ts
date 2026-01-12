import { ArchetypeId } from '../constants';
import { Language, Message, ScribeAnalysis } from '../types';
import { getCurrentUser, handleAuthError } from './userService';

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
// CRITICAL: Sets activeArchetype in payload to signal DIRECT mode to backend
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
  // This tells the server to use only that archetype's prompt (DIRECT mode)
  // Note: userId is derived server-side from the auth token, not sent in body
  const response = await fetch(`${API_BASE_URL}/api/council`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      messages,
      userProfile: {
        lore: currentLore,
        activeArchetype: archetypeId, // CRITICAL: This signals direct chat mode
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
        handleAuthError();
        const message = errorData.message || errorData.hint || 'Session expired. Please sign in again.';
        throw new Error(message);
      }
      
      // Other 401 reasons (malformed, etc.) - still clear token
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
  // In DIRECT mode, backend should return plain text (no [[SPEAKER]] tags)
  return (async function* () {
    yield { text: data.reply || '' };
  })();
};

// Council session (multi-archetype)
// CRITICAL: Does NOT set activeArchetype - signals COUNCIL mode to backend
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
  // CRITICAL: Do NOT set activeArchetype - this signals COUNCIL mode
  const response = await fetch(`${API_BASE_URL}/api/council`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      messages,
      userProfile: {
        lore: currentLore,
        language: lang,
        // activeArchetype is NOT set - this signals council mode
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
        handleAuthError();
        const message = errorData.message || errorData.hint || 'Session expired. Please sign in again.';
        throw new Error(message);
      }
      
      // Other 401 reasons (malformed, etc.) - still clear token
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
  // CRITICAL: Do NOT set activeArchetype - this signals COUNCIL mode
  const response = await fetch(`${API_BASE_URL}/api/council`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      messages,
      userProfile: {
        lore: currentLore,
        language: lang,
        // activeArchetype is NOT set - this signals council mode
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
        handleAuthError();
        const message = errorData.message || errorData.hint || 'Session expired. Please sign in again.';
        throw new Error(message);
      }
      
      // Other 401 reasons (malformed, etc.) - still clear token
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

// Questlog integration - calls backend /api/integrate endpoint
// Maps backend response to ScribeAnalysis type
export const integrateSession = async (
  sessionHistory: Message[],
  topic?: string
): Promise<ScribeAnalysis> => {
  const user = getCurrentUser();
  if (!user || !user.id) {
    throw new Error('User not authenticated');
  }

  if (!sessionHistory || !Array.isArray(sessionHistory) || sessionHistory.length === 0) {
    throw new Error('Session history is required');
  }

  const response = await fetch(`${API_BASE_URL}/api/integrate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      sessionHistory,
      topic,
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
    console.error('Integration API error:', errorMsg, 'Status:', response.status);
    throw new Error(errorMsg);
  }

  const data = await response.json();
  
  // Map backend response to ScribeAnalysis type
  // Backend returns: { newLoreEntry, updatedQuest, updatedState, newMilestone, newAttribute }
  // ScribeAnalysis expects: { newLoreEntry?, newMilestone?, newAttribute?, updatedQuest?, updatedState?, ... }
  return {
    newLoreEntry: data.newLoreEntry || undefined,
    updatedQuest: data.updatedQuest || undefined,
    updatedState: data.updatedState || undefined,
    newMilestone: data.newMilestone || undefined,
    newAttribute: data.newAttribute || undefined,
    // Backend may not return these, but ScribeAnalysis allows them
    newLocation: data.newLocation || undefined,
    newCalendarEvent: data.newCalendarEvent || undefined,
    newTransaction: data.newTransaction || undefined,
  };
};

