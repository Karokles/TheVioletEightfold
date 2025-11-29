import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createHash, randomBytes } from 'node:crypto';
import OpenAI from 'openai';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// CORS configuration - allow all origins for testing, with proper headers
app.use(cors({
  origin: true, // Allow all origins for testing flexibility
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
    username: 'friend2',
    secretHash: createHash('sha256').update('friend2-test-secret').digest('hex'),
  },
  {
    id: 'friend3',
    username: 'friend3',
    secretHash: createHash('sha256').update('friend3-test-secret').digest('hex'),
  },
  {
    id: 'friend4',
    username: 'friend4',
    secretHash: createHash('sha256').update('friend4-test-secret').digest('hex'),
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
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.substring(7);
  const user = users.find(u => u.token === token);

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  req.user = user;
  next();
};

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ ok: true });
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
    const { userId, messages, userProfile } = (req.body as { userId?: string; messages?: any[]; userProfile?: any }) || {};

    if (!userId || !messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'userId and messages array are required' });
    }

    // Load archetypes and build system prompt
    // For now, we'll use a simplified version. In production, load from config files
    const systemPrompt = buildCouncilSystemPrompt(userProfile);

    // Build conversation history
    const conversationHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = messages.map((msg: any) => ({
      role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: String(msg.content),
    }));

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
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Helper function to build council system prompt
function buildCouncilSystemPrompt(userProfile: any): string {
  // This will be replaced with actual config loading later
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
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

