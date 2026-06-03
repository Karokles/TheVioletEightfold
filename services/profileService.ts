import { getCurrentUser, setCurrentUserDisplayName } from './userService';

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

export type UserProfile = {
  userId: string;
  displayName: string;
  language?: 'EN' | 'DE' | null;
  activeArchetype?: string | null;
  preferences?: Record<string, unknown>;
};

export const getProfile = async (): Promise<UserProfile | null> => {
  const response = await fetch(`${getApiBaseUrl()}/api/profile`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    return null;
  }

  const profile = await response.json() as UserProfile;
  if (profile.displayName) {
    setCurrentUserDisplayName(profile.displayName);
  }

  return profile;
};

export const updateProfile = async (profile: Partial<UserProfile>): Promise<UserProfile | null> => {
  const response = await fetch(`${getApiBaseUrl()}/api/profile`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    return null;
  }

  const savedProfile = await response.json() as UserProfile;
  if (savedProfile.displayName) {
    setCurrentUserDisplayName(savedProfile.displayName);
  }

  return savedProfile;
};
