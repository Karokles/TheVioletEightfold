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

export type AdminEntitlement = 'free' | 'founder' | 'blocked';

export interface AdminAccount {
  userId: string;
  username?: string | null;
  displayName: string;
  language?: 'EN' | 'DE' | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  entitlement: AdminEntitlement;
  offlineOnly: boolean;
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
  const response = await fetch(`${getApiBaseUrl()}/api/admin/accounts`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(response.status === 403 ? 'Admin access required.' : `Admin request failed: ${response.status}`);
  }

  return response.json();
};

export const updateAdminAccount = async (
  userId: string,
  admin: {
    entitlement: AdminEntitlement;
    offlineOnly: boolean;
    weeklyFreeInteractions: number | null;
    weeklyCouncilSessions: number | null;
    weeklyMeaningAnalyses: number | null;
  },
) => {
  const response = await fetch(`${getApiBaseUrl()}/api/admin/accounts/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ admin }),
  });

  if (!response.ok) {
    throw new Error(`Admin update failed: ${response.status}`);
  }

  return response.json();
};
