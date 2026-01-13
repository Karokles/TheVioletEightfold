import express, { Request, Response } from 'express';
type NextFunction = (err?: any) => void;
import cors, { CorsOptions } from 'cors';
import dotenv from 'dotenv';
import { createHash, randomBytes } from 'node:crypto';
import OpenAI from 'openai';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import jwt from 'jsonwebtoken';
import { 
  ensureUserExists, 
  createCouncilSession, 
  createLoreEntry, 
  isSupabaseConfigured,
  createQuestLogEntry,
  getQuestLogEntries,
  createSoulTimelineEvent,
  getSoulTimelineEvents,
  createBreakthrough,
  getBreakthroughs
} from './supabase.js';

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Startup log
console.log('[STARTUP] Initializing server...');
console.log('[STARTUP] Node version:', process.version);
console.log('[STARTUP] Environment:', process.env.NODE_ENV || 'development');

dotenv.config();
console.log('[STARTUP] Environment variables loaded');

// JWT Configuration - fail fast if secret missing in production
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
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
  process.exit(1);
}
if (!JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET not set. Using default for development only.');
  console.warn('Set JWT_SECRET in production to ensure secure token signing.');
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
  const defaultOrigins = ['http://localhost:3000', 'http://localhost:5173'];
  
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
    // Allow requests with no origin (mobile apps, Postman, etc.) in development only
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // In production, require origin
    if (!origin) {
      return callback(new Error('CORS: Origin header is required in production'));
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

// Initialize OpenAI
if (!process.env.OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY environment variable is not set');
  console.error('The server will start but API calls will fail.');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '', // Will fail gracefully if not set
});

// Simple in-memory user store (for MVP - replace with database later)
interface User {
  id: string;
  username: string;
  secretHash: string;
  token?: string;
}

const users: User[] = [
  // Pre-populated test users (lion + 5 friends)
  // In production, these should be in a database
  {
    id: 'lion',
    username: 'lion',
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
    id: 'galja',
    username: 'galja',
    secretHash: createHash('sha256').update('kalmykia').digest('hex'),
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
    id: 'tuana',
    username: 'tuana',
    secretHash: createHash('sha256').update('bosphorus').digest('hex'),
  },
];

// Authentication middleware
interface AuthenticatedRequest extends Request {
  user?: User;
  headers: Request['headers'];
  body: Request['body'];
}

const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void | Response => {
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
      if (!JWT_SECRET) {
        console.error('[AUTH] JWT_SECRET not configured');
        return res.status(500).json({ 
          error: 'unauthorized',
          reason: 'missing_secret',
          message: 'Server configuration error'
        });
      }
      
      // Explicitly set algorithm to HS256 for consistency
      const decoded = jwt.verify(token, JWT_SECRET_FINAL, { algorithms: ['HS256'] }) as { sub: string; username: string; iat: number; exp: number };
      
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
      return next();
    } catch (error: any) {
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

// Fast health check endpoint (public) - must respond quickly for Render
app.get('/api/health', (req: Request, res: Response) => {
  // Return immediately - no blocking operations
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Detailed health check endpoint (public) - for diagnostics
app.get('/api/health/detailed', (req: Request, res: Response) => {
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
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseStatus = 'configured';
  }
  
  res.json({ 
    status: 'ok',
    uptime: Math.floor(uptime),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    commitHash: commitHash,
    jwtSecretSet: !!process.env.JWT_SECRET,
    supabaseStatus: supabaseStatus
  });
});

// Auth health endpoint (for auth-specific diagnostics)
app.get('/api/auth/health', (req: Request, res: Response) => {
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
app.get('/auth/diagnose', (req: Request, res: Response) => {
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
          if (!JWT_SECRET) {
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

// Auth debug endpoint (protected, for detailed diagnostics)
app.get('/api/auth/debug', authenticate, (req: AuthenticatedRequest, res: Response) => {
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
    if (isSupabaseConfigured()) {
      await ensureUserExists(user.id, user.username, user.secretHash);
    }

    // Generate JWT token (stateless, restart-proof)
    if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
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
    
    // Log request (no secrets) - CRITICAL for debugging mode detection
    console.log(`[API] Request - userId: ${userId}, mode: ${mode.toUpperCase()}, activeArchetype: ${userProfile?.activeArchetype || 'none'}`);

    // Build system prompt - COMPLETELY SEPARATE for direct vs council
    const systemPrompt = mode === 'direct' 
      ? buildDirectChatPrompt(userProfile)
      : buildCouncilSystemPrompt(userProfile);

    // Build conversation history
    const conversationHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = messages.map((msg: any) => ({
      role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: String(msg.content),
    }));

    // Validate OpenAI API key before making request
    if (!process.env.OPENAI_API_KEY) {
      console.error('[COUNCIL] OpenAI API key not configured');
      return res.status(500).json({ 
        error: 'OpenAI API key not configured',
        message: 'The server is missing the OpenAI API key. Please contact the administrator.'
      });
    }

    // Call OpenAI with robust error handling
    // Use lower temperature for direct mode to enforce single voice
    const temperature = mode === 'direct' ? 0.5 : 0.7;
    
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Using gpt-4o-mini as specified
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
        ] as Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
        temperature: temperature,
        stream: false,
      });
      
      // Log mode and temperature for debugging
      console.log(`[API] OpenAI call - mode: ${mode.toUpperCase()}, temperature: ${temperature}, promptLength: ${systemPrompt.length}`);
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

    // Persist to Supabase (if configured) - best-effort, don't break response
    if (isSupabaseConfigured()) {
      try {
        // Create council session record
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
        
        // Create lore entry
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
          console.log(`[SUPABASE] Created session ${sessionId} for user ${userId}`);
        }
      } catch (error: any) {
        // Log DB write failure as warning (no secrets)
        console.warn(`[SUPABASE] DB write failed for user ${userId}, mode ${mode}: ${error.message}`);
        // Don't throw - continue with response
      }
    }

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
    if (isSupabaseConfigured()) {
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
      messages, 
      userLore, 
      currentQuestState 
    } = req.body as { 
      sessionId?: string;
      mode?: 'single' | 'council';
      activeArchetype?: string;
      messages?: Array<{ role: string; content: string; meta?: any }>;
      userLore?: string;
      currentQuestState?: { title?: string; state?: string; objective?: string };
    };
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required and cannot be empty' });
    }
    
    // Validate OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('[MEANING] OpenAI API key not configured');
      return res.status(500).json({ 
        error: 'OpenAI API key not configured',
        message: 'The server is missing the OpenAI API key.'
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
    
    // Build analysis prompt
    const analysisPrompt = `You are the Meaning Agent. Analyze this conversation transcript and extract meaningful insights.

TRANSCRIPT:
${transcript}

${userLore ? `USER CONTEXT:\n${userLore}\n` : ''}
${currentQuestState ? `CURRENT QUEST: ${currentQuestState.title || 'None'}\nCURRENT STATE: ${currentQuestState.state || 'None'}\n` : ''}

Analyze this conversation and return JSON ONLY (no prose, no explanations). Extract:

1. **Questlog Entry**: One meaningful questlog entry summarizing the session's main topic/objective
2. **Soul Timeline Event**: One significant event or moment from the conversation
3. **Breakthrough**: One breakthrough or realization (if any occurred, otherwise empty array)

Rules:
- Return STRICT JSON only (no markdown, no code blocks, no explanations)
- Never include MODERATOR text or speaker tags
- Produce minimal but meaningful records: typically 1 quest entry + 1 timeline event + 1 breakthrough per session
- If session is empty or trivial, return empty arrays
- Use ISO date strings for createdAt fields
- Generate unique IDs (use short UUIDs or timestamps)

Return this exact JSON structure:
{
  "questLogEntries": [{"id": "...", "createdAt": "...", "title": "...", "content": "...", "tags": [], "relatedArchetypes": [], "sourceSessionId": "..."}],
  "soulTimelineEvents": [{"id": "...", "createdAt": "...", "label": "...", "summary": "...", "intensity": 5, "type": "EVENT", "tags": [], "sourceSessionId": "..."}],
  "breakthroughs": [{"id": "...", "createdAt": "...", "title": "...", "insight": "...", "trigger": "...", "action": "...", "tags": [], "sourceSessionId": "..."}],
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
        model: 'gpt-4o-mini',
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
    
    // Persist to Supabase (if configured) - best-effort, don't break response
    if (isSupabaseConfigured()) {
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
    
    console.log(`[MEANING] Analysis complete for user ${userId}`, {
      questLogEntries: analysisResult.questLogEntries.length,
      timelineEvents: analysisResult.soulTimelineEvents.length,
      breakthroughs: analysisResult.breakthroughs.length
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
    
    // Load from Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const [questLogEntries, timelineEvents, breakthroughs] = await Promise.all([
          getQuestLogEntries(userId),
          getSoulTimelineEvents(userId),
          getBreakthroughs(userId)
        ]);
        
        // Transform to frontend format
        const result = {
          questLogEntries: questLogEntries.map(entry => ({
            id: entry.id!,
            createdAt: entry.created_at || new Date().toISOString(),
            title: entry.title,
            content: entry.content,
            tags: entry.tags || [],
            relatedArchetypes: entry.related_archetypes || [],
            sourceSessionId: entry.source_session_id
          })),
          soulTimelineEvents: timelineEvents.map(event => ({
            id: event.id!,
            createdAt: event.created_at || new Date().toISOString(),
            label: event.label,
            summary: event.summary,
            intensity: event.intensity,
            type: event.type || 'EVENT',
            tags: event.tags || [],
            sourceSessionId: event.source_session_id
          })),
          breakthroughs: breakthroughs.map(bt => ({
            id: bt.id!,
            createdAt: bt.created_at || new Date().toISOString(),
            title: bt.title,
            insight: bt.insight,
            trigger: bt.trigger,
            action: bt.action,
            tags: bt.tags || [],
            sourceSessionId: bt.source_session_id
          }))
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
    
    // Return empty state if Supabase not configured or error
    res.json({
      questLogEntries: [],
      soulTimelineEvents: [],
      breakthroughs: []
    });
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
function buildDirectChatPrompt(userProfile: any): string {
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
  
  // Clean the base prompt - remove any council references
  const cleanedPrompt = baseSystemPrompt
    .replace(/council/gi, 'internal guidance')
    .replace(/other archetypes/gi, 'other perspectives')
    .replace(/weigh the inputs from other/gi, 'consider different perspectives');
  
  // STRICT DIRECT MODE PROMPT - NO COUNCIL STRUCTURE ALLOWED
  const directChatPrompt = `${cleanedPrompt}

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
   ✅ "The shadow work requires deep honesty. I see patterns that need transformation. Here's what I suggest: [your direct advice]"
   ✅ "As ${archetypeName}, I believe [your perspective]. The path forward is [your conclusion]."

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

function buildCouncilSystemPrompt(userProfile: any): string {
  const archetypesConfig = loadArchetypesConfig();
  const language = userProfile?.language || 'EN';

  // Otherwise, this is a COUNCIL SESSION - multiple archetypes can debate
  const basePrompt = `You are the "Violet Council" (The Violet Eightfold), a simulation of 8 internal archetypes within the user's psyche.
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

CRITICAL OUTPUT FORMAT - YOU MUST FOLLOW THIS EXACTLY:

1. Do NOT use "MODERATOR:" or generic moderator-style introductions. The greeting is the first compression—the Reductive Protocol applies.

2. Each archetype speaks in turn using this format (Use the ID in the header, not the translated name):
   [[SPEAKER: ARCHETYPE_ID]]
   [Their vivid, character-appropriate response - be specific, not generic, sharp and decisive]

3. After all archetypes have spoken, end with:
   SOVEREIGN DECISION:
   [The final ruling or synthesis from The Sovereign - be decisive and clear, in the Sovereign's authoritative tone]

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
The council has spoken. We see a path forward.

SOVEREIGN DECISION:
We will pursue the path that aligns passion with practical security. This is not a compromise—it is integration.

NEXT STEPS:
- Research hybrid roles that combine your passion with market demand
- Create a 90-day transition plan with clear milestones
- Set up weekly check-ins with the council to track progress

Valid Archetype IDs: SOVEREIGN, WARRIOR, SAGE, LOVER, CREATOR, CAREGIVER, EXPLORER, ALCHEMIST

IMPORTANT: 
- Make responses vivid, specific, and character-appropriate. Avoid generic therapy-moderator fluff.
- Keep it short and sharp, like the original example ("greeting is the first compression… Reductive Protocol…").
- The Sovereign's tone should be authoritative and decisive, not generic.`;

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

