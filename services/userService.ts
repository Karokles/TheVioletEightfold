import { Language, UserStats } from '../types';
import { getLoreTemplate, getStatsTemplate } from '../config/loader';

const AUTH_TOKEN_KEY = 'vc_auth_token';
const USER_ID_KEY = 'vc_user_id';
const USER_DISPLAY_NAME_KEY = 'vc_user_display_name';
const USER_LANGUAGE_KEY = 'language_preference';
const USER_STATS_KEY = 'stats';
const USER_STATS_BACKUP_KEY = 'stats_backup';
const LOCAL_DISPLAY_NAMES: Record<string, string> = {
  lion: 'karokles',
  tuana: 'Tuana',
};

export interface User {
  id: string;
  token: string;
  displayName?: string;
}

export const getCurrentUser = (): User | null => {
  const userId = localStorage.getItem(USER_ID_KEY);
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const storedDisplayName = localStorage.getItem(USER_DISPLAY_NAME_KEY) || undefined;
  
  if (!userId || !token) {
    return null;
  }

  const displayName = storedDisplayName && storedDisplayName !== userId
    ? storedDisplayName
    : LOCAL_DISPLAY_NAMES[userId] || storedDisplayName;
  
  return { id: userId, token, displayName };
};

export const setCurrentUser = (userId: string, token: string, displayName?: string) => {
  localStorage.setItem(USER_ID_KEY, userId);
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  setCurrentUserDisplayName(displayName);
};

export const setCurrentUserDisplayName = (displayName?: string) => {
  if (displayName?.trim()) {
    localStorage.setItem(USER_DISPLAY_NAME_KEY, displayName.trim());
  } else {
    localStorage.removeItem(USER_DISPLAY_NAME_KEY);
  }
};

export const clearCurrentUser = () => {
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(USER_DISPLAY_NAME_KEY);
};

// Auth error handler: clears tokens and triggers logout event
// This prevents infinite retry loops and provides clean UX
let authErrorHandler: (() => void) | null = null;

export const setAuthErrorHandler = (handler: () => void) => {
  authErrorHandler = handler;
};

export const handleAuthError = () => {
  console.warn('[AUTH] Authentication error detected, clearing tokens');
  clearCurrentUser();
  
  // Trigger logout event for App.tsx to handle
  if (authErrorHandler) {
    authErrorHandler();
  } else {
    // Fallback: reload page to force re-login
    // This is a last resort if handler not set
    console.warn('[AUTH] No auth error handler set, reloading page');
    window.location.reload();
  }
};

export const getUserScopedKey = (key: string, userId: string): string => {
  return `user_${userId}_${key}`;
};

export const loadUserLore = (userId: string): string => {
  const key = getUserScopedKey('lore', userId);
  const saved = localStorage.getItem(key);
  return saved || getLoreTemplate();
};

export const saveUserLore = (userId: string, lore: string) => {
  const key = getUserScopedKey('lore', userId);
  localStorage.setItem(key, lore);
};

export const loadUserStats = (userId: string): UserStats => {
  const keys = [
    getUserScopedKey(USER_STATS_KEY, userId),
    getUserScopedKey(USER_STATS_BACKUP_KEY, userId),
  ];

  for (const key of keys) {
    const saved = localStorage.getItem(key);
    if (!saved) continue;

    try {
      const parsed = JSON.parse(saved);
      return { ...getStatsTemplate(), ...parsed };
    } catch (error) {
      console.error(`Failed to parse user stats from ${key}`, error);
    }
  }

  return getStatsTemplate();
};

export const saveUserStats = (userId: string, stats: UserStats) => {
  const serialized = JSON.stringify(stats);
  localStorage.setItem(getUserScopedKey(USER_STATS_BACKUP_KEY, userId), serialized);
  localStorage.setItem(getUserScopedKey(USER_STATS_KEY, userId), serialized);
};

export const loadUserLanguage = (userId: string): Language => {
  const saved = localStorage.getItem(getUserScopedKey(USER_LANGUAGE_KEY, userId));
  return saved === 'DE' ? 'DE' : 'EN';
};

export const saveUserLanguage = (userId: string, language: Language) => {
  localStorage.setItem(getUserScopedKey(USER_LANGUAGE_KEY, userId), language);
};






