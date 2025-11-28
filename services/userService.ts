import { UserStats } from '../types';
import { getLoreTemplate, getStatsTemplate } from '../config/loader';

const AUTH_TOKEN_KEY = 'vc_auth_token';
const USER_ID_KEY = 'vc_user_id';

export interface User {
  id: string;
  token: string;
}

export const getCurrentUser = (): User | null => {
  const userId = localStorage.getItem(USER_ID_KEY);
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  
  if (!userId || !token) {
    return null;
  }
  
  return { id: userId, token };
};

export const setCurrentUser = (userId: string, token: string) => {
  localStorage.setItem(USER_ID_KEY, userId);
  localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const clearCurrentUser = () => {
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
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
  const key = getUserScopedKey('stats', userId);
  const saved = localStorage.getItem(key);
  if (!saved) {
    return getStatsTemplate();
  }
  
  try {
    const parsed = JSON.parse(saved);
    // Merge with template to ensure all fields exist
    return { ...getStatsTemplate(), ...parsed };
  } catch (e) {
    console.error('Failed to parse user stats', e);
    return getStatsTemplate();
  }
};

export const saveUserStats = (userId: string, stats: UserStats) => {
  const key = getUserScopedKey('stats', userId);
  localStorage.setItem(key, JSON.stringify(stats));
};

