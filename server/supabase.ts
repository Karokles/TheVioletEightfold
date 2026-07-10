import { createClient } from '@supabase/supabase-js';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { runtimeConfig, serviceReadiness } from './runtimeConfig.js';

// Supabase configuration with feature flag
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_AUTH_ADMIN_KEY = process.env.SUPABASE_AUTH_ADMIN_KEY
  || process.env.SUPABASE_SERVICE_ROLE_JWT
  || SUPABASE_SERVICE_ROLE_KEY;

let supabaseClient: ReturnType<typeof createClient> | null = null;
let supabaseAuthAdminClient: ReturnType<typeof createClient> | null = null;

// Initialize Supabase client if env vars are set
if (serviceReadiness.database && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  supabaseAuthAdminClient = createClient(SUPABASE_URL, SUPABASE_AUTH_ADMIN_KEY || SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  console.log('[SUPABASE] Client initialized');
} else {
  console.warn(`[SUPABASE] Database disabled. DATABASE_ENABLED=${runtimeConfig.databaseEnabled}, credentials=${runtimeConfig.hasDatabaseCredentials}.`);
}

export const getSupabaseClient = () => {
  if (!supabaseClient) {
    throw new Error('Supabase client not initialized. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  }
  return supabaseClient;
};

export const getSupabaseAuthAdminClient = () => {
  if (!supabaseAuthAdminClient) {
    throw new Error('Supabase auth admin client not initialized. Check SUPABASE_URL and SUPABASE_AUTH_ADMIN_KEY/SUPABASE_SERVICE_ROLE_KEY.');
  }
  return supabaseAuthAdminClient;
};

export const isSupabaseConfigured = () => {
  return !!supabaseClient;
};

export const getSupabaseAdminKeyInfo = () => {
  const key = SUPABASE_AUTH_ADMIN_KEY || '';
  return {
    hasAuthAdminKey: Boolean(key),
    authAdminKeyKind: key.startsWith('eyJ')
      ? 'jwt_service_role'
      : key.startsWith('sb_secret_')
        ? 'supabase_secret'
        : key
          ? 'other'
          : 'missing',
  };
};

export const checkSupabaseAuthAdmin = async (): Promise<{ ok: boolean; message?: string }> => {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: 'Supabase is not configured.' };
  }

  try {
    const { error } = await getSupabaseAuthAdminClient().auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true };
  } catch (error: any) {
    return { ok: false, message: error?.message || 'Unknown Supabase Auth admin error.' };
  }
};

export const getSupabaseAuthUser = async (accessToken: string): Promise<SupabaseAuthUser | null> => {
  if (!isSupabaseConfigured() || !serviceReadiness.supabaseAuth) {
    return null;
  }

  try {
    const { data, error } = await getSupabaseClient().auth.getUser(accessToken);
    if (error) {
      console.warn('[SUPABASE_AUTH] Token verification failed:', error.message);
      return null;
    }

    return data.user || null;
  } catch (error: any) {
    console.warn('[SUPABASE_AUTH] Error verifying token:', error.message);
    return null;
  }
};

export interface AdminAuthUserInput {
  email: string;
  password: string;
  displayName: string;
  emailConfirm?: boolean;
}

export interface AdminAuthUserResult {
  action: 'created' | 'updated_existing';
  user: {
    id: string;
    email?: string | null;
    email_confirmed_at?: string | null;
    confirmed_at?: string | null;
  };
}

const isExistingUserError = (message: string): boolean => {
  return /already|registered|exists|duplicate/i.test(message);
};

const findAuthUserByEmail = async (email: string): Promise<AdminAuthUserResult['user'] | null> => {
  const normalizedEmail = email.trim().toLowerCase();
  const perPage = 1000;

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await getSupabaseAuthAdminClient().auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(error.message);
    }

    const found = data.users.find(user => user.email?.toLowerCase() === normalizedEmail);
    if (found) {
      return found;
    }
    if (data.users.length < perPage) {
      return null;
    }
  }

  return null;
};

export const createOrUpdateConfirmedAuthUser = async (
  input: AdminAuthUserInput,
): Promise<AdminAuthUserResult> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase client not initialized.');
  }

  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();
  const userMetadata = {
    display_name: displayName,
    full_name: displayName,
    name: displayName,
  };
  const emailConfirm = input.emailConfirm !== false;

  const { data, error } = await getSupabaseAuthAdminClient().auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: emailConfirm,
    user_metadata: userMetadata,
  });

  if (!error && data.user) {
    return { action: 'created', user: data.user };
  }

  const message = error?.message || 'Unable to create auth user.';
  if (!isExistingUserError(message)) {
    throw new Error(message);
  }

  const existingUser = await findAuthUserByEmail(email);
  if (!existingUser) {
    throw new Error('Auth user exists, but could not be found for update.');
  }

  const update = await getSupabaseAuthAdminClient().auth.admin.updateUserById(existingUser.id, {
    password: input.password,
    email_confirm: emailConfirm,
    user_metadata: {
      ...(existingUser as any).user_metadata,
      ...userMetadata,
    },
  } as any);

  if (update.error || !update.data.user) {
    throw new Error(update.error?.message || 'Unable to update existing auth user.');
  }

  return { action: 'updated_existing', user: update.data.user };
};

// User management
export interface DbUser {
  id: string;
  username: string;
  secret_hash: string;
  created_at?: string;
  updated_at?: string;
}

export const ensureUserExists = async (userId: string, username: string, secretHash: string): Promise<void> => {
  if (!isSupabaseConfigured()) {
    return; // Fallback to in-memory
  }

  try {
    const { error } = await getSupabaseClient()
      .from('users')
      .upsert({
        id: userId,
        username: username,
        secret_hash: secretHash,
        updated_at: new Date().toISOString()
      } as any, {
        onConflict: 'id'
      });

    if (error) {
      console.error('[SUPABASE] Error ensuring user exists:', error.message);
      // Don't throw - fallback to in-memory
    }
  } catch (error: any) {
    console.error('[SUPABASE] Error in ensureUserExists:', error.message);
    // Don't throw - fallback to in-memory
  }
};

// User profiles
export interface UserProfileRecord {
  user_id: string;
  display_name?: string | null;
  language?: string | null;
  active_archetype?: string | null;
  preferences?: any;
  created_at?: string;
  updated_at?: string;
}

export const getUserProfile = async (userId: string): Promise<UserProfileRecord | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data, error } = await getSupabaseClient()
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[SUPABASE] Error fetching user profile:', error.message);
      return null;
    }

    return data ? (data as UserProfileRecord) : null;
  } catch (error: any) {
    console.error('[SUPABASE] Error in getUserProfile:', error.message);
    return null;
  }
};

export const upsertUserProfile = async (profile: UserProfileRecord): Promise<UserProfileRecord | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data, error } = await getSupabaseClient()
      .from('user_profiles')
      .upsert({
        ...profile,
        updated_at: new Date().toISOString()
      } as any, {
        onConflict: 'user_id'
      })
      .select('*')
      .single();

    if (error) {
      console.error('[SUPABASE] Error upserting user profile:', error.message);
      return null;
    }

    return (data as UserProfileRecord) || null;
  } catch (error: any) {
    console.error('[SUPABASE] Error in upsertUserProfile:', error.message);
    return null;
  }
};

export interface AdminAccountRecord {
  user_id: string;
  username?: string | null;
  email_confirmed_at?: string | null;
  last_sign_in_at?: string | null;
  auth_created_at?: string | null;
  display_name?: string | null;
  language?: string | null;
  preferences?: any;
  access?: UserAccessRecord | null;
  usage?: UsageCounterRecord[];
  usageSummary?: AdminUsageSummaryRecord;
  created_at?: string | null;
  updated_at?: string | null;
  profile_created_at?: string | null;
  profile_updated_at?: string | null;
}

export interface AdminUsageSummaryRecord {
  user_id: string;
  total_interactions: number;
  weekly_interactions: number;
  direct_chat_replies: number;
  council_sessions: number;
  blueprint_saves: number;
  cycle_unlocks: number;
  persisted_direct_sessions: number;
  persisted_council_sessions: number;
  persisted_messages: number;
  persisted_user_messages: number;
  last_interaction_at: string | null;
}

export type AccessTier = 'free' | 'paid_beta' | 'founder' | 'blocked';

export interface UserAccessRecord {
  user_id: string;
  tier: AccessTier;
  beta_activations: number;
  beta_bonus_used: boolean;
  active_until?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface UsageCounterRecord {
  user_id: string;
  period_key: string;
  feature: string;
  count: number;
  created_at?: string;
  updated_at?: string;
}

export const getUserAccess = async (userId: string): Promise<UserAccessRecord | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data, error } = await getSupabaseClient()
      .from('user_access')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[SUPABASE] Error fetching user access:', error.message);
      return null;
    }

    return data ? (data as UserAccessRecord) : null;
  } catch (error: any) {
    console.error('[SUPABASE] Error in getUserAccess:', error.message);
    return null;
  }
};

export const upsertUserAccess = async (access: UserAccessRecord): Promise<UserAccessRecord | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data, error } = await getSupabaseClient()
      .from('user_access')
      .upsert({
        ...access,
        updated_at: new Date().toISOString()
      } as any, {
        onConflict: 'user_id'
      })
      .select('*')
      .single();

    if (error) {
      console.error('[SUPABASE] Error upserting user access:', error.message);
      return null;
    }

    return (data as UserAccessRecord) || null;
  } catch (error: any) {
    console.error('[SUPABASE] Error in upsertUserAccess:', error.message);
    return null;
  }
};

export const listUserAccessRecords = async (): Promise<UserAccessRecord[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data, error } = await getSupabaseClient()
      .from('user_access')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[SUPABASE] Error listing user access records:', error.message);
      return [];
    }

    return (data as UserAccessRecord[]) || [];
  } catch (error: any) {
    console.error('[SUPABASE] Error in listUserAccessRecords:', error.message);
    return [];
  }
};

export const getUsageCounter = async (
  userId: string,
  periodKey: string,
  feature: string,
): Promise<UsageCounterRecord | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data, error } = await getSupabaseClient()
      .from('usage_counters')
      .select('*')
      .eq('user_id', userId)
      .eq('period_key', periodKey)
      .eq('feature', feature)
      .maybeSingle();

    if (error) {
      console.error('[SUPABASE] Error fetching usage counter:', error.message);
      return null;
    }

    return data ? (data as UsageCounterRecord) : null;
  } catch (error: any) {
    console.error('[SUPABASE] Error in getUsageCounter:', error.message);
    return null;
  }
};

export const incrementUsageCounter = async (
  userId: string,
  periodKey: string,
  feature: string,
): Promise<UsageCounterRecord | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const existing = await getUsageCounter(userId, periodKey, feature);
    const nextCount = (existing?.count || 0) + 1;
    const { data, error } = await getSupabaseClient()
      .from('usage_counters')
      .upsert({
        user_id: userId,
        period_key: periodKey,
        feature,
        count: nextCount,
        updated_at: new Date().toISOString()
      } as any, {
        onConflict: 'user_id,period_key,feature'
      })
      .select('*')
      .single();

    if (error) {
      console.error('[SUPABASE] Error incrementing usage counter:', error.message);
      return null;
    }

    return (data as UsageCounterRecord) || null;
  } catch (error: any) {
    console.error('[SUPABASE] Error in incrementUsageCounter:', error.message);
    return null;
  }
};

export const listUsageCountersForPeriod = async (periodKey: string): Promise<UsageCounterRecord[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data, error } = await getSupabaseClient()
      .from('usage_counters')
      .select('*')
      .eq('period_key', periodKey);

    if (error) {
      console.error('[SUPABASE] Error listing usage counters:', error.message);
      return [];
    }

    return (data as UsageCounterRecord[]) || [];
  } catch (error: any) {
    console.error('[SUPABASE] Error in listUsageCountersForPeriod:', error.message);
    return [];
  }
};

const emptyAdminUsageSummary = (userId: string): AdminUsageSummaryRecord => ({
  user_id: userId,
  total_interactions: 0,
  weekly_interactions: 0,
  direct_chat_replies: 0,
  council_sessions: 0,
  blueprint_saves: 0,
  cycle_unlocks: 0,
  persisted_direct_sessions: 0,
  persisted_council_sessions: 0,
  persisted_messages: 0,
  persisted_user_messages: 0,
  last_interaction_at: null,
});

const keepLatestTimestamp = (left?: string | null, right?: string | null): string | null => {
  if (!left) return right || null;
  if (!right) return left;
  return right > left ? right : left;
};

const getWeekKeyForDate = (value?: string | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const firstDayOfYear = Date.UTC(date.getUTCFullYear(), 0, 1);
  const today = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const week = Math.ceil(((today - firstDayOfYear) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${week}`;
};

const listAllRows = async <T>(table: string, columns: string): Promise<T[]> => {
  const rows: T[] = [];
  const pageSize = 1000;

  for (let from = 0; from < 100000; from += pageSize) {
    const { data, error } = await getSupabaseClient()
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1);

    if (error) {
      console.error(`[SUPABASE] Error listing ${table}:`, error.message);
      return rows;
    }

    rows.push(...((data || []) as T[]));
    if (!data || data.length < pageSize) {
      return rows;
    }
  }

  return rows;
};

const getSessionMessages = (value: any): any[] => {
  if (!value || typeof value !== 'object') {
    return [];
  }

  const directMessages = Array.isArray(value.messages) ? value.messages : [];
  const nestedMessages = Array.isArray(value.messages?.messages) ? value.messages.messages : [];
  return nestedMessages.length > 0 ? nestedMessages : directMessages;
};

const countUserMessages = (messages: any[]): number => {
  return messages.filter(message => message?.role === 'user' && String(message?.content || '').trim()).length;
};

const countAllMessages = (messages: any[], hasReply: boolean): number => {
  const visibleMessages = messages.filter(message => String(message?.content || '').trim()).length;
  return visibleMessages + (hasReply ? 1 : 0);
};

export const listAdminUsageSummaries = async (periodKey: string): Promise<AdminUsageSummaryRecord[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const [usageCounters, councilSessions, councilMessages] = await Promise.all([
      listAllRows<UsageCounterRecord>('usage_counters', 'user_id, period_key, feature, count, created_at, updated_at'),
      listAllRows<{ user_id: string; mode?: string | null; messages?: any; created_at?: string | null; updated_at?: string | null }>(
        'council_sessions',
        'user_id, mode, messages, created_at, updated_at',
      ),
      listAllRows<{ user_id: string; role?: string | null; created_at?: string | null }>(
        'council_messages',
        'user_id, role, created_at',
      ),
    ]);

    const byUser = new Map<string, AdminUsageSummaryRecord>();
    const getSummary = (userId: string) => {
      const existing = byUser.get(userId);
      if (existing) return existing;
      const created = emptyAdminUsageSummary(userId);
      byUser.set(userId, created);
      return created;
    };

    usageCounters.forEach(counter => {
      const summary = getSummary(counter.user_id);
      const count = Math.max(0, Number(counter.count) || 0);
      summary.total_interactions += count;
      if (counter.period_key === periodKey) {
        summary.weekly_interactions += count;
      }
      if (counter.feature === 'council_session') {
        summary.council_sessions += count;
      } else if (counter.feature === 'blueprint_save') {
        summary.blueprint_saves += count;
      } else if (counter.feature === 'cycle_day_6') {
        summary.cycle_unlocks += count;
      } else if (counter.feature === 'single_voice_reply' || counter.feature.startsWith('single_voice_reply:')) {
        summary.direct_chat_replies += count;
      }
      summary.last_interaction_at = keepLatestTimestamp(
        summary.last_interaction_at,
        counter.updated_at || counter.created_at || null,
      );
    });

    const sessionDerivedCounts = new Map<string, { directUserMessages: number; weeklyInteractions: number }>();
    councilSessions.forEach(session => {
      const summary = getSummary(session.user_id);
      const existingDerived = sessionDerivedCounts.get(session.user_id) || { directUserMessages: 0, weeklyInteractions: 0 };
      const sessionMessages = getSessionMessages(session.messages);
      const userMessageCount = countUserMessages(sessionMessages);
      const allMessageCount = countAllMessages(
        sessionMessages,
        Boolean(session.messages && typeof session.messages === 'object' && String(session.messages.reply || '').trim()),
      );

      if (session.mode === 'direct') {
        summary.persisted_direct_sessions += 1;
        existingDerived.directUserMessages += userMessageCount;
      } else if (session.mode === 'council') {
        summary.persisted_council_sessions += 1;
        summary.council_sessions = Math.max(summary.council_sessions, summary.persisted_council_sessions);
      }
      if (getWeekKeyForDate(session.updated_at || session.created_at) === periodKey) {
        existingDerived.weeklyInteractions += userMessageCount + (session.mode === 'council' ? 1 : 0);
      }
      sessionDerivedCounts.set(session.user_id, existingDerived);
      summary.persisted_user_messages += userMessageCount;
      summary.persisted_messages += allMessageCount;
      summary.last_interaction_at = keepLatestTimestamp(
        summary.last_interaction_at,
        session.updated_at || session.created_at || null,
      );
    });

    sessionDerivedCounts.forEach((counts, userId) => {
      const summary = getSummary(userId);
      summary.direct_chat_replies = Math.max(summary.direct_chat_replies, counts.directUserMessages);
      summary.weekly_interactions = Math.max(summary.weekly_interactions, counts.weeklyInteractions);
    });

    const messageTableCounts = new Map<string, { messages: number; userMessages: number }>();
    councilMessages.forEach(message => {
      const existing = messageTableCounts.get(message.user_id) || { messages: 0, userMessages: 0 };
      existing.messages += 1;
      if (message.role === 'user') {
        existing.userMessages += 1;
      }
      messageTableCounts.set(message.user_id, existing);

      const summary = getSummary(message.user_id);
      summary.last_interaction_at = keepLatestTimestamp(summary.last_interaction_at, message.created_at || null);
    });

    messageTableCounts.forEach((counts, userId) => {
      const summary = getSummary(userId);
      summary.persisted_messages = Math.max(summary.persisted_messages, counts.messages);
      summary.persisted_user_messages = Math.max(summary.persisted_user_messages, counts.userMessages);
    });

    byUser.forEach(summary => {
      const persistedFeatureInteractions = summary.blueprint_saves + summary.cycle_unlocks;
      summary.total_interactions = Math.max(
        summary.total_interactions,
        summary.persisted_user_messages + summary.persisted_council_sessions + persistedFeatureInteractions,
      );
    });

    return Array.from(byUser.values());
  } catch (error: any) {
    console.error('[SUPABASE] Error in listAdminUsageSummaries:', error.message);
    return [];
  }
};

export const listAdminAccounts = async (periodKey: string): Promise<AdminAccountRecord[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const authUsers: SupabaseAuthUser[] = [];
    const perPage = 1000;
    for (let page = 1; page <= 20; page += 1) {
      const { data, error } = await getSupabaseAuthAdminClient().auth.admin.listUsers({ page, perPage });
      if (error) {
        throw new Error(`Supabase Auth admin unavailable: ${error.message}`);
      }

      authUsers.push(...data.users);
      if (data.users.length < perPage) {
        break;
      }
    }

    const [
      { data: users, error: usersError },
      { data: profiles, error: profilesError },
      accessRecords,
      usageSummaries,
    ] = await Promise.all([
      getSupabaseClient()
        .from('users')
        .select('id, username, created_at, updated_at')
        .order('updated_at', { ascending: false }),
      getSupabaseClient()
        .from('user_profiles')
        .select('user_id, display_name, language, preferences, created_at, updated_at')
        .order('updated_at', { ascending: false }),
      listUserAccessRecords(),
      listAdminUsageSummaries(periodKey),
    ]);

    if (usersError) {
      console.error('[SUPABASE] Error listing admin users:', usersError.message);
    }
    if (profilesError) {
      console.error('[SUPABASE] Error listing admin profiles:', profilesError.message);
    }

    const byId = new Map<string, AdminAccountRecord>();
    authUsers.forEach(authUser => {
      const metadata = authUser.user_metadata || {};
      byId.set(authUser.id, {
        user_id: authUser.id,
        username: authUser.email || null,
        display_name: metadata.display_name || metadata.full_name || metadata.name || null,
        email_confirmed_at: authUser.email_confirmed_at || null,
        last_sign_in_at: authUser.last_sign_in_at || null,
        auth_created_at: authUser.created_at || null,
        created_at: authUser.created_at || null,
        updated_at: authUser.updated_at || authUser.created_at || null,
      });
    });

    ((users || []) as any[]).forEach(user => {
      const existing: AdminAccountRecord = byId.get(user.id) || { user_id: user.id };
      byId.set(user.id, {
        ...existing,
        user_id: user.id,
        username: user.username,
        created_at: user.created_at || existing.created_at || null,
        updated_at: user.updated_at || existing.updated_at || null,
      });
    });

    ((profiles || []) as any[]).forEach(profile => {
      const existing: AdminAccountRecord = byId.get(profile.user_id) || { user_id: profile.user_id };
      byId.set(profile.user_id, {
        ...existing,
        display_name: profile.display_name || existing.display_name || null,
        language: profile.language,
        preferences: profile.preferences || {},
        profile_created_at: profile.created_at,
        profile_updated_at: profile.updated_at,
      });
    });

    accessRecords.forEach(access => {
      const existing = byId.get(access.user_id) || { user_id: access.user_id };
      byId.set(access.user_id, {
        ...existing,
        access,
      });
    });

    usageSummaries.forEach(usageSummary => {
      const existing = byId.get(usageSummary.user_id) || { user_id: usageSummary.user_id };
      byId.set(usageSummary.user_id, {
        ...existing,
        usageSummary,
      });
    });

    return Array.from(byId.values()).sort((a, b) => {
      const left = a.usageSummary?.last_interaction_at || a.profile_updated_at || a.updated_at || a.last_sign_in_at || a.created_at || a.auth_created_at || '';
      const right = b.usageSummary?.last_interaction_at || b.profile_updated_at || b.updated_at || b.last_sign_in_at || b.created_at || b.auth_created_at || '';
      return right.localeCompare(left);
    });
  } catch (error: any) {
    console.error('[SUPABASE] Error in listAdminAccounts:', error.message);
    return [];
  }
};

export const getSupabaseAuthUserById = async (userId: string): Promise<SupabaseAuthUser | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data, error } = await getSupabaseAuthAdminClient().auth.admin.getUserById(userId);
    if (error) {
      if (!/not found/i.test(error.message)) {
        console.warn('[SUPABASE_AUTH] Could not load auth user by id:', error.message);
      }
      return null;
    }

    return data.user || null;
  } catch (error: any) {
    console.warn('[SUPABASE_AUTH] Error loading auth user by id:', error.message);
    return null;
  }
};


export const deleteAdminAccount = async (userId: string): Promise<void> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase client not initialized.');
  }

  const id = userId.trim();
  if (!id) {
    throw new Error('User id is required.');
  }

  const deleteFrom = async (table: string, column = 'user_id') => {
    const { error } = await getSupabaseClient()
      .from(table)
      .delete()
      .eq(column, id);

    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }
  };

  await deleteFrom('council_messages');
  await deleteFrom('council_sessions');
  await deleteFrom('lore_entries');
  await deleteFrom('questlog_entries');
  await deleteFrom('soul_timeline_events');
  await deleteFrom('breakthroughs');
  await deleteFrom('usage_counters');
  await deleteFrom('user_access');
  await deleteFrom('user_profiles');
  await deleteFrom('users', 'id');

  const { error } = await getSupabaseAuthAdminClient().auth.admin.deleteUser(id);
  if (error && !/not found/i.test(error.message)) {
    throw new Error(`auth.users: ${error.message}`);
  }
};

// Council sessions
export interface CouncilSession {
  id?: string;
  user_id: string;
  mode: 'direct' | 'council';
  topic?: string;
  messages: any; // jsonb
  created_at?: string;
  updated_at?: string;
}

export const createCouncilSession = async (session: CouncilSession): Promise<string | null> => {
  if (!isSupabaseConfigured()) {
    return null; // Fallback to in-memory
  }

  try {
    const { data, error } = await getSupabaseClient()
      .from('council_sessions')
      .insert(session as any)
      .select('id')
      .single();

    if (error) {
      console.error('[SUPABASE] Error creating council session:', error.message);
      return null;
    }

    return (data as any)?.id || null;
  } catch (error: any) {
    console.error('[SUPABASE] Error in createCouncilSession:', error.message);
    return null;
  }
};

// Council messages
export interface CouncilMessageRecord {
  id?: string;
  session_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system' | 'model';
  archetype_id?: string | null;
  content: string;
  sequence_index: number;
  token_count?: number | null;
  provider?: 'mock' | 'real' | 'disabled' | 'planned';
  created_at?: string;
}

export const createCouncilMessages = async (messages: CouncilMessageRecord[]): Promise<void> => {
  if (!isSupabaseConfigured() || messages.length === 0) {
    return;
  }

  try {
    const { error } = await getSupabaseClient()
      .from('council_messages')
      .insert(messages as any);

    if (error) {
      console.error('[SUPABASE] Error creating council messages:', error.message);
    }
  } catch (error: any) {
    console.error('[SUPABASE] Error in createCouncilMessages:', error.message);
  }
};

// Lore entries
export interface LoreEntry {
  id?: string;
  user_id: string;
  type: 'direct' | 'council' | 'thoughtchamber' | 'integration';
  content: any; // jsonb
  created_at?: string;
}

export const createLoreEntry = async (entry: LoreEntry): Promise<string | null> => {
  if (!isSupabaseConfigured()) {
    return null; // Fallback to in-memory
  }

  try {
    const { data, error } = await getSupabaseClient()
      .from('lore_entries')
      .insert(entry as any)
      .select('id')
      .single();

    if (error) {
      console.error('[SUPABASE] Error creating lore entry:', error.message);
      return null;
    }

    return (data as any)?.id || null;
  } catch (error: any) {
    console.error('[SUPABASE] Error in createLoreEntry:', error.message);
    return null;
  }
};

// Questlog entries
export interface QuestLogEntry {
  id?: string;
  user_id: string;
  title: string;
  content: string;
  tags?: string[];
  related_archetypes?: string[];
  source_session_id?: string;
  created_at?: string;
}

export const createQuestLogEntry = async (entry: QuestLogEntry): Promise<string | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data, error } = await getSupabaseClient()
      .from('questlog_entries')
      .insert(entry as any)
      .select('id')
      .single();

    if (error) {
      console.error('[SUPABASE] Error creating questlog entry:', error.message);
      return null;
    }

    return (data as any)?.id || null;
  } catch (error: any) {
    console.error('[SUPABASE] Error in createQuestLogEntry:', error.message);
    return null;
  }
};

export const getQuestLogEntries = async (userId: string): Promise<QuestLogEntry[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data, error } = await getSupabaseClient()
      .from('questlog_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[SUPABASE] Error fetching questlog entries:', error.message);
      return [];
    }

    return (data as QuestLogEntry[]) || [];
  } catch (error: any) {
    console.error('[SUPABASE] Error in getQuestLogEntries:', error.message);
    return [];
  }
};

// Soul timeline events
export interface SoulTimelineEvent {
  id?: string;
  user_id: string;
  label: string;
  summary: string;
  intensity?: number;
  type?: string; // e.g., "BREAKTHROUGH", "BENCHMARK", "REALIZATION", "EVENT"
  tags?: string[];
  source_session_id?: string;
  created_at?: string;
}

export const createSoulTimelineEvent = async (event: SoulTimelineEvent): Promise<string | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data, error } = await getSupabaseClient()
      .from('soul_timeline_events')
      .insert(event as any)
      .select('id')
      .single();

    if (error) {
      console.error('[SUPABASE] Error creating timeline event:', error.message);
      return null;
    }

    return (data as any)?.id || null;
  } catch (error: any) {
    console.error('[SUPABASE] Error in createSoulTimelineEvent:', error.message);
    return null;
  }
};

export const getSoulTimelineEvents = async (userId: string): Promise<SoulTimelineEvent[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data, error } = await getSupabaseClient()
      .from('soul_timeline_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[SUPABASE] Error fetching timeline events:', error.message);
      return [];
    }

    return (data as SoulTimelineEvent[]) || [];
  } catch (error: any) {
    console.error('[SUPABASE] Error in getSoulTimelineEvents:', error.message);
    return [];
  }
};

// Breakthroughs
export interface Breakthrough {
  id?: string;
  user_id: string;
  title: string;
  insight: string;
  trigger?: string;
  action?: string;
  tags?: string[];
  source_session_id?: string;
  created_at?: string;
}

export const createBreakthrough = async (breakthrough: Breakthrough): Promise<string | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data, error } = await getSupabaseClient()
      .from('breakthroughs')
      .insert(breakthrough as any)
      .select('id')
      .single();

    if (error) {
      console.error('[SUPABASE] Error creating breakthrough:', error.message);
      return null;
    }

    return (data as any)?.id || null;
  } catch (error: any) {
    console.error('[SUPABASE] Error in createBreakthrough:', error.message);
    return null;
  }
};

export const getBreakthroughs = async (userId: string): Promise<Breakthrough[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data, error } = await getSupabaseClient()
      .from('breakthroughs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[SUPABASE] Error fetching breakthroughs:', error.message);
      return [];
    }

    return (data as Breakthrough[]) || [];
  } catch (error: any) {
    console.error('[SUPABASE] Error in getBreakthroughs:', error.message);
    return [];
  }
};

