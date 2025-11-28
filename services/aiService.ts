import { ArchetypeId } from '../constants';
import { Language, Message } from '../types';
import { getCurrentUser } from './userService';

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

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
  currentLore: string
): Promise<AsyncIterable<{ text: string }>> => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Build conversation history
  const messages: Message[] = [
    {
      id: '1',
      role: 'user',
      content: message,
      timestamp: Date.now(),
    },
  ];

  // For direct chat, we'll use the council endpoint but with a single archetype focus
  // In a full implementation, you might want a separate /api/chat endpoint
  const response = await fetch(`${API_BASE_URL}/api/council`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      userId: user.id,
      messages,
      userProfile: {
        lore: currentLore,
        activeArchetype: archetypeId,
        language: lang,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to get response');
  }

  const data = await response.json();
  
  // Return a simple async iterable that yields the reply
  // In a full implementation, you'd want streaming support
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
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to start council session');
  }

  const data = await response.json();
  
  return (async function* () {
    yield { text: data.reply || '' };
  })();
};

export const sendMessageToCouncil = async (
  message: string
): Promise<AsyncIterable<{ text: string }>> => {
  // For now, we'll need to maintain session state
  // In a full implementation, you'd want a session ID from the backend
  // This is a simplified version
  throw new Error('Session management not yet implemented. Please start a new council session.');
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

