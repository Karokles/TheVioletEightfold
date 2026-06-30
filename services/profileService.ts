import { getSupabaseSession } from './supabaseAuth';
import { getCurrentUser, handleAuthError, saveUserLanguage, setCurrentUser, setCurrentUserDisplayName } from './userService';

const getApiBaseUrl = (): string => {
  const url = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (import.meta.env.PROD && !url) {
    throw new Error('VITE_API_BASE_URL is not set.');
  }

  return url || 'http://localhost:3001';
};

const getAuthHeaders = async () => {
  const supabaseSession = await getSupabaseSession().catch(() => null);
  if (supabaseSession?.token) {
    setCurrentUser(
      supabaseSession.userId,
      supabaseSession.token,
      supabaseSession.displayName || supabaseSession.email,
    );
  }

  const user = supabaseSession?.token
    ? {
        id: supabaseSession.userId,
        token: supabaseSession.token,
        displayName: supabaseSession.displayName || supabaseSession.email,
      }
    : getCurrentUser();

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

export type UserProfile = {
  userId: string;
  displayName: string;
  language?: 'EN' | 'DE' | null;
  activeArchetype?: string | null;
  preferences?: Record<string, unknown>;
  isAdmin?: boolean;
};

const delay = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms));

export const getProfile = async (options: { retries?: number } = {}): Promise<UserProfile | null> => {
  const maxAttempts = Math.max(1, (options.retries || 0) + 1);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(`${getApiBaseUrl()}/api/profile?ts=${Date.now()}`, {
      method: 'GET',
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (response.ok) {
      const profile = await response.json() as UserProfile;
      if (profile.displayName) {
        setCurrentUserDisplayName(profile.displayName);
      }
      if ((profile.language === 'DE' || profile.language === 'EN') && profile.userId) {
        saveUserLanguage(profile.userId, profile.language);
      }

      return profile;
    }

    if (response.status === 401) {
      handleAuthError();
      return null;
    }

    if (response.status === 403 || attempt === maxAttempts) {
      return null;
    }

    await delay(450 * attempt);
  }

  return null;
};

export const updateProfile = async (profile: Partial<UserProfile>): Promise<UserProfile | null> => {
  const response = await fetch(`${getApiBaseUrl()}/api/profile`, {
    method: 'PUT',
    headers: await getAuthHeaders(),
    cache: 'no-store',
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    if (response.status === 401) {
      handleAuthError();
    }
    return null;
  }

  const savedProfile = await response.json() as UserProfile;
  if (savedProfile.displayName) {
    setCurrentUserDisplayName(savedProfile.displayName);
  }
  if ((savedProfile.language === 'DE' || savedProfile.language === 'EN') && savedProfile.userId) {
    saveUserLanguage(savedProfile.userId, savedProfile.language);
  }

  return savedProfile;
};
