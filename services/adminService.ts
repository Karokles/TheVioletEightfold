import { getSupabaseSession } from './supabaseAuth';
import { getCurrentUser, handleAuthError, setCurrentUser } from './userService';

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

const readAdminErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  if (response.status === 401) {
    handleAuthError();
    return 'Your admin session is no longer valid. Please sign in again.';
  }

  try {
    const body = await response.json();
    if (typeof body?.message === 'string') {
      return body.message;
    }
    if (typeof body?.error === 'string') {
      return body.error;
    }
  } catch {
    // Keep fallback.
  }

  return fallback;
};

export type AdminEntitlement = 'free' | 'paid_beta' | 'founder' | 'blocked';

export interface AdminAccount {
  userId: string;
  username?: string | null;
  displayName: string;
  language?: 'EN' | 'DE' | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  emailConfirmedAt?: string | null;
  lastSignInAt?: string | null;
  entitlement: AdminEntitlement;
  offlineOnly: boolean;
  activeUntil?: string | null;
  betaActivations?: number;
  betaBonusUsed?: boolean;
  notes?: string | null;
  limits: {
    weeklyFreeInteractions: number | null;
    weeklyCouncilSessions: number | null;
    weeklyMeaningAnalyses: number | null;
  };
  usage?: {
    totalInteractions: number;
    weeklyInteractions: number;
    directChatReplies: number;
    councilSessions: number;
    blueprintSaves: number;
    cycleUnlocks: number;
    persistedDirectSessions: number;
    persistedCouncilSessions: number;
    persistedMessages: number;
    persistedUserMessages: number;
    lastInteractionAt?: string | null;
  };
}

export interface AdminAccountsResponse {
  databaseStatus: 'configured' | 'disabled';
  accounts: AdminAccount[];
}

export interface CreateAdminAccountInput {
  email: string;
  password: string;
  displayName: string;
  emailConfirm: boolean;
  admin?: {
    entitlement?: AdminEntitlement;
    offlineOnly?: boolean;
    activeUntil?: string | null;
    betaActivations?: number;
    betaBonusUsed?: boolean;
    notes?: string | null;
    weeklyFreeInteractions?: number | null;
    weeklyCouncilSessions?: number | null;
    weeklyMeaningAnalyses?: number | null;
  };
}

export interface CreateAdminAccountResponse {
  action: 'created' | 'updated_existing';
  emailConfirmed: boolean;
  account: AdminAccount;
}

export const getAdminAccounts = async (): Promise<AdminAccountsResponse> => {
  const response = await fetch(`${getApiBaseUrl()}/api/admin/accounts?ts=${Date.now()}`, {
    method: 'GET',
    headers: await getAuthHeaders(),
    cache: 'no-store',
  });

  if (!response.ok) {
    const message = response.status === 403 ? 'Admin access required.' : `Admin request failed: ${response.status}`;
    throw new Error(await readAdminErrorMessage(response, message));
  }

  return response.json();
};

export const createAdminAccount = async (
  input: CreateAdminAccountInput,
): Promise<CreateAdminAccountResponse> => {
  const response = await fetch(`${getApiBaseUrl()}/api/admin/accounts`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    cache: 'no-store',
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await readAdminErrorMessage(response, `Admin create failed: ${response.status}`));
  }

  return response.json();
};

export const updateAdminAccount = async (
  userId: string,
  admin: {
    entitlement: AdminEntitlement;
    offlineOnly: boolean;
    activeUntil?: string | null;
    betaActivations?: number;
    betaBonusUsed?: boolean;
    notes?: string | null;
    weeklyFreeInteractions: number | null;
    weeklyCouncilSessions: number | null;
    weeklyMeaningAnalyses: number | null;
  },
) => {
  const response = await fetch(`${getApiBaseUrl()}/api/admin/accounts/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    headers: await getAuthHeaders(),
    cache: 'no-store',
    body: JSON.stringify({ admin }),
  });

  if (!response.ok) {
    throw new Error(await readAdminErrorMessage(response, `Admin update failed: ${response.status}`));
  }

  return response.json();
};

export const deleteAdminAccount = async (userId: string): Promise<void> => {
  const response = await fetch(`${getApiBaseUrl()}/api/admin/accounts/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(await readAdminErrorMessage(response, `Admin delete failed: ${response.status}`));
  }
};
