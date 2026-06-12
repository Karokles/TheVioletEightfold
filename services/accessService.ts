import { getCurrentUser } from './userService';

const getApiBaseUrl = (): string => {
  const url = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (import.meta.env.PROD && !url) {
    throw new Error('VITE_API_BASE_URL is not set.');
  }

  return url || 'http://localhost:3001';
};

const getAuthHeaders = () => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  let token = user.token.trim();
  while (token.startsWith('Bearer ')) {
    token = token.substring(7).trim();
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

export interface AccessStatus {
  userId: string;
  tier: 'free' | 'paid_beta' | 'founder' | 'blocked';
  active: boolean;
  activeUntil: string | null;
  betaActivations: number;
  betaBonusUsed: boolean;
  weeklyResetAt: string;
  freeLimits: {
    singleVoiceReplies: number;
    councilSessions: number;
    councilRepliesPerSession: number;
    blueprintSaves: number;
    cycleDays: number;
  };
  usage: {
    singleVoiceReplies: number;
    councilSessions: number;
    blueprintSaves: number;
  };
  beta: {
    priceEur: string;
    accessDays: number;
    provider: 'mock';
    bonusAvailable: boolean;
  };
}

export const getAccessStatus = async (): Promise<AccessStatus | null> => {
  const response = await fetch(`${getApiBaseUrl()}/api/access/status`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
};

export const checkCycleDayAccess = async (day: number): Promise<{ allowed: boolean; message?: string }> => {
  const response = await fetch(`${getApiBaseUrl()}/api/access/check-cycle-day`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ day }),
  });

  if (response.ok) {
    return { allowed: true };
  }

  const body = await response.json().catch(() => ({}));
  return {
    allowed: false,
    message: body.message || body.error || 'Access required.',
  };
};
