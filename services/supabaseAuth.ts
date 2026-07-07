import { createClient, Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseAuthAvailable = Boolean(supabaseUrl && supabasePublishableKey);

export const supabaseAuthClient = isSupabaseAuthAvailable
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  : null;

const requireClient = () => {
  if (!supabaseAuthClient) {
    throw new Error('Supabase Auth is not configured for this environment.');
  }

  return supabaseAuthClient;
};

export type SupabaseAuthResult = {
  userId: string;
  token: string;
  email?: string;
  displayName?: string;
  isStagingAdmin?: boolean;
};

type EmailOtpType = 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change' | 'email';

const AUTH_REDIRECT_PARAMS = [
  'access_token',
  'code',
  'error',
  'error_code',
  'error_description',
  'expires_at',
  'expires_in',
  'provider_refresh_token',
  'provider_token',
  'refresh_token',
  'token_hash',
  'token_type',
  'type',
];

let authRedirectPromise: Promise<SupabaseAuthResult | null> | null = null;

const STAGING_ADMIN_EMAILS = new Set(['lionceaunicolai@yahoo.de']);
const STAGING_DISPLAY_NAMES: Record<string, string> = {
  'lionceaunicolai@yahoo.de': 'Karokles',
};

const normalizeEmail = (value?: string | null): string | undefined => {
  const normalized = value?.trim().toLowerCase();
  return normalized && normalized.includes('@') ? normalized : undefined;
};

const getAuthRedirectTo = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  return `${window.location.origin}${window.location.pathname}`;
};

const getUrlAuthParams = (): URLSearchParams => {
  const params = new URLSearchParams();
  if (typeof window === 'undefined') return params;

  const url = new URL(window.location.href);
  url.searchParams.forEach((value, key) => {
    params.set(key, value);
  });

  const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
  if (hash && hash.includes('=')) {
    const hashParams = new URLSearchParams(hash);
    hashParams.forEach((value, key) => {
      params.set(key, value);
    });
  }

  return params;
};

export const hasSupabaseAuthRedirectParams = (): boolean => {
  const params = getUrlAuthParams();
  return Boolean(
    params.get('access_token') ||
    params.get('code') ||
    params.get('error') ||
    params.get('error_description') ||
    params.get('token_hash')
  );
};

const cleanAuthRedirectUrl = (): void => {
  if (typeof window === 'undefined' || !hasSupabaseAuthRedirectParams()) return;

  const url = new URL(window.location.href);
  AUTH_REDIRECT_PARAMS.forEach(param => {
    url.searchParams.delete(param);
  });

  const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
  if (hash && hash.includes('=')) {
    const hashParams = new URLSearchParams(hash);
    const hasAuthHash = AUTH_REDIRECT_PARAMS.some(param => hashParams.has(param));
    if (hasAuthHash) {
      url.hash = '';
    }
  }

  window.history.replaceState(window.history.state, document.title, url.toString());
};

const normalizeOtpType = (value?: string | null): EmailOtpType => {
  const normalized = value === 'signup' ||
    value === 'invite' ||
    value === 'magiclink' ||
    value === 'recovery' ||
    value === 'email_change' ||
    value === 'email'
    ? value
    : 'signup';
  return normalized;
};

const getFallbackDisplayName = (email?: string | null, userId?: string): string | undefined => {
  const normalized = normalizeEmail(email);
  if (normalized && STAGING_DISPLAY_NAMES[normalized]) {
    return STAGING_DISPLAY_NAMES[normalized];
  }

  if (normalized) {
    return normalized.split('@')[0];
  }

  return userId;
};

const getDisplayNameFromSession = (session: Session): string | undefined => {
  const metadata = session.user.user_metadata || {};
  const normalizedEmail = normalizeEmail(session.user.email);
  const candidate =
    metadata.display_name ||
    metadata.name ||
    metadata.full_name ||
    metadata.preferred_username;

  if (normalizedEmail && STAGING_DISPLAY_NAMES[normalizedEmail]) {
    return STAGING_DISPLAY_NAMES[normalizedEmail];
  }

  if (typeof candidate === 'string' && candidate.trim() && normalizeEmail(candidate) !== candidate.trim().toLowerCase()) {
    return candidate.trim();
  }

  return getFallbackDisplayName(session.user.email, session.user.id);
};

const toAuthResult = (session: Session | null): SupabaseAuthResult => {
  if (!session?.access_token || !session.user?.id) {
    throw new Error('No active Supabase session returned.');
  }

  return {
    userId: session.user.id,
    token: session.access_token,
    email: session.user.email || undefined,
    displayName: getDisplayNameFromSession(session),
    isStagingAdmin: STAGING_ADMIN_EMAILS.has(normalizeEmail(session.user.email) || ''),
  };
};

const getStoredSupabaseSession = async (): Promise<SupabaseAuthResult | null> => {
  const client = requireClient();
  const { data, error } = await client.auth.getSession();
  if (error || !data.session) {
    return null;
  }

  return toAuthResult(data.session);
};

const consumeAuthRedirectOnce = async (): Promise<SupabaseAuthResult | null> => {
  const client = requireClient();
  const params = getUrlAuthParams();

  if (!hasSupabaseAuthRedirectParams()) {
    return getStoredSupabaseSession();
  }

  const errorDescription = params.get('error_description') || params.get('error');
  if (errorDescription) {
    cleanAuthRedirectUrl();
    throw new Error(errorDescription.replace(/\+/g, ' '));
  }

  try {
    const code = params.get('code');
    if (code) {
      const { data, error } = await client.auth.exchangeCodeForSession(code);
      if (error) {
        const message = error.message.toLowerCase();
        if (message.includes('code verifier') || message.includes('flow state') || message.includes('auth code')) {
          return getStoredSupabaseSession();
        }
        throw error;
      }
      return toAuthResult(data.session);
    }

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (accessToken && refreshToken) {
      const { data, error } = await client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) throw error;
      return toAuthResult(data.session);
    }

    const tokenHash = params.get('token_hash');
    if (tokenHash) {
      const { data, error } = await client.auth.verifyOtp({
        token_hash: tokenHash,
        type: normalizeOtpType(params.get('type')),
      });
      if (error) throw error;
      return data.session ? toAuthResult(data.session) : getStoredSupabaseSession();
    }

    return getStoredSupabaseSession();
  } finally {
    cleanAuthRedirectUrl();
  }
};

export const consumeSupabaseAuthRedirect = async (): Promise<SupabaseAuthResult | null> => {
  if (!authRedirectPromise) {
    authRedirectPromise = consumeAuthRedirectOnce().finally(() => {
      authRedirectPromise = null;
    });
  }

  return authRedirectPromise;
};

export const signInWithEmail = async (email: string, password: string): Promise<SupabaseAuthResult> => {
  const client = requireClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: normalizeEmail(email) || email.trim(),
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return toAuthResult(data.session);
};

export const changePasswordWithCurrentPassword = async (
  email: string,
  currentPassword: string,
  newPassword: string
): Promise<SupabaseAuthResult> => {
  const client = requireClient();
  const normalizedEmail = normalizeEmail(email) || email.trim();
  const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
    email: normalizedEmail,
    password: currentPassword,
  });

  if (signInError) {
    throw new Error(signInError.message);
  }

  if (!signInData.session) {
    throw new Error('No active Supabase session returned.');
  }

  const { error } = await client.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data: refreshedSession, error: sessionError } = await client.auth.getSession();
  if (sessionError) {
    throw new Error(sessionError.message);
  }

  return toAuthResult(refreshedSession.session || signInData.session);
};

export const signUpWithEmail = async (
  email: string,
  password: string,
  displayName?: string
): Promise<{ requiresEmailConfirmation: boolean; userId?: string; authResult?: SupabaseAuthResult; email?: string }> => {
  const client = requireClient();
  const normalizedEmail = normalizeEmail(email) || email.trim();
  const { data, error } = await client.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        display_name: displayName?.trim() || undefined,
      },
      emailRedirectTo: getAuthRedirectTo(),
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    requiresEmailConfirmation: !data.session,
    userId: data.user?.id,
    authResult: data.session ? toAuthResult(data.session) : undefined,
    email: normalizedEmail,
  };
};

export const getSupabaseSession = async (): Promise<SupabaseAuthResult | null> => {
  if (hasSupabaseAuthRedirectParams()) {
    return consumeSupabaseAuthRedirect();
  }

  return getStoredSupabaseSession();
};

export const resendSignupConfirmation = async (email: string): Promise<void> => {
  const client = requireClient();
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error('Please enter a valid email address.');
  }

  const { error } = await client.auth.resend({
    type: 'signup',
    email: normalizedEmail,
    options: {
      emailRedirectTo: getAuthRedirectTo(),
    },
  });

  if (error) {
    throw new Error(error.message);
  }
};

export const signOutSupabase = async (): Promise<void> => {
  if (!supabaseAuthClient) {
    return;
  }

  await supabaseAuthClient.auth.signOut();
};
