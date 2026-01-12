// Minimal userService for zzzzzz88 folder - matches main repo pattern
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

// Auth error handler: clears tokens and triggers logout event
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
    console.warn('[AUTH] No auth error handler set, reloading page');
    window.location.reload();
  }
};

