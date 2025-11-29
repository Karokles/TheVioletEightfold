import { ArchetypeId } from '../constants';
import { Language, Message } from '../types';
import { getCurrentUser } from './userService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Get auth headers for API requests
const getAuthHeaders = () => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${user.token}`,
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
  if (!user) {
    throw new Error('User not authenticated');
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

  // For direct chat, use the council endpoint with activeArchetype set
  // This tells the server to use only that archetype's prompt
  const response = await fetch(`${API_BASE_URL}/api/council`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      userId: user.id,
      messages,
      userProfile: {
        lore: currentLore,
        activeArchetype: archetypeId, // This signals direct chat mode
        language: lang,
      },
    }),
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
    }
    const errorMsg = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
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
  if (!user) {
    throw new Error('User not authenticated');
  }

  const messages: Message[] = [
    {
      id: '1',
      role: 'user',
      content: topic,
      timestamp: Date.now(),
    },
  ];

  const response = await fetch(`${API_BASE_URL}/api/council`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      userId: user.id,
      messages,
      userProfile: {
        lore: currentLore,
        language: lang,
      },
    }),
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
    }
    const errorMsg = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
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
  if (!user) {
    throw new Error('User not authenticated');
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

  const response = await fetch(`${API_BASE_URL}/api/council`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      userId: user.id,
      messages,
      userProfile: {
        lore: currentLore,
        language: lang,
      },
    }),
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
    }
    const errorMsg = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
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
};

