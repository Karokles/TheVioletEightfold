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
    singleVoiceRepliesPerArchetype: number;
    councilSessions: number;
    councilRepliesPerSession: number;
    blueprintSaves: number;
    cycleDays: number;
  };
  usage: {
    singleVoiceReplies: number;
    singleVoiceRepliesByArchetype: Record<string, number>;
    councilSessions: number;
    blueprintSaves: number;
  };
  beta: {
    priceEur: string;
    accessDays: number;
    provider: 'mock' | 'stripe';
    checkoutAvailable?: boolean;
    paymentLinkAvailable?: boolean;
    bonusAvailable: boolean;
  };
}

export interface CheckoutSessionResponse {
  active?: boolean;
  tier?: AccessStatus['tier'];
  activeUntil?: string | null;
  provider?: 'stripe_checkout' | 'stripe_payment_link';
  sessionId?: string;
  url?: string;
  automaticActivation?: boolean;
  message?: string;
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

export const startBetaCheckout = async (): Promise<CheckoutSessionResponse> => {
  const response = await fetch(`${getApiBaseUrl()}/api/payment/create-checkout-session`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || body.error || `Checkout failed: ${response.status}`);
  }

  return body;
};

export const redirectToBetaCheckout = async (): Promise<CheckoutSessionResponse> => {
  const checkout = await startBetaCheckout();
  if (checkout.url) {
    window.location.href = checkout.url;
  }
  return checkout;
};

export const checkCycleDayAccess = async (day: number): Promise<{ allowed: boolean; message?: string; paywall?: any }> => {
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
    paywall: body,
  };
};
