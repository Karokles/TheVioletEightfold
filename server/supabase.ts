import { createClient } from '@supabase/supabase-js';

// Supabase configuration with feature flag
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseClient: ReturnType<typeof createClient> | null = null;

// Initialize Supabase client if env vars are set
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  console.log('[SUPABASE] Client initialized');
} else {
  console.warn('[SUPABASE] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. Database features disabled.');
}

export const getSupabaseClient = () => {
  if (!supabaseClient) {
    throw new Error('Supabase client not initialized. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  }
  return supabaseClient;
};

export const isSupabaseConfigured = () => {
  return !!supabaseClient;
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

