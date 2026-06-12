import express, { Request, Response } from 'express';
type NextFunction = (err?: any) => void;
import cors, { CorsOptions } from 'cors';
import dotenv from 'dotenv';
import { createHash } from 'node:crypto';
import OpenAI from 'openai';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import jwt from 'jsonwebtoken';
import { 
  ensureUserExists, 
  createCouncilSession, 
  createCouncilMessages,
  CouncilMessageRecord,
  createLoreEntry, 
  getSupabaseAuthUser,
  getUserProfile,
  isSupabaseConfigured,
  listAdminAccounts,
  getUserAccess,
  getUsageCounter,
  incrementUsageCounter,
  upsertUserAccess,
  UserAccessRecord,
  upsertUserProfile,
  createQuestLogEntry,
  getQuestLogEntries,
  createSoulTimelineEvent,
  getSoulTimelineEvents,
  createBreakthrough,
  getBreakthroughs
} from './supabase.js';
import { getCredentialWarnings, runtimeConfig, serviceReadiness } from './runtimeConfig.js';
import { createMockCouncilReply, createMockMeaningResult } from './mockAi.js';
import { buildOrganicPromptBlock, createResponsePlan, ResponsePlan } from './conversationOrchestrator.js';
import { loadLocalMeaningState, mergeLocalMeaningState } from './localMeaningStore.js';

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Startup log
console.log('[STARTUP] Initializing server...');
console.log('[STARTUP] Node version:', process.version);
console.log('[STARTUP] Environment:', process.env.NODE_ENV || 'development');

dotenv.config();
console.log('[STARTUP] Environment variables loaded');

// Runtime mode and credential checks. Missing paid-service credentials must fail safely.
console.log('[STARTUP] App environment:', runtimeConfig.appEnvironment);
console.log('[STARTUP] Feature flags:', {
  aiProviderEnabled: runtimeConfig.aiProviderEnabled,
  databaseEnabled: runtimeConfig.databaseEnabled,
    paymentEnabled: runtimeConfig.paymentEnabled,
    supabaseAuthEnabled: runtimeConfig.supabaseAuthEnabled,
    authStrictMode: runtimeConfig.authStrictMode,
  usageLimitsEnabled: runtimeConfig.usageLimitsEnabled,
  debugEndpointsEnabled: runtimeConfig.debugEndpointsEnabled,
  localAuthEnabled: runtimeConfig.localAuthEnabled
});
for (const warning of getCredentialWarnings()) {
  console.warn(`[CONFIG] ${warning}`);
}

// JWT Configuration - strict mode protects staging/production without crashing health checks.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && runtimeConfig.authStrictMode) {
  console.error('='.repeat(80));
  console.error('ERROR: JWT_SECRET environment variable is required in production');
  console.error('='.repeat(80));
  console.error('');
  console.error('To fix this issue:');
  console.error('1. Go to Render Dashboard → Your Service → Environment');
  console.error('2. Add environment variable: JWT_SECRET');
  console.error('3. Generate a secure value with: openssl rand -base64 32');
  console.error('4. Set the value (minimum 32 characters recommended)');
  console.error('5. Save and redeploy your service');
  console.error('');
  console.error('Example:');
  console.error('  Variable: JWT_SECRET');
  console.error('  Value: <paste output from: openssl rand -base64 32>');
  console.error('');
  console.error('Without JWT_SECRET, the server cannot authenticate users securely.');
  console.error('='.repeat(80));
  console.error('[AUTH] Auth-protected endpoints will return a safe configuration error until JWT_SECRET is set.');
}
if (!JWT_SECRET && !runtimeConfig.authStrictMode) {
  console.warn('[AUTH] JWT_SECRET not set. Using local development secret because AUTH_STRICT_MODE=false.');
}

const JWT_SECRET_FINAL = JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRY = '7d'; // Tokens expire in 7 days

const app = express();
// Parse PORT as number (Render sets this automatically)
const PORT = Number(process.env.PORT) || 3001;
console.log('[STARTUP] Server will listen on port:', PORT);

// Middleware
// CORS configuration - restrict to allowed origins in production
const parseAllowedOrigins = (): string[] => {
  const localOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
  ];
  const stagingOrigins = [
    'https://the-violet-eightfold-git-staging-the-violet-eightfolds-projects.vercel.app',
  ];
  const productionOrigins = [
    'https://the-violet-eightfold-git-main-the-violet-eightfolds-projects.vercel.app',
    'https://the-violet-eightfold.vercel.app',
    'https://the-violet-eightfold42.vercel.app',
  ];
  const defaultOrigins = runtimeConfig.isLocal
    ? localOrigins
    : runtimeConfig.isStaging
      ? stagingOrigins
      : productionOrigins;
  
  if (process.env.ALLOWED_ORIGINS) {
    const parsed = process.env.ALLOWED_ORIGINS.split(',')
      .map(origin => origin.trim())
      .filter(origin => origin.length > 0);
    
    // Merge with defaults, remove duplicates
    return Array.from(new Set([...defaultOrigins, ...parsed]));
  }
  
  return defaultOrigins;
};

const allowedOrigins = parseAllowedOrigins();

// Log allowed origins on startup (no secrets)
console.log('[STARTUP] CORS allowed origins:', allowedOrigins.join(', '));

// CORS options - credentials: false (no cookies, only JWT in Authorization header)
const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Requests without Origin are not browser CORS requests (Render health checks, curl, server clients).
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Log CORS rejection for debugging (no secrets)
      console.warn('[CORS] Request blocked', {
        origin: origin,
        allowedOrigins: allowedOrigins,
        environment: process.env.NODE_ENV || 'development'
      });
      callback(new Error(`CORS: Origin '${origin}' is not allowed. Allowed origins: ${allowedOrigins.join(', ')}`));
    }
  },
  credentials: false, // No cookies, only JWT in Authorization header
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
  exposedHeaders: [],
  maxAge: 86400, // 24 hours - cache preflight requests
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS middleware BEFORE all routes
app.use(cors(corsOptions));

// Explicit OPTIONS handler for all routes (preflight requests)
app.options('*', cors(corsOptions));

app.use(express.json());
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Initialize OpenAI only when both the feature flag and credentials are present.
const openai = serviceReadiness.ai
  ? new OpenAI({ apiKey: runtimeConfig.openAiApiKey })
  : null;
if (openai) {
  console.log('[AI] OpenAI provider enabled');
} else {
  console.warn('[AI] OpenAI provider disabled. AI endpoints will return safe mock responses.');
}

// Simple in-memory user store (for MVP - replace with database later)
type AdminEntitlement = 'free' | 'paid_beta' | 'founder' | 'blocked';

type AdminAccountSettings = {
  entitlement?: AdminEntitlement;
  offlineOnly?: boolean;
  weeklyFreeInteractions?: number | null;
  weeklyCouncilSessions?: number | null;
  weeklyMeaningAnalyses?: number | null;
  activeUntil?: string | null;
  betaActivations?: number;
  betaBonusUsed?: boolean;
  notes?: string | null;
};

interface User {
  id: string;
  username: string;
  secretHash: string;
  token?: string;
  email?: string;
  displayName?: string;
  adminSettings?: AdminAccountSettings;
}

const users: User[] = [
  // Pre-populated test users (lion + 5 friends)
  // In production, these should be in a database
  {
    id: 'lion',
    username: 'lion',
    displayName: 'karokles',
    secretHash: createHash('sha256').update('TuerOhneWiederkehr2025').digest('hex'),
  },
  {
    id: 'friend1',
    username: 'selma',
    secretHash: createHash('sha256').update('moonlight-whisper').digest('hex'),
  },
  {
    id: 'friend2',
    username: 'alicia',
    secretHash: createHash('sha256').update('form-follows-function').digest('hex'),
  },
  {
    id: 'friend3',
    username: 'marie',
    secretHash: createHash('sha256').update('haute-couture').digest('hex'),
  },
  {
    id: 'friend5',
    username: 'friend5',
    secretHash: createHash('sha256').update('friend5-test-secret').digest('hex'),
  },
  {
    id: 'sophia',
    username: 'sophia',
    secretHash: createHash('sha256').update('know-thyself').digest('hex'),
  },
  {
    id: 'isabell',
    username: 'isabell',
    secretHash: createHash('sha256').update('ceylon').digest('hex'),
  },
  {
    id: 'dorothee',
    username: 'dorothee',
    secretHash: createHash('sha256').update('schattengarten').digest('hex'),
  },
  {
    id: 'serigne',
    username: 'serigne',
    secretHash: createHash('sha256').update('cher-amadu').digest('hex'),
  },
  {
    id: 'benjamin',
    username: 'benjamin',
    secretHash: createHash('sha256').update('tragwerk').digest('hex'),
  },
  {
    id: 'anna',
    username: 'anna',
    secretHash: createHash('sha256').update('amethyst').digest('hex'),
  },
  {
    id: 'beta-test',
    username: 'betatest',
    displayName: 'Beta Test',
    secretHash: createHash('sha256').update('beta-test-242').digest('hex'),
  },
];

const parseIdentifierList = (value: string): string[] => {
  return value
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(Boolean);
};

const wildcardMatch = (pattern: string, value: string): boolean => {
  if (!pattern || !value) return false;
  if (pattern === value) return true;
  if (!pattern.includes('*')) return false;
  const escaped = pattern
    .split('*')
    .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${escaped}$`, 'i').test(value);
};

const userMatchesIdentifiers = (user: Pick<User, 'id' | 'username' | 'email'> | undefined, identifiers: string): boolean => {
  if (!user) return false;
  const candidates = [user.id, user.username, user.email]
    .filter((candidate): candidate is string => Boolean(candidate))
    .map(candidate => candidate.toLowerCase());
  return parseIdentifierList(identifiers).some(pattern => candidates.some(candidate => wildcardMatch(pattern, candidate)));
};

const isProtectedLocalLionUser = (user?: Pick<User, 'id' | 'username' | 'email'>): boolean => {
  if (!user) return false;
  return [user.id, user.username, user.email]
    .filter((candidate): candidate is string => Boolean(candidate))
    .some(candidate => ['lion', 'karokles'].includes(candidate.toLowerCase()));
};

const isOfflineOnlyUser = (user?: Pick<User, 'id' | 'username' | 'email'>): boolean => {
  if (isProtectedLocalLionUser(user)) {
    return true;
  }

  return Boolean((user as User | undefined)?.adminSettings?.offlineOnly)
    || userMatchesIdentifiers(user, runtimeConfig.offlineOnlyIdentifiers);
};

const hasFounderAccess = (user?: Pick<User, 'id' | 'username' | 'email'>): boolean => {
  if (isProtectedLocalLionUser(user)) {
    return true;
  }

  return (user as User | undefined)?.adminSettings?.entitlement === 'founder'
    || userMatchesIdentifiers(user, runtimeConfig.founderAccessIdentifiers);
};

const isAdminUser = (user?: Pick<User, 'id' | 'username' | 'email'>): boolean => {
  return userMatchesIdentifiers(user, runtimeConfig.adminIdentifiers);
};

const getProfileAdminSettings = (preferences: any): AdminAccountSettings => {
  const admin = preferences && typeof preferences === 'object' ? preferences.admin : null;
  const entitlement = ['founder', 'blocked', 'free', 'paid_beta'].includes(admin?.entitlement)
    ? admin.entitlement as AdminEntitlement
    : undefined;
  const readLimit = (value: unknown): number | null | undefined => {
    if (value === null) return null;
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue >= 0 ? Math.floor(numberValue) : undefined;
  };

  return {
    entitlement,
    offlineOnly: admin?.offlineOnly === true,
    weeklyFreeInteractions: readLimit(admin?.weeklyFreeInteractions),
    weeklyCouncilSessions: readLimit(admin?.weeklyCouncilSessions),
    weeklyMeaningAnalyses: readLimit(admin?.weeklyMeaningAnalyses),
    activeUntil: typeof admin?.activeUntil === 'string' ? admin.activeUntil : null,
    betaActivations: Number.isFinite(Number(admin?.betaActivations)) ? Math.max(0, Math.floor(Number(admin.betaActivations))) : 0,
    betaBonusUsed: admin?.betaBonusUsed === true,
    notes: typeof admin?.notes === 'string' ? admin.notes.slice(0, 1000) : null,
  };
};

const sanitizeAdminSettings = (value: any): AdminAccountSettings => {
  const entitlement = ['founder', 'blocked', 'free', 'paid_beta'].includes(value?.entitlement)
    ? value.entitlement as AdminEntitlement
    : 'free';
  const sanitizeLimit = (input: unknown): number | null => {
    if (input === null || input === '' || input === undefined) return null;
    const numberValue = Number(input);
    if (!Number.isFinite(numberValue)) return null;
    return Math.max(0, Math.min(10000, Math.floor(numberValue)));
  };

  return {
    entitlement,
    offlineOnly: value?.offlineOnly === true,
    weeklyFreeInteractions: sanitizeLimit(value?.weeklyFreeInteractions),
    weeklyCouncilSessions: sanitizeLimit(value?.weeklyCouncilSessions),
    weeklyMeaningAnalyses: sanitizeLimit(value?.weeklyMeaningAnalyses),
    activeUntil: typeof value?.activeUntil === 'string' && value.activeUntil.trim() ? value.activeUntil.trim() : null,
    betaActivations: Number.isFinite(Number(value?.betaActivations)) ? Math.max(0, Math.floor(Number(value.betaActivations))) : 0,
    betaBonusUsed: value?.betaBonusUsed === true,
    notes: typeof value?.notes === 'string' ? value.notes.trim().slice(0, 1000) : null,
  };
};

const requireAdmin = (req: AuthenticatedRequest, res: Response): boolean => {
  if (!req.user || !isAdminUser(req.user)) {
    res.status(403).json({ error: 'forbidden', message: 'Admin access required.' });
    return false;
  }
  return true;
};

const countCouncilSpeakers = (reply: string): number => {
  const speakerMatches = reply.match(/\[\[\s*SPEAKER\s*:\s*([A-Z_]+)\s*\]\]/gi) || [];
  const speakers = new Set(
    speakerMatches
      .map(match => match.replace(/\[\[\s*SPEAKER\s*:\s*/i, '').replace(/\s*\]\]/, '').trim().toUpperCase())
      .filter(Boolean)
  );
  return speakers.size;
};

// Authentication middleware
interface AuthenticatedRequest extends Request {
  user?: User;
  headers: Request['headers'];
  body: Request['body'];
}

const attachSupabaseUser = async (req: AuthenticatedRequest, token: string): Promise<boolean> => {
  const authUser = await getSupabaseAuthUser(token);
  if (!authUser) {
    return false;
  }

  const username = authUser.email || authUser.user_metadata?.display_name || authUser.id;
  const displayName = authUser.user_metadata?.display_name
    || authUser.user_metadata?.name
    || authUser.user_metadata?.full_name
    || authUser.user_metadata?.preferred_username
    || authUser.email?.split('@')[0]
    || authUser.id;
  const secretHash = createHash('sha256').update(`supabase-auth:${authUser.id}`).digest('hex');

  req.user = {
    id: authUser.id,
    username,
    secretHash,
    email: authUser.email || undefined,
  };

  if (!isOfflineOnlyUser(req.user)) {
    await ensureUserExists(authUser.id, username, secretHash);
    const existingProfile = await getUserProfile(authUser.id);
    req.user.adminSettings = getProfileAdminSettings(existingProfile?.preferences);
    await upsertUserProfile({
      user_id: authUser.id,
      display_name: existingProfile?.display_name || displayName,
      language: existingProfile?.language || null,
      active_archetype: existingProfile?.active_archetype || null,
      preferences: existingProfile?.preferences || {}
    });
  }

  return true;
};

const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void | Response> => {
  // Skip authentication for OPTIONS requests (preflight)
  if (req.method === 'OPTIONS') {
    return next();
  }
  
  // Try multiple header formats: Authorization, x-auth-token
  let token = '';
  const authHeader = req.headers?.authorization;
  const xAuthToken = req.headers?.['x-auth-token'] as string | undefined;
  
  // Priority: Authorization header first, then x-auth-token
  if (authHeader) {
    // Normalize header: handle "Bearer Bearer <token>" edge case
    let normalizedHeader = authHeader.trim();
    while (normalizedHeader.startsWith('Bearer ')) {
      normalizedHeader = normalizedHeader.substring(7).trim();
    }
    
    // Extract token
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else {
      // Legacy format: token without "Bearer " prefix
      token = normalizedHeader;
    }
  } else if (xAuthToken) {
    // Support x-auth-token header as fallback
    token = xAuthToken.trim();
  }
  
  // Check if token exists
  if (!token || token.length === 0) {
    const reason = authHeader || xAuthToken ? 'empty_token' : 'missing_token';
    return res.status(401).json({ 
      error: 'unauthorized',
      reason: reason,
      message: reason === 'missing_token' ? 'Missing or invalid token' : 'Token is empty'
    });
  }
  
  // Check if token looks like JWT (has 3 dot-separated segments)
  const isJWT = token.split('.').length === 3;
  
  if (isJWT) {
    // JWT token - verify cryptographically
    try {
      if (!JWT_SECRET && runtimeConfig.authStrictMode) {
        console.error('[AUTH] JWT_SECRET not configured');
        return res.status(500).json({ 
          error: 'unauthorized',
          reason: 'missing_secret',
          message: 'Server configuration error'
        });
      }
      
      // Explicitly set algorithm to HS256 for consistency
      const decoded = jwt.verify(token, JWT_SECRET_FINAL, { algorithms: ['HS256'] }) as { sub: string; username: string; iat: number; exp: number };

      if (!runtimeConfig.localAuthEnabled) {
        return res.status(401).json({
          error: 'unauthorized',
          reason: 'local_auth_disabled',
          message: 'Local test-user tokens are disabled in this runtime mode.'
        });
      }
      
      // Find user by sub (user.id) from JWT claims
      const user = users.find(u => u.id === decoded.sub);
      if (!user) {
        const tokenHash = createHash('sha256').update(token).digest('hex').substring(0, 12);
        const requestPath = req.path || req.url || 'unknown';
        console.log(`[AUTH] User not found - path: ${requestPath}, userId: ${decoded.sub}, tokenHash: ${tokenHash}`);
        return res.status(401).json({ 
          error: 'unauthorized',
          reason: 'invalid_claims',
          message: 'User not found'
        });
      }
      
      // Attach user to request
      req.user = user;
      if (isSupabaseConfigured()) {
        const profile = await getUserProfile(user.id);
        req.user.adminSettings = getProfileAdminSettings(profile?.preferences);
      }
      return next();
    } catch (error: any) {
      if (serviceReadiness.supabaseAuth) {
        const attached = await attachSupabaseUser(req, token);
        if (attached) {
          return next();
        }
      }

      // Log auth failure with safe details (no secrets, no full token)
      const tokenHash = createHash('sha256').update(token).digest('hex').substring(0, 12);
      const tokenLength = token.length;
      const requestPath = req.path || req.url || 'unknown';
      
      if (error.name === 'TokenExpiredError') {
        console.log(`[AUTH] Token expired - path: ${requestPath}, tokenHash: ${tokenHash}, tokenLength: ${tokenLength}`);
        return res.status(401).json({ 
          error: 'unauthorized',
          reason: 'expired',
          message: 'Token has expired. Please sign in again.'
        });
      } else if (error.name === 'JsonWebTokenError') {
        console.log(`[AUTH] Invalid signature - path: ${requestPath}, tokenHash: ${tokenHash}, tokenLength: ${tokenLength}, error: ${error.message}`);
        return res.status(401).json({ 
          error: 'unauthorized',
          reason: 'invalid_signature',
          message: 'Invalid token signature'
        });
      } else {
        console.error(`[AUTH] JWT verification error - path: ${requestPath}, tokenHash: ${tokenHash}, tokenLength: ${tokenLength}, error: ${error.message}`);
        return res.status(401).json({ 
          error: 'unauthorized',
          reason: 'invalid_format',
          message: 'Invalid token format'
        });
      }
    }
  } else {
    // Legacy token format - reject with clear message
    return res.status(401).json({ 
      error: 'unauthorized',
      reason: 'legacy_token_invalid',
      message: 'Legacy token format no longer supported. Please sign in again to get a new token.',
      hint: 'The authentication system has been upgraded. Your old token is no longer valid.'
    });
  }
};

type UsageBucket = {
  week: string;
  interactions: number;
  councilSessions: number;
  meaningAnalyses: number;
};

const usageBuckets = new Map<string, UsageBucket>();
const featureUsageBuckets = new Map<string, number>();
const localAccessRecords = new Map<string, UserAccessRecord>();
const BETA_ACCESS_DAYS = Number(process.env.BETA_ACCESS_DAYS || 14);
const BETA_PRICE_EUR = process.env.BETA_PRICE_EUR || '2.42';
const FREE_SINGLE_VOICE_REPLIES = Number(process.env.FREE_SINGLE_VOICE_REPLIES || 12);
const FREE_COUNCIL_SESSIONS = Number(process.env.FREE_COUNCIL_SESSIONS || 1);
const FREE_COUNCIL_REPLIES_PER_SESSION = Number(process.env.FREE_COUNCIL_REPLIES_PER_SESSION || 3);
const FREE_BLUEPRINT_SAVES = Number(process.env.FREE_BLUEPRINT_SAVES || 1);
const FREE_CYCLE_DAYS = Number(process.env.FREE_CYCLE_DAYS || 5);

type AccessSnapshot = {
  tier: AdminEntitlement;
  activeUntil: string | null;
  betaActivations: number;
  betaBonusUsed: boolean;
  notes: string | null;
  source: 'protected_local' | 'profile' | 'database' | 'default';
};

type UsageFeature =
  | 'single_voice_reply'
  | 'council_session'
  | 'blueprint_save'
  | 'cycle_day_6';

const getWeekKey = () => {
  const now = new Date();
  const firstDayOfYear = Date.UTC(now.getUTCFullYear(), 0, 1);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const week = Math.ceil(((today - firstDayOfYear) / 86400000 + 1) / 7);
  return `${now.getUTCFullYear()}-W${week}`;
};

const getWeeklyResetAt = (): string => {
  const now = new Date();
  const day = now.getUTCDay();
  const daysUntilMonday = (8 - day) % 7 || 7;
  const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMonday, 0, 0, 0));
  return reset.toISOString();
};

const isAccessActive = (access: AccessSnapshot): boolean => {
  if (access.tier === 'founder') return true;
  if (access.tier !== 'paid_beta') return false;
  if (!access.activeUntil) return false;
  return new Date(access.activeUntil).getTime() > Date.now();
};

const getAccessFromRecord = (record: UserAccessRecord | null): AccessSnapshot | null => {
  if (!record) return null;
  return {
    tier: record.tier === 'founder' || record.tier === 'blocked' || record.tier === 'paid_beta' ? record.tier : 'free',
    activeUntil: record.active_until || null,
    betaActivations: record.beta_activations || 0,
    betaBonusUsed: Boolean(record.beta_bonus_used),
    notes: record.notes || null,
    source: 'database',
  };
};

const getEffectiveAccess = async (user: User): Promise<AccessSnapshot> => {
  if (isProtectedLocalLionUser(user)) {
    return {
      tier: 'founder',
      activeUntil: null,
      betaActivations: 0,
      betaBonusUsed: false,
      notes: 'Protected local offline-only account.',
      source: 'protected_local',
    };
  }

  const localAccess = getAccessFromRecord(localAccessRecords.get(user.id) || null);
  if (localAccess) {
    return {
      ...localAccess,
      source: 'default',
    };
  }

  if (isSupabaseConfigured() && !isOfflineOnlyUser(user)) {
    const dbAccess = getAccessFromRecord(await getUserAccess(user.id));
    if (dbAccess) {
      return dbAccess;
    }
  }

  const profileSettings = user.adminSettings;
  if (profileSettings?.entitlement) {
    return {
      tier: profileSettings.entitlement,
      activeUntil: profileSettings.activeUntil || null,
      betaActivations: profileSettings.betaActivations || 0,
      betaBonusUsed: Boolean(profileSettings.betaBonusUsed),
      notes: profileSettings.notes || null,
      source: 'profile',
    };
  }

  return {
    tier: 'free',
    activeUntil: null,
    betaActivations: 0,
    betaBonusUsed: false,
    notes: null,
    source: 'default',
  };
};

const getFreeLimitForFeature = (feature: UsageFeature): number => {
  if (feature === 'single_voice_reply') return FREE_SINGLE_VOICE_REPLIES;
  if (feature === 'council_session') return FREE_COUNCIL_SESSIONS;
  if (feature === 'blueprint_save') return FREE_BLUEPRINT_SAVES;
  return 0;
};

const getFeatureUsage = async (userId: string, periodKey: string, feature: UsageFeature): Promise<number> => {
  if (isSupabaseConfigured()) {
    const record = await getUsageCounter(userId, periodKey, feature);
    if (record) return record.count || 0;
  }

  return featureUsageBuckets.get(`${userId}:${periodKey}:${feature}`) || 0;
};

const incrementFeatureUsage = async (userId: string, periodKey: string, feature: UsageFeature): Promise<number> => {
  if (isSupabaseConfigured()) {
    const record = await incrementUsageCounter(userId, periodKey, feature);
    if (record) return record.count || 0;
  }

  const key = `${userId}:${periodKey}:${feature}`;
  const next = (featureUsageBuckets.get(key) || 0) + 1;
  featureUsageBuckets.set(key, next);
  return next;
};

const sendPaywallResponse = (
  res: Response,
  feature: UsageFeature,
  message: string,
  extra: Record<string, unknown> = {},
): void => {
  res.status(402).json({
    error: 'paywall_required',
    feature,
    message,
    beta: {
      priceEur: BETA_PRICE_EUR,
      accessDays: BETA_ACCESS_DAYS,
      provider: 'mock',
    },
    ...extra,
  });
};

const enforceFeatureAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  feature: UsageFeature,
  options: { increment?: boolean; sessionReplyCount?: number } = {},
): Promise<boolean> => {
  if (!req.user) return false;
  const access = await getEffectiveAccess(req.user);

  if (access.tier === 'blocked') {
    res.status(403).json({
      error: 'account_blocked',
      message: 'This account is currently blocked by an administrator.',
    });
    return false;
  }

  if (hasFounderAccess(req.user) || isAccessActive(access)) {
    return true;
  }

  if (feature === 'cycle_day_6') {
    sendPaywallResponse(res, feature, `Cycle day ${FREE_CYCLE_DAYS + 1} requires beta access.`);
    return false;
  }

  if (options.sessionReplyCount !== undefined && options.sessionReplyCount > FREE_COUNCIL_REPLIES_PER_SESSION) {
    sendPaywallResponse(res, feature, 'This free council session has reached its reply limit.', {
      limit: FREE_COUNCIL_REPLIES_PER_SESSION,
      usage: options.sessionReplyCount,
    });
    return false;
  }

  const periodKey = getWeekKey();
  const current = await getFeatureUsage(req.user.id, periodKey, feature);
  const limit = getFreeLimitForFeature(feature);

  if (current >= limit) {
    sendPaywallResponse(res, feature, 'Weekly free usage limit reached.', {
      limit,
      usage: current,
      periodKey,
      resetAt: getWeeklyResetAt(),
    });
    return false;
  }

  if (options.increment !== false) {
    await incrementFeatureUsage(req.user.id, periodKey, feature);
  }

  return true;
};

const getUsageBucket = (userId: string): UsageBucket => {
  const week = getWeekKey();
  const existing = usageBuckets.get(userId);
  if (existing?.week === week) {
    return existing;
  }

  const fresh = { week, interactions: 0, councilSessions: 0, meaningAnalyses: 0 };
  usageBuckets.set(userId, fresh);
  return fresh;
};

const enforceUsageLimit = (
  req: AuthenticatedRequest,
  res: Response,
  type: 'interaction' | 'council' | 'meaning'
): boolean => {
  if (!runtimeConfig.usageLimitsEnabled || !req.user) {
    return true;
  }
  if (req.user.adminSettings?.entitlement === 'blocked') {
    res.status(403).json({
      error: 'account_blocked',
      message: 'This account is currently blocked by an administrator.'
    });
    return false;
  }
  if (hasFounderAccess(req.user)) {
    return true;
  }

  const usage = getUsageBucket(req.user.id);
  const current = type === 'meaning'
    ? usage.meaningAnalyses
    : type === 'council'
      ? usage.councilSessions
      : usage.interactions;
  const configuredLimit = type === 'meaning'
    ? req.user.adminSettings?.weeklyMeaningAnalyses
    : type === 'council'
      ? req.user.adminSettings?.weeklyCouncilSessions
      : req.user.adminSettings?.weeklyFreeInteractions;
  const limit = configuredLimit ?? (type === 'meaning'
    ? runtimeConfig.weeklyMeaningAnalyses
    : type === 'council'
      ? runtimeConfig.weeklyCouncilSessions
      : runtimeConfig.weeklyFreeInteractions);

  if (current >= limit) {
    res.status(429).json({
      error: 'usage_limit_reached',
      message: 'Weekly free usage limit reached. Real entitlement checks can be connected when payments are enabled.',
      limit,
      usage: current,
      resetWindow: usage.week
    });
    return false;
  }

  if (type === 'meaning') {
    usage.meaningAnalyses += 1;
  } else if (type === 'council') {
    usage.councilSessions += 1;
  } else {
    usage.interactions += 1;
  }

  return true;
};

const requireDebugEndpoint = (req: Request, res: Response, next: NextFunction): void | Response => {
  if (runtimeConfig.debugEndpointsEnabled) {
    return next();
  }

  return res.status(404).json({ error: 'Route not found' });
};

// Fast health check endpoint (public) - must respond quickly for Render
app.get('/api/health', (req: Request, res: Response) => {
  // Return immediately - no blocking operations
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Detailed health check endpoint (public) - for diagnostics
app.get('/api/health/detailed', requireDebugEndpoint, (req: Request, res: Response) => {
  const uptime = process.uptime();
  // Try to get git commit hash if available (non-blocking)
  let commitHash = 'unknown';
  try {
    const { execSync } = require('node:child_process');
    commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8', stdio: 'pipe' }).toString().trim();
  } catch {
    // Git not available or not a git repo - use fallback
  }
  
  // Check Supabase connectivity (non-blocking, non-sensitive)
  let supabaseStatus = 'not_configured';
  if (serviceReadiness.database) {
    supabaseStatus = 'configured';
  } else if (runtimeConfig.databaseEnabled) {
    supabaseStatus = 'missing_credentials';
  } else {
    supabaseStatus = 'disabled';
  }
  
  res.json({ 
    status: 'ok',
    uptime: Math.floor(uptime),
    timestamp: new Date().toISOString(),
    environment: runtimeConfig.appEnvironment,
    commitHash: commitHash,
    jwtSecretSet: !!process.env.JWT_SECRET,
    supabaseStatus: supabaseStatus,
    featureFlags: {
      aiProviderEnabled: runtimeConfig.aiProviderEnabled,
      databaseEnabled: runtimeConfig.databaseEnabled,
      paymentEnabled: runtimeConfig.paymentEnabled,
      authStrictMode: runtimeConfig.authStrictMode,
      usageLimitsEnabled: runtimeConfig.usageLimitsEnabled,
      debugEndpointsEnabled: runtimeConfig.debugEndpointsEnabled,
      localAuthEnabled: runtimeConfig.localAuthEnabled,
      supabaseAuthEnabled: runtimeConfig.supabaseAuthEnabled
    },
    serviceReadiness
  });
});

app.get('/api/runtime/status', requireDebugEndpoint, (req: Request, res: Response) => {
  res.json({
    environment: runtimeConfig.appEnvironment,
    modes: {
      local: runtimeConfig.isLocal,
      staging: runtimeConfig.isStaging,
      production: runtimeConfig.isProduction
    },
    featureFlags: {
      aiProviderEnabled: runtimeConfig.aiProviderEnabled,
      databaseEnabled: runtimeConfig.databaseEnabled,
      paymentEnabled: runtimeConfig.paymentEnabled,
      authStrictMode: runtimeConfig.authStrictMode,
      usageLimitsEnabled: runtimeConfig.usageLimitsEnabled,
      debugEndpointsEnabled: runtimeConfig.debugEndpointsEnabled,
      localAuthEnabled: runtimeConfig.localAuthEnabled,
      supabaseAuthEnabled: runtimeConfig.supabaseAuthEnabled
    },
    services: {
      ai: serviceReadiness.ai ? 'requires paid service later: connected' : 'mocked safely',
      database: serviceReadiness.database ? 'requires paid service later: connected' : 'working without budget now',
      supabaseAuth: serviceReadiness.supabaseAuth ? 'working without budget now: staging auth connected' : 'mocked safely',
      payment: serviceReadiness.payment ? 'requires paid service later: connected' : 'blocked until credentials/budget exist',
      auth: serviceReadiness.auth ? 'working without budget now' : 'blocked until credentials/budget exist'
    },
    credentialsPresent: {
      ai: !!runtimeConfig.openAiApiKey,
      database: runtimeConfig.hasDatabaseCredentials,
      supabaseAuth: serviceReadiness.supabaseAuth,
      payment: runtimeConfig.hasPaymentCredentials,
      jwtSecret: !!runtimeConfig.jwtSecret
    }
  });
});

// Auth health endpoint (for auth-specific diagnostics)
app.get('/api/auth/health', requireDebugEndpoint, (req: Request, res: Response) => {
  let build = 'unknown';
  try {
    const { execSync } = require('node:child_process');
    build = execSync('git rev-parse --short HEAD', { encoding: 'utf-8', stdio: 'pipe' }).toString().trim();
  } catch {
    build = new Date().toISOString().substring(0, 10); // Fallback to date
  }
  
  res.json({
    ok: true,
    hasJwtSecret: !!process.env.JWT_SECRET,
    hasSupabase: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    build: build
  });
});

// Auth diagnose endpoint (public, safe - no secrets exposed)
app.get('/auth/diagnose', requireDebugEndpoint, (req: Request, res: Response) => {
  try {
    const authHeader = req.headers?.authorization || '';
    
    // Determine auth header format
    let authHeaderFormat: 'missing' | 'bearer' | 'raw' | 'malformed' = 'missing';
    if (authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        authHeaderFormat = 'bearer';
      } else if (authHeader.trim().length > 0) {
        authHeaderFormat = 'raw';
      } else {
        authHeaderFormat = 'malformed';
      }
    }
    
    // Parse token (without exposing it)
    let tokenParse: 'ok' | 'missing' | 'malformed' = 'missing';
    let tokenLength = 0;
    if (authHeaderFormat === 'bearer') {
      const token = authHeader.substring(7).trim();
      if (token.length > 0) {
        tokenParse = 'ok';
        tokenLength = token.length;
      } else {
        tokenParse = 'malformed';
      }
    } else if (authHeaderFormat === 'raw') {
      const token = authHeader.trim();
      if (token.length > 0) {
        tokenParse = 'ok';
        tokenLength = token.length;
      } else {
        tokenParse = 'malformed';
      }
    }
    
    // Check if token looks like JWT (has 3 dot-separated segments)
    const tokenLooksLikeJwt = (() => {
      if (tokenParse !== 'ok') return false;
      let token = '';
      if (authHeaderFormat === 'bearer') {
        token = authHeader.substring(7).trim();
      } else {
        token = authHeader.trim();
      }
      return token.split('.').length === 3;
    })();
    
    // Verify token (try JWT first, then legacy)
    let verifyResult: 'ok' | 'expired' | 'invalid_signature' | 'invalid_format' | 'missing_secret' | 'unknown' = 'unknown';
    if (tokenParse === 'ok') {
      let token = '';
      if (authHeaderFormat === 'bearer') {
        token = authHeader.substring(7).trim();
      } else {
        token = authHeader.trim();
      }
      
      if (tokenLooksLikeJwt) {
        // Try JWT verification
        try {
          if (!JWT_SECRET && runtimeConfig.authStrictMode) {
            verifyResult = 'missing_secret';
          } else {
            const decoded = jwt.verify(token, JWT_SECRET_FINAL);
            if (decoded) {
              verifyResult = 'ok';
            }
          }
        } catch (error: any) {
          if (error.name === 'TokenExpiredError') {
            verifyResult = 'expired';
          } else if (error.name === 'JsonWebTokenError') {
            verifyResult = 'invalid_signature';
          } else {
            verifyResult = 'invalid_format';
          }
        }
      } else {
        // Legacy token format - check in-memory (for backward compatibility during migration)
        const user = users.find(u => u.token === token);
        if (user) {
          verifyResult = 'ok';
        } else {
          // Legacy token not found - likely expired due to restart
          verifyResult = 'expired';
        }
      }
    } else if (tokenParse === 'malformed') {
      verifyResult = 'invalid_format';
    } else {
      verifyResult = 'unknown';
    }
    
    res.json({
      hasAuthHeader: !!authHeader,
      authHeaderFormat: authHeaderFormat,
      tokenParse: tokenParse,
      tokenLooksLikeJwt: tokenLooksLikeJwt,
      verifyResult: verifyResult,
      tokenLength: tokenLength,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Auth diagnose error:', error);
    res.status(500).json({ 
      error: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message 
    });
  }
});

// GET /api/me endpoint (protected, returns current user info)
app.get('/api/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }
    
    res.json({
      userId: req.user.id,
      username: req.user.username,
      authProvider: users.some(user => user.id === req.user?.id) ? 'local' : 'supabase',
      isAdmin: isAdminUser(req.user),
    });
  } catch (error: any) {
    console.error('GET /api/me error:', error);
    res.status(500).json({ 
      error: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message 
    });
  }
});

app.get('/api/profile', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }

    if (isOfflineOnlyUser(req.user)) {
      return res.json({
        userId: req.user.id,
        displayName: req.user.username,
        language: null,
        activeArchetype: null,
        preferences: {
          offlineOnly: true,
          entitlement: hasFounderAccess(req.user) ? 'founder' : undefined
        },
        isAdmin: isAdminUser(req.user)
      });
    }

    const profile = await getUserProfile(req.user.id);
    res.json({
      userId: req.user.id,
      displayName: profile?.display_name || req.user.username,
      language: profile?.language || null,
      activeArchetype: profile?.active_archetype || null,
      preferences: profile?.preferences || {},
      isAdmin: isAdminUser(req.user)
    });
  } catch (error: any) {
    console.error('GET /api/profile error:', error);
    res.status(500).json({
      error: process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : error.message
    });
  }
});

app.put('/api/profile', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }

    const { displayName, language, activeArchetype, preferences } = req.body as {
      displayName?: string;
      language?: string;
      activeArchetype?: string | null;
      preferences?: Record<string, unknown>;
    };

    const safeDisplayName = typeof displayName === 'string' ? displayName.trim().slice(0, 80) : undefined;
    const safeLanguage = language === 'DE' || language === 'EN' ? language : undefined;
    const safeActiveArchetype = typeof activeArchetype === 'string' ? activeArchetype.trim().slice(0, 64) : null;

    if (isOfflineOnlyUser(req.user)) {
      return res.json({
        userId: req.user.id,
        displayName: safeDisplayName || req.user.username,
        language: safeLanguage || null,
        activeArchetype: safeActiveArchetype,
        preferences: {
          offlineOnly: true,
          entitlement: hasFounderAccess(req.user) ? 'founder' : undefined
        },
        isAdmin: isAdminUser(req.user),
        persistenceStatus: 'offline_only_local'
      });
    }

    const existingProfile = await getUserProfile(req.user.id);
    const existingPreferences = existingProfile?.preferences && typeof existingProfile.preferences === 'object'
      ? existingProfile.preferences
      : {};
    const nextPreferences = preferences && typeof preferences === 'object'
      ? { ...existingPreferences, ...preferences, admin: existingPreferences.admin }
      : existingPreferences;

    const profile = await upsertUserProfile({
      user_id: req.user.id,
      display_name: safeDisplayName || existingProfile?.display_name || req.user.username,
      language: safeLanguage || existingProfile?.language || null,
      active_archetype: safeActiveArchetype || existingProfile?.active_archetype || null,
      preferences: nextPreferences
    });

    res.json({
      userId: req.user.id,
      displayName: profile?.display_name || safeDisplayName || req.user.username,
      language: profile?.language || safeLanguage || null,
      activeArchetype: profile?.active_archetype || safeActiveArchetype,
      preferences: profile?.preferences || {},
      isAdmin: isAdminUser(req.user)
    });
  } catch (error: any) {
    console.error('PUT /api/profile error:', error);
    if (req.user) {
      const fallbackDisplayName = typeof req.body?.displayName === 'string' && req.body.displayName.trim()
        ? req.body.displayName.trim().slice(0, 80)
        : req.user.username;

      return res.json({
        userId: req.user.id,
        displayName: fallbackDisplayName,
        language: req.body?.language === 'DE' || req.body?.language === 'EN' ? req.body.language : null,
        activeArchetype: typeof req.body?.activeArchetype === 'string' ? req.body.activeArchetype : null,
        preferences: {},
        persistenceStatus: 'failed_safe_fallback'
      });
    }

    res.status(500).json({
      error: process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : error.message
    });
  }
});

app.get('/api/admin/accounts', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!requireAdmin(req, res)) return;
    if (!isSupabaseConfigured()) {
      return res.json({ accounts: [], databaseStatus: 'disabled' });
    }

    const accounts = await listAdminAccounts();
    res.json({
      databaseStatus: 'configured',
      accounts: accounts.map(account => {
        const settings = getProfileAdminSettings(account.preferences);
        const access = getAccessFromRecord(account.access || null);
        const effectiveTier = access?.tier || settings.entitlement || 'free';
        return {
          userId: account.user_id,
          username: account.username || null,
          displayName: account.display_name || account.username || account.user_id,
          language: account.language || null,
          createdAt: account.profile_created_at || account.created_at || null,
          updatedAt: account.profile_updated_at || account.updated_at || null,
          entitlement: effectiveTier,
          offlineOnly: Boolean(settings.offlineOnly),
          activeUntil: access?.activeUntil || settings.activeUntil || null,
          betaActivations: access?.betaActivations ?? settings.betaActivations ?? 0,
          betaBonusUsed: access?.betaBonusUsed ?? settings.betaBonusUsed ?? false,
          notes: access?.notes || settings.notes || null,
          limits: {
            weeklyFreeInteractions: settings.weeklyFreeInteractions ?? null,
            weeklyCouncilSessions: settings.weeklyCouncilSessions ?? null,
            weeklyMeaningAnalyses: settings.weeklyMeaningAnalyses ?? null,
          },
        };
      }),
    });
  } catch (error: any) {
    console.error('GET /api/admin/accounts error:', error);
    res.status(500).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

app.put('/api/admin/accounts/:userId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!requireAdmin(req, res)) return;
    if (!isSupabaseConfigured()) {
      return res.status(503).json({ error: 'database_disabled' });
    }

    const targetUserId = String(req.params.userId || '').trim();
    if (!targetUserId) {
      return res.status(400).json({ error: 'user_id_required' });
    }

    const existingProfile = await getUserProfile(targetUserId);
    const existingPreferences = existingProfile?.preferences && typeof existingProfile.preferences === 'object'
      ? existingProfile.preferences
      : {};
    const adminSettings = sanitizeAdminSettings(req.body?.admin || req.body || {});
    const profile = await upsertUserProfile({
      user_id: targetUserId,
      display_name: existingProfile?.display_name || null,
      language: existingProfile?.language || null,
      active_archetype: existingProfile?.active_archetype || null,
      preferences: {
        ...existingPreferences,
        admin: adminSettings,
      },
    });
    const accessRecord: UserAccessRecord = {
      user_id: targetUserId,
      tier: adminSettings.entitlement === 'paid_beta' ? 'paid_beta' : adminSettings.entitlement || 'free',
      active_until: adminSettings.activeUntil || null,
      beta_activations: adminSettings.betaActivations || 0,
      beta_bonus_used: Boolean(adminSettings.betaBonusUsed),
      notes: adminSettings.notes || null,
    };
    localAccessRecords.set(targetUserId, accessRecord);
    await upsertUserAccess(accessRecord);

    res.json({
      userId: targetUserId,
      entitlement: adminSettings.entitlement,
      offlineOnly: adminSettings.offlineOnly,
      activeUntil: adminSettings.activeUntil || null,
      betaActivations: adminSettings.betaActivations || 0,
      betaBonusUsed: Boolean(adminSettings.betaBonusUsed),
      limits: {
        weeklyFreeInteractions: adminSettings.weeklyFreeInteractions,
        weeklyCouncilSessions: adminSettings.weeklyCouncilSessions,
        weeklyMeaningAnalyses: adminSettings.weeklyMeaningAnalyses,
      },
      updatedAt: profile?.updated_at || new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('PUT /api/admin/accounts/:userId error:', error);
    res.status(500).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

// Auth debug endpoint (protected, for detailed diagnostics)
app.get('/api/auth/debug', requireDebugEndpoint, authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const authHeader = req.headers?.authorization || '';
    
    // Extract token info without exposing full token
    const hasBearer = authHeader.startsWith('Bearer ');
    const tokenLength = hasBearer ? authHeader.substring(7).length : 0;
    const tokenPrefix = hasBearer && tokenLength > 0 
      ? authHeader.substring(7, Math.min(15, 7 + tokenLength)) + '...' 
      : null;
    
    // Check token validation result
    let verificationResult: string;
    if (!authHeader) {
      verificationResult = 'missing';
    } else if (!hasBearer) {
      verificationResult = 'malformed';
    } else if (!req.user) {
      verificationResult = 'invalid_signature';
    } else {
      verificationResult = 'ok';
    }
    
    // Get user info (safe - no secrets)
    const userInfo = req.user ? {
      userId: req.user.id,
      username: req.user.username,
      hasToken: false // JWT tokens are stateless, not stored in-memory
    } : null;
    
    res.json({
      tokenPresent: !!authHeader,
      tokenLocation: 'header',
      tokenFormat: hasBearer ? 'Bearer' : 'unknown',
      tokenLength: tokenLength,
      tokenPrefix: tokenPrefix, // First few chars for debugging (safe)
      verificationResult: verificationResult,
      userInfo: userInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Auth debug error:', error);
    res.status(500).json({ 
      error: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message 
    });
  }
});

// Login endpoint
app.post('/api/login', async (req: Request, res: Response) => {
  try {
    if (!runtimeConfig.localAuthEnabled) {
      return res.status(503).json({
        error: 'local_auth_disabled',
        message: 'Local test-user login is disabled in this runtime mode. Configure a production auth provider before accepting real users.'
      });
    }

    const { username, secret } = req.body;

    if (!username || !secret) {
      return res.status(400).json({ error: 'Username and secret are required' });
    }

    const secretHash = createHash('sha256').update(secret).digest('hex');
    const user = users.find(u => u.username === username && u.secretHash === secretHash);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Ensure user exists in Supabase (if configured)
    if (isSupabaseConfigured() && !isOfflineOnlyUser(user)) {
      await ensureUserExists(user.id, user.username, user.secretHash);
    }

    // Generate JWT token (stateless, restart-proof)
    if (!JWT_SECRET && runtimeConfig.authStrictMode) {
      console.error('[AUTH] JWT_SECRET required in production');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    // Explicitly set algorithm to HS256 for consistency
    const token = jwt.sign(
      {
        sub: user.id,
        username: user.username,
      },
      JWT_SECRET_FINAL,
      {
        algorithm: 'HS256',
        expiresIn: JWT_EXPIRY,
        issuer: 'violet-eightfold',
      }
    );
    
    // Log successful login (no secrets)
    console.log(`[AUTH] Login successful for username: ${user.username}`);
    
    // Note: We no longer store token in-memory (stateless JWT)
    // Legacy: user.token = token; // Removed for stateless auth

    res.json({
      userId: user.id,
      token,
      displayName: user.displayName || user.username,
    });
  } catch (error: any) {
    console.error('Login API error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Council endpoint
app.post('/api/council', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Security: Use userId from authenticated user, not from request body
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }
    
    const userId = req.user.id; // Server-side validated userId
    const { messages, userProfile } = (req.body as { messages?: any[]; userProfile?: any }) || {};

    // Validate messages array exists and is not empty
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ 
        error: 'messages array is required',
        message: 'Request body must include a non-empty messages array'
      });
    }

    if (messages.length === 0) {
      return res.status(400).json({ 
        error: 'messages array cannot be empty',
        message: 'At least one message is required'
      });
    }
    
    // Determine mode: direct chat (activeArchetype set) or council session
    const mode = userProfile?.activeArchetype ? 'direct' : 'council';
    const userMessageCount = messages.filter((msg: any) => msg?.role === 'user').length;
    if (mode === 'direct') {
      if (!(await enforceFeatureAccess(req, res, 'single_voice_reply'))) {
        return;
      }
    } else {
      const isInitialCouncilCall = userMessageCount <= 1;
      if (isInitialCouncilCall) {
        if (!(await enforceFeatureAccess(req, res, 'council_session'))) {
          return;
        }
      } else if (!(await enforceFeatureAccess(req, res, 'council_session', {
        increment: false,
        sessionReplyCount: Math.max(0, userMessageCount - 1),
      }))) {
        return;
      }
    }
    
    // Log request (no secrets) - CRITICAL for debugging mode detection
    console.log(`[API] Request - userId: ${userId}, mode: ${mode.toUpperCase()}, activeArchetype: ${userProfile?.activeArchetype || 'none'}`);

    const latestUserMessage = String(messages[messages.length - 1]?.content || '')
      .replace(/^\[(Antworte auf Deutsch\.|Respond in English\.)\]\s*/i, '')
      .trim();
    const responsePlan = createResponsePlan(latestUserMessage, {
      mode,
      activeArchetype: userProfile?.activeArchetype,
      language: userProfile?.language,
      conversationLength: messages.length,
      communicationMode: userProfile?.meaningContext?.communicationMode,
      overloadRisk: Boolean(userProfile?.meaningContext?.overloadSignal || userProfile?.meaningContext?.emotionalState?.overloadRisk),
    });

    // Build system prompt - COMPLETELY SEPARATE for direct vs council
    const systemPrompt = mode === 'direct' 
      ? buildDirectChatPrompt(userProfile, responsePlan)
      : buildCouncilSystemPrompt(userProfile, responsePlan);

    // Build conversation history
    const conversationHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = messages.map((msg: any) => ({
      role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: String(msg.content),
    }));

    const persistCouncilExchange = async (reply: string) => {
      // Best-effort persistence: database issues must not break no-budget/mock responses.
      if (!isSupabaseConfigured() || isOfflineOnlyUser(req.user)) {
        return;
      }

      try {
        const responseProvider = openai ? 'real' : 'mock';
        const sessionId = await createCouncilSession({
          user_id: userId,
          mode: mode,
          topic: mode === 'council' ? messages[0]?.content : undefined,
          messages: {
            messages: messages,
            reply: reply,
            userProfile: userProfile
          }
        });

        if (sessionId) {
          const persistedMessages: CouncilMessageRecord[] = messages
            .filter((msg: any) => msg?.content)
            .map((msg: any, index: number) => ({
              session_id: sessionId,
              user_id: userId,
              role: msg.role === 'user'
                ? 'user'
                : msg.role === 'system'
                  ? 'system'
                  : 'assistant',
              archetype_id: msg.archetypeId || null,
              content: String(msg.content),
              sequence_index: index,
              provider: responseProvider
            }));

          persistedMessages.push({
            session_id: sessionId,
            user_id: userId,
            role: 'assistant',
            archetype_id: mode === 'direct' ? userProfile?.activeArchetype || null : null,
            content: reply,
            sequence_index: persistedMessages.length,
            provider: responseProvider
          });

          await createCouncilMessages(persistedMessages);
        }

        await createLoreEntry({
          user_id: userId,
          type: mode === 'direct' ? 'direct' : 'council',
          content: {
            messages: messages,
            reply: reply,
            archetype: userProfile?.activeArchetype,
            language: userProfile?.language
          }
        });

        if (sessionId) {
          console.log(`[SUPABASE] Created session ${sessionId} with message rows for user ${userId}`);
        }
      } catch (error: any) {
        console.warn(`[SUPABASE] DB write failed for user ${userId}, mode ${mode}: ${error.message}`);
      }
    };

    if (!openai) {
      const reply = createMockCouncilReply({
        mode,
        activeArchetype: userProfile?.activeArchetype,
        language: userProfile?.language,
        topic: latestUserMessage,
        responsePlan
      });
      await persistCouncilExchange(reply);
      return res.json({
        reply,
        provider: 'mock',
        serviceStatus: runtimeConfig.aiProviderEnabled ? 'missing_credentials' : 'disabled'
      });
    }

    // Call OpenAI with robust error handling
    // Use lower temperature for direct mode to enforce single voice
    const temperature = mode === 'direct' ? 0.5 : 0.7;
    
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: runtimeConfig.openAiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
        ] as Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
        temperature: temperature,
        stream: false,
      });
      
      // Log mode and temperature for debugging
      console.log(`[API] OpenAI call - mode: ${mode.toUpperCase()}, model: ${runtimeConfig.openAiModel}, temperature: ${temperature}, promptLength: ${systemPrompt.length}`);
    } catch (openaiError: any) {
      // Handle OpenAI API errors gracefully
      console.error('[COUNCIL] OpenAI API error:', {
        status: openaiError?.status,
        code: openaiError?.code,
        message: openaiError?.message,
        userId: userId,
        mode: mode
      });
      
      // Return user-friendly error messages
      if (openaiError?.status === 401) {
        return res.status(500).json({ 
          error: 'OpenAI API authentication failed',
          message: 'The OpenAI API key is invalid. Please contact the administrator.'
        });
      } else if (openaiError?.status === 429) {
        return res.status(503).json({ 
          error: 'OpenAI API rate limit exceeded',
          message: 'The service is temporarily unavailable due to rate limits. Please try again later.'
        });
      } else if (openaiError?.status === 500 || openaiError?.status === 502 || openaiError?.status === 503) {
        return res.status(503).json({ 
          error: 'OpenAI API service unavailable',
          message: 'The AI service is temporarily unavailable. Please try again later.'
        });
      } else {
        // Generic error - sanitize in production
        const errorMessage = process.env.NODE_ENV === 'production'
          ? 'AI service error. Please try again later.'
          : (openaiError?.message || 'OpenAI API error');
        return res.status(500).json({ 
          error: 'AI service error',
          message: errorMessage
        });
      }
    }

    // Extract reply safely
    let reply = completion?.choices?.[0]?.message?.content || '';
    if (!reply) {
      console.warn('[API] Empty reply from OpenAI', { userId, mode });
      reply = 'I apologize, but I could not generate a response. Please try again.';
    }

    if (mode === 'council' && responsePlan.shouldUseCouncil && openai && countCouncilSpeakers(reply) < 2) {
      console.warn('[COUNCIL] Too few council speakers; retrying with strict multi-voice format', {
        userId,
        speakerCount: countCouncilSpeakers(reply),
        replyPreview: reply.substring(0, 160),
      });

      try {
        const retryCompletion = await openai.chat.completions.create({
          model: runtimeConfig.openAiModel,
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationHistory,
            {
              role: 'system',
              content:
                'FORMAT REPAIR: Your previous council response had too few distinct voices for a true council moment. Return a brief council round with 2-4 distinct [[SPEAKER: ARCHETYPE_ID]] sections, using only valid IDs: SOVEREIGN, WARRIOR, SAGE, LOVER, CREATOR, CAREGIVER, EXPLORER, ALCHEMIST. Do not force closure. End with one living question unless the user explicitly asked for a decision or action plan. Do not explain the repair.',
            },
          ] as Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
          temperature: 0.65,
          stream: false,
        });

        const repairedReply = retryCompletion?.choices?.[0]?.message?.content || '';
        if (countCouncilSpeakers(repairedReply) >= 2) {
          reply = repairedReply;
        } else {
          console.warn('[COUNCIL] Format repair still had too few speakers; returning original reply', {
            userId,
            repairedSpeakerCount: countCouncilSpeakers(repairedReply),
          });
        }
      } catch (repairError: any) {
        console.warn('[COUNCIL] Format repair retry failed; returning original reply', {
          userId,
          message: repairError?.message,
        });
      }
    }

    // CRITICAL: In DIRECT mode, strip any council structure that might have leaked through
    if (mode === 'direct') {
      const originalReply = reply;
      // Remove any [[SPEAKER:]] tags
      reply = reply.replace(/\[\[SPEAKER:[^\]]+\]\]/gi, '');
      // Remove MODERATOR: lines
      reply = reply.replace(/^MODERATOR:.*$/gmi, '');
      // Remove SOVEREIGN DECISION: sections
      reply = reply.replace(/SOVEREIGN DECISION:.*$/gmi, '');
      // Clean up multiple newlines
      reply = reply.replace(/\n{3,}/g, '\n\n').trim();
      
      // Log if we had to clean the response
      if (reply !== originalReply) {
        console.warn('[API] DIRECT mode: Stripped council structure from response', { 
          userId, 
          activeArchetype: userProfile?.activeArchetype,
          originalLength: originalReply.length,
          cleanedLength: reply.length,
          hadSpeakerTags: originalReply.includes('[[SPEAKER:'),
          hadModerator: originalReply.includes('MODERATOR:'),
          hadSovereignDecision: originalReply.includes('SOVEREIGN DECISION:'),
        });
      }
    }

    await persistCouncilExchange(reply);

    res.json({ reply });
  } catch (error: any) {
    console.error('Council API error:', error);
    // Sanitize error messages in production
    const errorMessage = process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : (error.message || 'Internal server error');
    res.status(500).json({ error: errorMessage });
  }
});

// Integration endpoint (for questlog integration) - DEPRECATED: Use /api/meaning/analyze instead
app.post('/api/integrate', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }
    
    const userId = req.user.id;
    const { sessionHistory, topic } = req.body as { sessionHistory?: any[]; topic?: string };
    
    if (!sessionHistory || !Array.isArray(sessionHistory)) {
      return res.status(400).json({ error: 'sessionHistory array is required' });
    }
    
    // Persist integration to Supabase (if configured)
    if (isSupabaseConfigured() && !isOfflineOnlyUser(req.user)) {
      try {
        await createLoreEntry({
          user_id: userId,
          type: 'integration',
          content: {
            topic: topic,
            sessionHistory: sessionHistory,
            integratedAt: new Date().toISOString()
          }
        });
        console.log(`[SUPABASE] Created integration entry for user ${userId}`);
      } catch (error: any) {
        console.error('[SUPABASE] Error persisting integration:', error.message);
        // Don't fail the request if Supabase write fails
      }
    }
    
    // Return minimal analysis (can be enhanced later with AI analysis)
    res.json({
      newLoreEntry: `Session integrated: ${topic || 'Council session'} - ${sessionHistory.length} exchanges`,
      updatedQuest: null,
      updatedState: null,
      newMilestone: null,
      newAttribute: null
    });
  } catch (error: any) {
    console.error('Integration API error:', error);
    res.status(500).json({ 
      error: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message 
    });
  }
});

app.get('/api/payment/status', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: User not found' });
  }

  res.json({
    userId: req.user.id,
    provider: 'mock',
    status: serviceReadiness.payment ? 'ready_to_connect' : 'disabled',
    entitlement: 'free',
    featureStatus: runtimeConfig.paymentEnabled
      ? 'blocked until credentials/budget exist'
      : 'mocked safely',
    message: 'Payment checks are server-side and mocked until a real provider and webhook secret are configured.'
  });
});

app.get('/api/access/status', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: User not found' });
  }

  const access = await getEffectiveAccess(req.user);
  const periodKey = getWeekKey();
  const [singleVoiceReplies, councilSessions, blueprintSaves] = await Promise.all([
    getFeatureUsage(req.user.id, periodKey, 'single_voice_reply'),
    getFeatureUsage(req.user.id, periodKey, 'council_session'),
    getFeatureUsage(req.user.id, periodKey, 'blueprint_save'),
  ]);

  res.json({
    userId: req.user.id,
    tier: access.tier,
    active: hasFounderAccess(req.user) || isAccessActive(access),
    activeUntil: access.activeUntil,
    betaActivations: access.betaActivations,
    betaBonusUsed: access.betaBonusUsed,
    source: access.source,
    weeklyResetAt: getWeeklyResetAt(),
    freeLimits: {
      singleVoiceReplies: FREE_SINGLE_VOICE_REPLIES,
      councilSessions: FREE_COUNCIL_SESSIONS,
      councilRepliesPerSession: FREE_COUNCIL_REPLIES_PER_SESSION,
      blueprintSaves: FREE_BLUEPRINT_SAVES,
      cycleDays: FREE_CYCLE_DAYS,
    },
    usage: {
      singleVoiceReplies,
      councilSessions,
      blueprintSaves,
    },
    beta: {
      priceEur: BETA_PRICE_EUR,
      accessDays: BETA_ACCESS_DAYS,
      provider: 'mock',
      bonusAvailable: access.betaActivations >= 2 && !access.betaBonusUsed,
    },
  });
});

app.post('/api/access/check-cycle-day', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: User not found' });
  }

  const day = Number(req.body?.day || 0);
  if (day <= FREE_CYCLE_DAYS) {
    return res.json({ allowed: true, freeUntilDay: FREE_CYCLE_DAYS });
  }

  if (!(await enforceFeatureAccess(req, res, 'cycle_day_6', { increment: false }))) {
    return;
  }

  res.json({ allowed: true, freeUntilDay: FREE_CYCLE_DAYS });
});

app.post('/api/access/mock-activate-beta', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: User not found' });
  }
  if (isOfflineOnlyUser(req.user)) {
    return res.status(409).json({
      error: 'offline_only_account',
      message: 'This account is protected as local-only and cannot be activated remotely.',
    });
  }

  const current = await getEffectiveAccess(req.user);
  const bonusAvailable = current.betaActivations >= 2 && !current.betaBonusUsed;
  const now = Date.now();
  const baseTime = current.activeUntil && new Date(current.activeUntil).getTime() > now
    ? new Date(current.activeUntil).getTime()
    : now;
  const activeUntil = new Date(baseTime + BETA_ACCESS_DAYS * 86400000).toISOString();
  const nextAccess: UserAccessRecord = {
    user_id: req.user.id,
    tier: 'paid_beta',
    active_until: activeUntil,
    beta_activations: bonusAvailable ? current.betaActivations : current.betaActivations + 1,
    beta_bonus_used: bonusAvailable ? true : current.betaBonusUsed,
    notes: bonusAvailable ? 'Mock bonus beta period after two activations.' : 'Mock beta activation.',
  };

  localAccessRecords.set(req.user.id, nextAccess);
  await upsertUserAccess(nextAccess);

  res.json({
    tier: nextAccess.tier,
    activeUntil: nextAccess.active_until,
    betaActivations: nextAccess.beta_activations,
    betaBonusUsed: nextAccess.beta_bonus_used,
    charged: !bonusAvailable,
    provider: 'mock',
  });
});

// Meaning Agent endpoint - analyzes session transcript and returns canonical JSON
app.post('/api/meaning/analyze', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }
    
    const userId = req.user.id;
    const { 
      sessionId, 
      mode, 
      activeArchetype, 
      language,
      messages, 
      userLore, 
      currentQuestState,
      meaningContext,
      persist,
    } = req.body as { 
      sessionId?: string;
      mode?: 'single' | 'council';
      activeArchetype?: string;
      language?: 'EN' | 'DE';
      messages?: Array<{ role: string; content: string; meta?: any }>;
      userLore?: string;
      currentQuestState?: { title?: string; state?: string; objective?: string };
      meaningContext?: any;
      persist?: boolean;
    };
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required and cannot be empty' });
    }

    if (persist === true && !(await enforceFeatureAccess(req, res, 'blueprint_save', { increment: false }))) {
      return;
    }

    if (!openai) {
      if (persist === true && !(await enforceFeatureAccess(req, res, 'blueprint_save'))) {
        return;
      }

      const mockResult = createMockMeaningResult();

      if (persist === true) {
        await mergeLocalMeaningState(userId, mockResult);
      }

      return res.json({
        ...mockResult,
        provider: 'mock',
        serviceStatus: runtimeConfig.aiProviderEnabled ? 'missing_credentials' : 'disabled'
      });
    }
    
    // Build transcript text (clean, no speaker tags)
    const transcript = messages
      .map(msg => {
        const role = msg.role === 'user' ? 'USER' : 'ASSISTANT';
        // Remove any [[SPEAKER:]] tags or MODERATOR text
        let content = String(msg.content || '');
        content = content.replace(/\[\[SPEAKER:[^\]]+\]\]/gi, '');
        content = content.replace(/^MODERATOR:.*$/gmi, '');
        content = content.replace(/SOVEREIGN DECISION:.*$/gmi, '');
        content = content.trim();
        return `${role}: ${content}`;
      })
      .join('\n\n');
    
    const outputLanguage = language === 'DE' ? 'DE' : 'EN';
    const outputLanguageInstruction = outputLanguage === 'DE'
      ? `OUTPUT LANGUAGE:
- Write every user-facing string value in German.
- This includes questLogEntries.title/content, soulTimelineEvents.label/summary, breakthroughs.title/insight/trigger/action, and nextQuestState fields.
- Keep JSON property names exactly in English.
- Type constants such as "BREAKTHROUGH" and "EVENT" must remain English constants.`
      : `OUTPUT LANGUAGE:
- Write every user-facing string value in English.
- Keep JSON property names and type constants exactly as specified.`;

    // Build analysis prompt
    const analysisPrompt = `You are the Meaning Agent. Analyze this conversation transcript and extract meaningful insights.

TRANSCRIPT:
${transcript}

${userLore ? `USER CONTEXT:\n${userLore}\n` : ''}
${currentQuestState ? `CURRENT QUEST: ${currentQuestState.title || 'None'}\nCURRENT STATE: ${currentQuestState.state || 'None'}\n` : ''}
${meaningContext?.emotionalState ? `CURRENT EMOTIONAL STATE SCAN:
${JSON.stringify(meaningContext.emotionalState, null, 2)}

Use this as a soft communication signal only. It is not a diagnosis. Preserve user agency and avoid labeling the user.
` : ''}

${outputLanguageInstruction}

Analyze this conversation and return JSON ONLY (no prose, no explanations). Extract:

1. **Questlog Entry**: One meaningful questlog entry summarizing the session's main topic/objective
2. **Soul Timeline Event**: One significant event or moment from the conversation
3. **Breakthrough**: One breakthrough or realization (if any occurred, otherwise empty array)
4. **Emotional State**: A gentle communication scan for tone/pacing, not a diagnosis

Rules:
- Return STRICT JSON only (no markdown, no code blocks, no explanations)
- Never include MODERATOR text or speaker tags
- Produce minimal but meaningful records: typically 1 quest entry + 1 timeline event + 1 breakthrough per session
- If session is empty or trivial, return empty arrays
- Use ISO date strings for createdAt fields
- Generate unique IDs (use short UUIDs or timestamps)
- emotionalState must use schemaVersion 1, valence POSITIVE/NEUTRAL/MIXED/NEGATIVE, activation LOW/MEDIUM/HIGH, clarity CLEAR/UNCERTAIN/OVERLOADED, supportNeeds from PRESENCE/MIRRORING/GROUNDING/CLARITY/ACTION, and confidence from 0 to 1.

Return this exact JSON structure:
{
  "questLogEntries": [{"id": "...", "createdAt": "...", "title": "...", "content": "...", "tags": [], "relatedArchetypes": [], "sourceSessionId": "..."}],
  "soulTimelineEvents": [{"id": "...", "createdAt": "...", "label": "...", "summary": "...", "intensity": 5, "type": "EVENT", "tags": [], "sourceSessionId": "..."}],
  "breakthroughs": [{"id": "...", "createdAt": "...", "title": "...", "insight": "...", "trigger": "...", "action": "...", "tags": [], "sourceSessionId": "..."}],
  "emotionalState": {"schemaVersion": 1, "valence": "MIXED", "activation": "MEDIUM", "clarity": "UNCERTAIN", "primarySignals": [], "supportNeeds": [], "overloadRisk": false, "confidence": 0.5, "updatedAt": "..."},
  "attributeUpdates": [],
  "skillUpdates": [],
  "nextQuestState": null
}

IMPORTANT: If you identify a breakthrough, you MUST:
1. Include it in the "breakthroughs" array
2. ALSO include a corresponding entry in "soulTimelineEvents" with type: "BREAKTHROUGH"
3. The timeline event should have the same title/label as the breakthrough title
4. This ensures breakthroughs appear in both the timeline and the breakthroughs panel.`;

    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: runtimeConfig.openAiModel,
        messages: [
          { role: 'system', content: 'You are a JSON-only API. Return valid JSON only, no markdown, no explanations.' },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.3, // Lower temperature for more consistent JSON
        response_format: { type: 'json_object' }, // Force JSON mode
      });
    } catch (openaiError: any) {
      console.error('[MEANING] OpenAI API error:', {
        status: openaiError?.status,
        message: openaiError?.message,
        userId: userId
      });
      
      if (openaiError?.status === 401) {
        return res.status(500).json({ 
          error: 'OpenAI API authentication failed',
          message: 'The OpenAI API key is invalid.'
        });
      } else if (openaiError?.status === 429) {
        return res.status(503).json({ 
          error: 'OpenAI API rate limit exceeded',
          message: 'The service is temporarily unavailable. Please try again later.'
        });
      } else {
        const errorMessage = process.env.NODE_ENV === 'production'
          ? 'AI service error. Please try again later.'
          : (openaiError?.message || 'OpenAI API error');
        return res.status(500).json({ 
          error: 'AI service error',
          message: errorMessage
        });
      }
    }
    
    // Extract and validate JSON response
    let responseText = completion?.choices?.[0]?.message?.content || '';
    if (!responseText) {
      console.warn('[MEANING] Empty response from OpenAI', { userId });
      return res.status(500).json({ 
        error: 'Invalid response from AI service',
        message: 'The AI service returned an empty response.'
      });
    }
    
    // Clean potential markdown code blocks
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // Parse and validate JSON
    let analysisResult;
    try {
      analysisResult = JSON.parse(responseText);
    } catch (parseError: any) {
      console.error('[MEANING] JSON parse error:', {
        error: parseError.message,
        responsePreview: responseText.substring(0, 200),
        userId: userId
      });
      return res.status(500).json({ 
        error: 'Invalid JSON response from AI service',
        message: 'The AI service returned invalid JSON. Please try again.'
      });
    }
    
    // Validate structure (ensure required arrays exist)
    if (!analysisResult.questLogEntries || !Array.isArray(analysisResult.questLogEntries)) {
      analysisResult.questLogEntries = [];
    }
    if (!analysisResult.soulTimelineEvents || !Array.isArray(analysisResult.soulTimelineEvents)) {
      analysisResult.soulTimelineEvents = [];
    }
    if (!analysisResult.breakthroughs || !Array.isArray(analysisResult.breakthroughs)) {
      analysisResult.breakthroughs = [];
    }
    if (analysisResult.emotionalState && typeof analysisResult.emotionalState === 'object') {
      analysisResult.emotionalState = {
        schemaVersion: 1,
        valence: analysisResult.emotionalState.valence || 'NEUTRAL',
        activation: analysisResult.emotionalState.activation || 'MEDIUM',
        clarity: analysisResult.emotionalState.clarity || 'UNCERTAIN',
        primarySignals: Array.isArray(analysisResult.emotionalState.primarySignals) ? analysisResult.emotionalState.primarySignals : [],
        supportNeeds: Array.isArray(analysisResult.emotionalState.supportNeeds) ? analysisResult.emotionalState.supportNeeds : [],
        overloadRisk: Boolean(analysisResult.emotionalState.overloadRisk),
        confidence: typeof analysisResult.emotionalState.confidence === 'number' ? analysisResult.emotionalState.confidence : 0.5,
        updatedAt: analysisResult.emotionalState.updatedAt || new Date().toISOString()
      };
    }
    
    // Ensure all timeline events have required fields
    analysisResult.soulTimelineEvents.forEach((event: any) => {
      if (!event.label) event.label = 'Timeline Event';
      if (!event.summary) event.summary = '';
      if (!event.type) event.type = 'EVENT';
    });
    
    // Ensure all breakthroughs have required fields
    analysisResult.breakthroughs.forEach((bt: any) => {
      if (!bt.title) bt.title = 'Breakthrough';
      if (!bt.insight) bt.insight = '';
    });
    
    // Add sourceSessionId to all entries if provided
    if (sessionId) {
      analysisResult.questLogEntries.forEach((entry: any) => {
        if (!entry.sourceSessionId) entry.sourceSessionId = sessionId;
      });
      analysisResult.soulTimelineEvents.forEach((event: any) => {
        if (!event.sourceSessionId) event.sourceSessionId = sessionId;
      });
      analysisResult.breakthroughs.forEach((breakthrough: any) => {
        if (!breakthrough.sourceSessionId) breakthrough.sourceSessionId = sessionId;
      });
    }
    
    // Normalize meaning result: ensure breakthroughs also appear as timeline events
    const now = new Date().toISOString();
    
    // Ensure createdAt fields are ISO strings and generate IDs
    analysisResult.questLogEntries.forEach((entry: any) => {
      if (!entry.createdAt) entry.createdAt = now;
      if (!entry.id) entry.id = `quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    });
    
    analysisResult.soulTimelineEvents.forEach((event: any) => {
      if (!event.createdAt) event.createdAt = now;
      if (!event.id) event.id = `timeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      if (!event.type) event.type = 'EVENT'; // Default type
    });
    
    analysisResult.breakthroughs.forEach((breakthrough: any) => {
      if (!breakthrough.createdAt) breakthrough.createdAt = now;
      if (!breakthrough.id) breakthrough.id = `breakthrough_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Ensure breakthrough also appears as timeline event with type BREAKTHROUGH
      const existingTimelineEvent = analysisResult.soulTimelineEvents.find(
        (e: any) => e.label === breakthrough.title || e.id === breakthrough.id
      );
      
      if (!existingTimelineEvent) {
        // Create corresponding timeline event for this breakthrough
        analysisResult.soulTimelineEvents.push({
          id: breakthrough.id, // Use same ID to link them
          createdAt: breakthrough.createdAt,
          label: breakthrough.title,
          summary: breakthrough.insight,
          type: 'BREAKTHROUGH',
          intensity: 10, // Breakthroughs are high intensity
          tags: breakthrough.tags || [],
          sourceSessionId: breakthrough.sourceSessionId
        });
      } else {
        // Update existing timeline event to mark it as breakthrough
        existingTimelineEvent.type = 'BREAKTHROUGH';
        existingTimelineEvent.intensity = 10;
      }
    });

    const shouldPersistMeaning = persist === true;

    if (shouldPersistMeaning && !(await enforceFeatureAccess(req, res, 'blueprint_save'))) {
      return;
    }

    // Persist to Supabase only when the user explicitly saves/integrates.
    if (shouldPersistMeaning && isSupabaseConfigured() && !isOfflineOnlyUser(req.user)) {
      try {
        // Persist questlog entries
        for (const entry of analysisResult.questLogEntries) {
          await createQuestLogEntry({
            user_id: userId,
            title: entry.title,
            content: entry.content,
            tags: entry.tags || [],
            related_archetypes: entry.relatedArchetypes || [],
            source_session_id: entry.sourceSessionId || sessionId || undefined,
            created_at: entry.createdAt
          });
        }
        
        // Persist timeline events
        for (const event of analysisResult.soulTimelineEvents) {
          await createSoulTimelineEvent({
            user_id: userId,
            label: event.label,
            summary: event.summary,
            intensity: event.intensity,
            type: event.type || 'EVENT',
            tags: event.tags || [],
            source_session_id: event.sourceSessionId || sessionId || undefined,
            created_at: event.createdAt
          });
        }
        
        // Persist breakthroughs
        for (const breakthrough of analysisResult.breakthroughs) {
          await createBreakthrough({
            user_id: userId,
            title: breakthrough.title,
            insight: breakthrough.insight,
            trigger: breakthrough.trigger,
            action: breakthrough.action,
            tags: breakthrough.tags || [],
            source_session_id: breakthrough.sourceSessionId || sessionId || undefined,
            created_at: breakthrough.createdAt
          });
        }
        
        console.log(`[MEANING] Persisted ${analysisResult.questLogEntries.length} questlog entries, ${analysisResult.soulTimelineEvents.length} timeline events, ${analysisResult.breakthroughs.length} breakthroughs for user ${userId}`);
      } catch (error: any) {
        console.warn(`[SUPABASE] Error persisting meaning analysis for user ${userId}:`, error.message);
        // Don't fail the request if DB write fails
      }
    }

    if (shouldPersistMeaning) {
      try {
        await mergeLocalMeaningState(userId, analysisResult);
      } catch (error: any) {
        console.warn(`[LOCAL_STORE] Error persisting meaning analysis for user ${userId}:`, error.message);
      }
    }
    
    console.log(`[MEANING] Analysis complete for user ${userId}`, {
      questLogEntries: analysisResult.questLogEntries.length,
      timelineEvents: analysisResult.soulTimelineEvents.length,
      breakthroughs: analysisResult.breakthroughs.length,
      persisted: shouldPersistMeaning
    });
    
    res.json(analysisResult);
  } catch (error: any) {
    console.error('[MEANING] Analysis error:', error);
    const errorMessage = process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : (error.message || 'Internal server error');
    res.status(500).json({ error: errorMessage });
  }
});

// Get persisted meaning state (questlog, timeline, breakthroughs)
app.get('/api/meaning/state', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }
    
    const userId = req.user.id;
    const localState = await loadLocalMeaningState(userId);
    
    // Load from Supabase if configured
    if (isSupabaseConfigured() && !isOfflineOnlyUser(req.user)) {
      try {
        const [questLogEntries, timelineEvents, breakthroughs] = await Promise.all([
          getQuestLogEntries(userId),
          getSoulTimelineEvents(userId),
          getBreakthroughs(userId)
        ]);
        
        // Transform to frontend format
        const result = {
          questLogEntries: [
            ...questLogEntries.map(entry => ({
            id: entry.id!,
            createdAt: entry.created_at || new Date().toISOString(),
            title: entry.title,
            content: entry.content,
            tags: entry.tags || [],
            relatedArchetypes: entry.related_archetypes || [],
            sourceSessionId: entry.source_session_id
            })),
            ...localState.questLogEntries,
          ],
          soulTimelineEvents: [
            ...timelineEvents.map(event => ({
            id: event.id!,
            createdAt: event.created_at || new Date().toISOString(),
            label: event.label,
            summary: event.summary,
            intensity: event.intensity,
            type: event.type || 'EVENT',
            tags: event.tags || [],
            sourceSessionId: event.source_session_id
            })),
            ...localState.soulTimelineEvents,
          ],
          breakthroughs: [
            ...breakthroughs.map(bt => ({
            id: bt.id!,
            createdAt: bt.created_at || new Date().toISOString(),
            title: bt.title,
            insight: bt.insight,
            trigger: bt.trigger,
            action: bt.action,
            tags: bt.tags || [],
            sourceSessionId: bt.source_session_id
            })),
            ...localState.breakthroughs,
          ],
          emotionalState: localState.emotionalState,
          attributeUpdates: localState.attributeUpdates,
          skillUpdates: localState.skillUpdates,
          nextQuestState: localState.nextQuestState,
        };
        
        console.log(`[MEANING] Loaded state for user ${userId}`, {
          questLogEntries: result.questLogEntries.length,
          timelineEvents: result.soulTimelineEvents.length,
          breakthroughs: result.breakthroughs.length
        });
        
        return res.json(result);
      } catch (error: any) {
        console.error('[MEANING] Error loading state from Supabase:', error.message);
        // Fall through to empty response
      }
    }
    
    res.json(localState);
  } catch (error: any) {
    console.error('[MEANING] Error loading state:', error);
    res.status(500).json({ 
      error: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message 
    });
  }
});

// Load archetypes config
function loadArchetypesConfig() {
  try {
    const configPath = join(__dirname, '../config/archetypes.json');
    const configData = readFileSync(configPath, 'utf-8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('Failed to load archetypes config:', error);
    return {};
  }
}

// Helper function to build system prompt
// COMPLETELY SEPARATE prompt builder for DIRECT CHAT mode
function buildDirectChatPrompt(userProfile: any, responsePlan?: ResponsePlan): string {
  const archetypesConfig = loadArchetypesConfig();
  const language = userProfile?.language || 'EN';
  const activeArchetype = userProfile?.activeArchetype;

  if (!activeArchetype || !archetypesConfig[activeArchetype]) {
    // Fallback if archetype not found
    return 'You are a helpful assistant. Respond directly to the user in a natural, conversational way.';
  }

  const archetypeConfig = archetypesConfig[activeArchetype];
  const archetypeName = archetypeConfig.name?.[language] || archetypeConfig.name?.EN || activeArchetype;
  const baseSystemPrompt = archetypeConfig.systemPrompt?.[language] || archetypeConfig.systemPrompt?.EN || '';
  const communicationContract = buildCommunicationContract(userProfile?.meaningContext, language, 'direct', archetypeName);
  const organicPromptBlock = responsePlan ? buildOrganicPromptBlock(responsePlan) : '';
  
  // Clean the base prompt - remove any council references
  const cleanedPrompt = baseSystemPrompt
    .replace(/council/gi, 'internal guidance')
    .replace(/other archetypes/gi, 'other perspectives')
    .replace(/weigh the inputs from other/gi, 'consider different perspectives');
  
  // STRICT DIRECT MODE PROMPT - NO COUNCIL STRUCTURE ALLOWED
  const directChatPrompt = `${cleanedPrompt}

${communicationContract}

${organicPromptBlock}

═══════════════════════════════════════════════════════════════
CRITICAL: SINGLE VOICE MODE - YOU MUST FOLLOW THESE RULES EXACTLY
═══════════════════════════════════════════════════════════════

YOU ARE IN SINGLE VOICE MODE. This means:

1. YOU ARE THE ONLY VOICE SPEAKING
   - You are ${archetypeName} and ONLY ${archetypeName}
   - NO other archetypes may speak
   - NO council dialogue
   - NO multi-voice discussion

2. FORBIDDEN FORMATS - DO NOT USE:
   ❌ [[SPEAKER: ANYTHING]]
   ❌ MODERATOR: or any moderator introduction
   ❌ SOVEREIGN DECISION:
   ❌ NEXT STEPS: (unless you're offering YOUR OWN next steps)
   ❌ Multiple archetype names or voices
   ❌ Council structure or format

3. REQUIRED FORMAT:
   ✅ Plain, natural text
   ✅ Speak as ${archetypeName} directly to the user
   ✅ Use "I" not "we"
   ✅ Offer YOUR OWN conclusions and next steps (if any)
   ✅ Stay fully in character as ${archetypeName}

4. EXAMPLES OF WRONG RESPONSES (DO NOT DO THIS):
   ❌ "[[SPEAKER: ALCHEMIST]] The shadow work requires..."
   ❌ "MODERATOR: The council convenes..."
   ❌ "SOVEREIGN DECISION: We will..."
   ❌ Multiple paragraphs with different archetype voices

5. EXAMPLES OF CORRECT RESPONSES (DO THIS):
   ✅ "One thing I notice is this pattern. In this situation, it may help to look at [specific angle]."
   ✅ "As ${archetypeName}, I would read it this way: [your perspective]. That is one lens, not the whole truth."

REMEMBER: You are ${archetypeName} speaking ONE-ON-ONE with the user. No council. No other voices. Just you.`;

  // Add user profile context if provided
  if (userProfile && userProfile.lore) {
    return `${directChatPrompt}

[USER PSYCHOLOGICAL PROFILE & BACKGROUND]
${userProfile.lore}

Integrate this context into your understanding. DO NOT recite these facts explicitly unless relevant. Use them to shape your advice and tone as ${archetypeName}.`;
  }

  return directChatPrompt;
}

function buildCommunicationContract(meaningContext: any, language: string, mode: 'direct' | 'council', voiceName?: string): string {
  const communicationMode = meaningContext?.communicationMode || 'MIRROR';
  const consentState = meaningContext?.consentState || 'ASK_BEFORE_DEEPENING';
  const cycleLine = meaningContext?.activeCycleTheme
    ? `Active integration cycle: day ${meaningContext.activeCycleDay || '?'} around "${meaningContext.activeCycleTheme}".`
    : 'No active integration cycle context was provided.';
  const emotionalState = meaningContext?.emotionalState;
  const emotionalLine = emotionalState
    ? `Emotional scan: valence=${emotionalState.valence || 'UNKNOWN'}, activation=${emotionalState.activation || 'UNKNOWN'}, clarity=${emotionalState.clarity || 'UNKNOWN'}, overloadRisk=${Boolean(emotionalState.overloadRisk)}, supportNeeds=${Array.isArray(emotionalState.supportNeeds) ? emotionalState.supportNeeds.join(', ') : 'none'}. Treat this as a soft pacing signal, never as a diagnosis.`
    : 'No emotional scan was provided.';
  const identityLine = mode === 'direct' && voiceName
    ? `Apply this as ${voiceName}'s own voice, not as a meta-system announcement.`
    : 'Apply this across the council without turning it into a generic moderator lecture.';

  const descriptions: Record<string, { EN: string; DE: string }> = {
    HOLD: {
      EN: 'Hold space. Let the story breathe. Use fewer interpretations, fewer solutions, and more presence.',
      DE: 'Halte Raum. Lass die Geschichte atmen. Nutze weniger Deutung, weniger Lösung, mehr Präsenz.',
    },
    MIRROR: {
      EN: 'Mirror clearly. Reflect what is alive without rushing toward a fix.',
      DE: 'Spiegle klar. Reflektiere, was lebendig ist, ohne vorschnell zu reparieren.',
    },
    EXPLORE: {
      EN: 'Explore gently. Ask careful questions and deepen only one layer at a time.',
      DE: 'Erkunde vorsichtig. Stelle sorgfältige Fragen und vertiefe nur eine Schicht auf einmal.',
    },
    GROUND: {
      EN: 'Ground. Reduce intensity, simplify the field, and protect the user from overload.',
      DE: 'Erde. Senke die Intensität, vereinfache das Feld und schütze vor Überlastung.',
    },
    ACT: {
      EN: 'Act. Translate insight into one small, clean, realistic next move.',
      DE: 'Handle. Übersetze Einsicht in eine kleine, klare, realistische nächste Bewegung.',
    },
  };

  const description = descriptions[communicationMode]?.[language === 'DE' ? 'DE' : 'EN'] || descriptions.MIRROR.EN;

  if (language === 'DE') {
    return `KOMMUNIKATIONSVERTRAG:
- Aktueller Modus: ${communicationMode}. ${description}
- Consent-State: ${consentState}. Frage nach Erlaubnis, bevor du tief deutest, umlenkst oder einen Exit Room öffnest, wenn der Nutzer überlastet wirken könnte.
- Geschichten dürfen leben. Nicht jede Intensität ist ein Problem; nicht jede Wiederholung braucht sofort eine Lösung.
- Exit Rooms sind verfügbar, aber nicht reflexhaft. Nutze sie nur bei klarer Überlastung, Feststecken, Selbstverlust oder ausdrücklichem Wunsch.
- Wenn nötig, frage knapp: "Soll ich das halten, spiegeln, sortieren, erden oder in eine kleine Handlung übersetzen?"
- ${emotionalLine}
- Wenn Aktivierung hoch oder Overload-Risiko wahr ist: langsamer, klarer, weniger Optionen, zuerst Halt/Erden.
- ${cycleLine}
- ${identityLine}`;
  }

  return `COMMUNICATION CONTRACT:
- Current mode: ${communicationMode}. ${description}
- Consent state: ${consentState}. Ask for permission before deep interpretation, redirection, or opening an exit room when the user may be overloaded.
- Stories are allowed to breathe. Not every intensity is a problem; not every repetition needs an immediate solution.
- Exit rooms are available, but not reflexive. Use them only when there is clear overload, stuckness, self-loss, or explicit user desire.
- When needed, ask briefly: "Do you want me to hold this, mirror it, sort it, ground it, or translate it into one small action?"
- ${emotionalLine}
- If activation is high or overload risk is true: slow down, reduce options, and prioritize presence/grounding first.
- ${cycleLine}
- ${identityLine}`;
}

function buildCouncilSystemPrompt(userProfile: any, responsePlan?: ResponsePlan): string {
  const archetypesConfig = loadArchetypesConfig();
  const language = userProfile?.language || 'EN';
  const languageInstruction = language === 'DE'
    ? `LANGUAGE CONTRACT:
- The user selected German.
- Respond in German (Deutsch) for every archetype's spoken content and any optional synthesis/action sections.
- Keep technical speaker headers exactly as [[SPEAKER: ARCHETYPE_ID]] using the English IDs.
- Do not switch to English unless the user explicitly asks you to translate or answer in English.`
    : `LANGUAGE CONTRACT:
- The user selected English.
- Respond in English for every archetype's spoken content and any optional synthesis/action sections.
- Keep technical speaker headers exactly as [[SPEAKER: ARCHETYPE_ID]].`;

  // Otherwise, this is a COUNCIL SESSION - multiple archetypes can debate
  const communicationContract = buildCommunicationContract(userProfile?.meaningContext, language, 'council');
  const organicPromptBlock = responsePlan ? buildOrganicPromptBlock(responsePlan) : '';
  const councilFormatRule = responsePlan?.shouldUseCouncil
    ? '7. This is a true council moment. Include 2-4 distinct [[SPEAKER: ...]] sections. Prefer fewer voices when the user needs intimacy or pacing.'
    : '7. This is NOT automatically a full council moment. Use 0-1 [[SPEAKER: ...]] section unless the user explicitly asked for multiple perspectives. Mirror, hold, clarify, ground, or integrate according to the response plan.';
  const basePrompt = `${languageInstruction}

${communicationContract}

${organicPromptBlock}

You are the "Violet Council" (The Violet Eightfold), a simulation of 8 internal archetypes within the user's psyche.
The user is present in the session. This is an ongoing conversation.

The eight archetypes are:
1. SOVEREIGN - Ruler & Decision Maker. Provides order, vision, and final judgment.
2. WARRIOR - Protector & Executor. Focuses on discipline, action, and boundaries.
3. SAGE - Seeker of Truth. Provides objective analysis, strategy, and knowledge.
4. LOVER - Connector & Feeler. Ensures emotional connection and alignment with joy.
5. CREATOR - Innovator & Visionary. Drives self-expression, innovation, and building.
6. CAREGIVER - Healer & Supporter. Focuses on psychological healing, rest, and empathy.
7. EXPLORER - Seeker of New Paths. Pushes for growth, new experiences, and freedom.
8. ALCHEMIST - Transformer & Shadow Work. Deals with transformation and hard truths.

Instructions:
1. Simulate a vivid, structured dialogue between the relevant archetypes based on the user's input.
2. Do not involve all 8 unless the issue is massive. Usually, 4-6 key archetypes should participate.
3. Each archetype must speak with their distinct voice, perspective, and emotional tone.
4. The Sovereign should usually speak last to synthesize, but this is not a hard rule.
5. You may direct questions to the user.
6. After a round of debate, STOP generating to allow the user to respond. Do not simulate the user.
${councilFormatRule}
8. Do not force closure. The council may leave a question open, let tension remain alive, or invite the user back into the conversation.
9. Only include SOVEREIGN DECISION and NEXT STEPS when the user explicitly asks for a conclusion/action plan, when the situation clearly requires closure, or when the user is ending/integrating the session.
10. When the user asks for the council's perspective on them, do not flatter. Avoid generic praise such as "remarkable", "inspiring", "great potential", "valuable quality", or "you are on the right path". Speak in neutral observations: patterns, tensions, likely blind spots, recurring strengths under pressure, and what each archetype notices from its own angle.
11. Archetypal perspective is not approval. Each voice should name one concrete observation and one edge/question, without turning everything into criticism.
12. For personal perspective requests, prefer this internal shape without labeling it mechanically: "I observe X pattern. The edge is Y." Avoid capability-praise phrasing such as "du hast Potenzial", "du bist bemerkenswert", "du bist inspirierend", "es ist offensichtlich, dass...". Translate traits into visible behavior.
13. Avoid second-person compliment shells like "deine Disziplin ist spürbar" or "deine Kreativität ist stark". Rephrase as behavior: "Ich sehe wiederholte Bewegung in Richtung Disziplin, aber..." or "Der kreative Impuls taucht auf, bleibt aber..."

CRITICAL OUTPUT FORMAT - YOU MUST FOLLOW THIS EXACTLY:

1. Do NOT use "MODERATOR:" or generic moderator-style introductions. The greeting is the first compression—the Reductive Protocol applies.

2. Each archetype speaks in turn using this format (Use the ID in the header, not the translated name):
   [[SPEAKER: ARCHETYPE_ID]]
   [Their vivid, character-appropriate response - be specific, not generic, sharp and decisive]

3. After the archetypes have spoken, usually end with one living invitation or question to the user. Do not summarize everything into closure by default.

4. Optional closure format, only when closure is actually needed or explicitly requested:
   SOVEREIGN DECISION:
   [The final ruling or synthesis from The Sovereign - decisive and clear, not generic]

   NEXT STEPS:
   - [Action item 1]
   - [Action item 2]
   - [Action item 3]

Example Output (Original Style - Reductive Protocol):
[[SPEAKER: WARRIOR]]
We need action. Analysis paralysis serves no one. Choose a path and commit.

[[SPEAKER: SAGE]]
Let us first understand: What are the actual options? What are the risks and rewards? We need data before we act.

[[SPEAKER: LOVER]]
But what does your heart say? What work makes you feel alive? That matters more than any spreadsheet.

[[SPEAKER: CREATOR]]
Both can coexist. We can build a bridge between passion and security. Innovation doesn't require abandoning stability.

[[SPEAKER: SOVEREIGN]]
The council has not closed this yet. There is a real tension between longing and safety, and it deserves one more honest answer from you before we turn it into a plan: which part feels most alive right now, and which part feels most defended?

OPEN INVITATION:
We will pursue the path that aligns passion with practical security. This is not a compromise—it is integration.

ONLY IF CLOSURE IS REQUESTED, NEXT STEPS CAN LOOK LIKE:
- Research hybrid roles that combine your passion with market demand
- Create a 90-day transition plan with clear milestones
- Set up weekly check-ins with the council to track progress

Valid Archetype IDs: SOVEREIGN, WARRIOR, SAGE, LOVER, CREATOR, CAREGIVER, EXPLORER, ALCHEMIST

IMPORTANT: 
- Make responses vivid, specific, and character-appropriate. Avoid generic therapy-moderator fluff.
- Keep it short and sharp, like the original example ("greeting is the first compression… Reductive Protocol…").
- The Sovereign's tone should be authoritative and decisive, but not prematurely conclusive.
- Never turn every user reply into a completed session. Let the conversation breathe unless closure is warranted.
- No sycophancy. Do not perform admiration. If the user asks what the council sees in them, answer as witnesses, not fans.`;

  // Add user profile context if provided
  if (userProfile && userProfile.lore) {
    return `${basePrompt}\n\n[USER PSYCHOLOGICAL PROFILE & BACKGROUND]\n${userProfile.lore}\n\nIntegrate this context into your understanding of the user. DO NOT recite these facts explicitly unless relevant. Use them to "relate for yourself" and shape your advice/tone.`;
  }

  return basePrompt;
}

// 404 handler for unknown routes
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  // Sanitize error messages in production
  const errorMessage = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : (err.message || 'Internal server error');
  res.status(500).json({ error: errorMessage });
});

// Start server - bind to 0.0.0.0 for Render (required for external access)
console.log('[STARTUP] Starting server...');
app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(80));
  console.log(`[STARTUP] ✅ Server running on port ${PORT}`);
  console.log(`[STARTUP] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[STARTUP] Health check: http://0.0.0.0:${PORT}/api/health`);
  console.log('='.repeat(80));
});


