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

export type AdminEntitlement = 'free' | 'paid_beta' | 'founder' | 'blocked';

export interface AdminAccount {
  userId: string;
  username?: string | null;
  displayName: string;
  language?: 'EN' | 'DE' | null;
  createdAt?: string | null;
  updatedAt?: string | null;
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
}

export interface AdminAccountsResponse {
  databaseStatus: 'configured' | 'disabled';
  accounts: AdminAccount[];
}

export const getAdminAccounts = async (): Promise<AdminAccountsResponse> => {
  const response = await fetch(`${getApiBaseUrl()}/api/admin/accounts?ts=${Date.now()}`, {
    method: 'GET',
    headers: getAuthHeaders(),
    cache: 'no-store',
  });

  if (!response.ok) {
    let message = response.status === 403 ? 'Admin access required.' : `Admin request failed: ${response.status}`;
    try {
      const body = await response.json();
      if (typeof body?.message === 'string') {
        message = body.message;
      } else if (typeof body?.error === 'string') {
        message = body.error;
      }
    } catch {
      // Keep HTTP status fallback.
    }
    throw new Error(message);
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
    headers: getAuthHeaders(),
    cache: 'no-store',
    body: JSON.stringify({ admin }),
  });

  if (!response.ok) {
    throw new Error(`Admin update failed: ${response.status}`);
  }

  return response.json();
};
