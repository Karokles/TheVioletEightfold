import { createClient, Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseAuthAvailable = Boolean(supabaseUrl && supabasePublishableKey);

export const supabaseAuthClient = isSupabaseAuthAvailable
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
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

const STAGING_ADMIN_EMAILS = new Set(['lionceaunicolai@yahoo.de']);
const STAGING_DISPLAY_NAMES: Record<string, string> = {
  'lionceaunicolai@yahoo.de': 'Karokles',
};

const normalizeEmail = (value?: string | null): string | undefined => {
  const normalized = value?.trim().toLowerCase();
  return normalized && normalized.includes('@') ? normalized : undefined;
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

export const signInWithEmail = async (email: string, password: string): Promise<SupabaseAuthResult> => {
  const client = requireClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return toAuthResult(data.session);
};

export const signUpWithEmail = async (
  email: string,
  password: string,
  displayName?: string
): Promise<{ requiresEmailConfirmation: boolean; userId?: string }> => {
  const client = requireClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName?.trim() || undefined,
      },
      emailRedirectTo: window.location.origin,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    requiresEmailConfirmation: !data.session,
    userId: data.user?.id,
  };
};

export const getSupabaseSession = async (): Promise<SupabaseAuthResult | null> => {
  const client = requireClient();
  const { data, error } = await client.auth.getSession();
  if (error || !data.session) {
    return null;
  }

  return toAuthResult(data.session);
};

export const signOutSupabase = async (): Promise<void> => {
  if (!supabaseAuthClient) {
    return;
  }

  await supabaseAuthClient.auth.signOut();
};
