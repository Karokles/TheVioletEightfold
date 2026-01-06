import express, { Request, Response } from 'express';
type NextFunction = (err?: any) => void;
import cors from 'cors';
import dotenv from 'dotenv';
import { createHash, randomBytes } from 'node:crypto';
import OpenAI from 'openai';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// CORS configuration - restrict to allowed origins in production
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000']; // Default to localhost for development

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.) in development
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    // Allow if origin is in allowed list or if no origin check needed
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
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
];

// Authentication middleware
interface AuthenticatedRequest extends Request {
  user?: User;
  headers: Request['headers'];
  body: Request['body'];
}

const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void | Response => {
  const authHeader = req.headers?.authorization;
  
  // Check if authorization header exists
  if (!authHeader) {
    return res.status(401).json({ 
      error: 'unauthorized',
      reason: 'missing_token', // Machine-readable reason
      message: 'Missing or invalid token'
    });
  }
  
  // Normalize header: handle "Bearer Bearer <token>" edge case
  let normalizedHeader = authHeader.trim();
  while (normalizedHeader.startsWith('Bearer ')) {
    normalizedHeader = normalizedHeader.substring(7).trim();
  }
  
  // Check format: must start with "Bearer " after normalization
  if (!authHeader.startsWith('Bearer ')) {
    // Try legacy format: just the token without "Bearer "
    const token = normalizedHeader;
    if (token.length === 0) {
      return res.status(401).json({ 
        error: 'unauthorized',
        reason: 'malformed_token', // Machine-readable reason
        message: 'Missing or invalid token'
      });
    }
    
    // Try lookup without Bearer prefix (legacy support)
    const user = users.find(u => u.token === token);
    if (user) {
      req.user = user;
      return next();
    }
    
    return res.status(401).json({ 
      error: 'unauthorized',
      reason: 'malformed_token', // Machine-readable reason
      message: 'Invalid token format'
    });
  }

  // Extract token (remove "Bearer " prefix)
  const token = authHeader.substring(7).trim();
  
  // Validate token format (should be hex string, 64 chars for 32 bytes)
  if (token.length === 0) {
    return res.status(401).json({ 
      error: 'unauthorized',
      reason: 'empty_token', // Machine-readable reason
      message: 'Token is empty'
    });
  }
  
  // Lookup user by token
  const user = users.find(u => u.token === token);

  if (!user) {
    // Log for debugging (without exposing token)
    console.log(`[AUTH] Token validation failed: token length=${token.length}, users with tokens=${users.filter(u => u.token).length}`);
    return res.status(401).json({ 
      error: 'unauthorized',
      reason: 'invalid_signature', // Machine-readable reason
      message: 'Invalid token',
      hint: 'Token may have expired due to server restart. Please log in again.'
    });
  }

  req.user = user;
  next();
};

// Health check endpoint (public)
app.get('/api/health', (req: Request, res: Response) => {
  const uptime = process.uptime();
  // Try to get git commit hash if available (non-blocking)
  let commitHash = 'unknown';
  try {
    const { execSync } = require('node:child_process');
    commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8', stdio: 'pipe' }).toString().trim();
  } catch {
    // Git not available or not a git repo - use fallback
  }
  
  res.json({ 
    status: 'ok',
    uptime: Math.floor(uptime),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    commitHash: commitHash
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
    
    // Verify token (simulate what authenticate middleware does)
    let verifyResult: 'ok' | 'expired' | 'invalid_signature' | 'invalid_claims' | 'unknown' = 'unknown';
    if (tokenParse === 'ok') {
      let token = '';
      if (authHeaderFormat === 'bearer') {
        token = authHeader.substring(7).trim();
      } else {
        token = authHeader.trim();
      }
      
      // Lookup in-memory (same as authenticate middleware)
      const user = users.find(u => u.token === token);
      if (user) {
        verifyResult = 'ok';
      } else {
        // Token not found - could be expired (server restart) or invalid
        // Since we don't have exp claims, we can't distinguish
        // But if token format is valid, it's likely "expired" (server restart)
        verifyResult = 'expired';
      }
    } else if (tokenParse === 'malformed') {
      verifyResult = 'invalid_signature';
    } else {
      verifyResult = 'unknown';
    }
    
    res.json({
      hasAuthHeader: !!authHeader,
      authHeaderFormat: authHeaderFormat,
      tokenParse: tokenParse,
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
      hasToken: !!req.user.token
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
app.post('/api/login', (req: Request, res: Response) => {
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

    // Generate token
    const token = randomBytes(32).toString('hex');
    user.token = token;

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

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    // Load archetypes and build system prompt
    // For now, we'll use a simplified version. In production, load from config files
    const systemPrompt = buildCouncilSystemPrompt(userProfile);

    // Build conversation history
    const conversationHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = messages.map((msg: any) => ({
      role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: String(msg.content),
    }));

    // Validate OpenAI API key before making request
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using gpt-4o-mini as specified
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
      ] as Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
      temperature: 0.7,
      stream: false,
    });

    let reply = completion.choices[0]?.message?.content || '';

    // Removed automatic [LORE UPDATE] - let the AI decide if it wants to mention breakthroughs naturally

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
function buildCouncilSystemPrompt(userProfile: any): string {
  const archetypesConfig = loadArchetypesConfig();
  const language = userProfile?.language || 'EN';
  const activeArchetype = userProfile?.activeArchetype;

  // If activeArchetype is set, this is a DIRECT CHAT - only that archetype should respond
  if (activeArchetype && archetypesConfig[activeArchetype]) {
    const archetypeConfig = archetypesConfig[activeArchetype];
    const archetypeName = archetypeConfig.name?.[language] || archetypeConfig.name?.EN || activeArchetype;
    const systemPrompt = archetypeConfig.systemPrompt?.[language] || archetypeConfig.systemPrompt?.EN || '';
    
    let directChatPrompt = `${systemPrompt}\n\nCRITICAL INSTRUCTIONS:
- You are speaking DIRECTLY to the user in a one-on-one conversation.
- Respond ONLY as ${archetypeName}. 
- Do NOT simulate other archetypes or create a council dialogue.
- Do NOT use the [[SPEAKER:]] format - just respond naturally as ${archetypeName}.
- This is a direct conversation, not a council session.
- Be authentic to your archetype's voice and perspective.
- Do not mention other archetypes unless the user asks about them.`;

    // Add user profile context if provided
    if (userProfile && userProfile.lore) {
      return `${directChatPrompt}\n\n[USER PSYCHOLOGICAL PROFILE & BACKGROUND]\n${userProfile.lore}\n\nIntegrate this context into your understanding of the user. DO NOT recite these facts explicitly unless relevant. Use them to "relate for yourself" and shape your advice/tone.`;
    }

    return directChatPrompt;
  }

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
1. Simulate a dialogue between the relevant archetypes based on the user's input.
2. Do not involve all 8 unless the issue is massive. Usually, 2-4 key archetypes debate.
3. The Sovereign should usually speak last to synthesize, but this is not a hard rule.
4. You may direct questions to the user.
5. After a round of debate, STOP generating to allow the user to respond. Do not simulate the user.

Output Format:
You must output the dialogue in a structured way that I can parse.
Use this format exactly for each archetype's turn (Use the ID in the header, not the translated name):

[[SPEAKER: ARCHETYPE_ID]]
The content of what they say.

Example:
[[SPEAKER: WARRIOR]]
We need to act.
[[SPEAKER: SOVEREIGN]]
Agreed.

Valid Archetype IDs: SOVEREIGN, WARRIOR, SAGE, LOVER, CREATOR, CAREGIVER, EXPLORER, ALCHEMIST`;

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

