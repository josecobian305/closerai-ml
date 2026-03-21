import { Router, Request, Response } from 'express';
import path from "path";
import fs from "fs";
import crypto from 'crypto';
import { getDb } from '../db';
import { logger } from '../logger';

export const registerRouter = Router();

// Simple JWT-like token (in production, use proper JWT library)
function generateToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString('base64url');
  const sig = crypto.createHash('sha256').update(payload + process.env.JWT_SECRET || 'closerai-secret').digest('base64url');
  return `${payload}.${sig}`;
}

/** Ensure SQLite users table exists */
function ensureUsersTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id           TEXT PRIMARY KEY,
      email        TEXT UNIQUE NOT NULL,
      name         TEXT NOT NULL DEFAULT '',
      phone        TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL DEFAULT '',
      business_name TEXT NOT NULL DEFAULT '',
      industry     TEXT NOT NULL DEFAULT '',
      agent_name   TEXT NOT NULL DEFAULT '',
      created_at   TEXT NOT NULL
    );
  `);
}

/** POST /api/v1/register */
registerRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    ensureUsersTable();
    const db = getDb();

    const {
      businessName, industry, pitch,
      yourName, email, phone, password,
      agentName, agentTitle, agentEmail,
      tone, leadSources, leadAge, documents,
      areaCode, portExisting, existingNumber,
      layout, capabilities,
    } = req.body;

    // Validate required fields
    if (!email || !yourName || !businessName) {
      res.status(400).json({ error: 'Missing required fields: email, yourName, businessName' });
      return;
    }

    const userId = crypto.randomUUID();
    const passwordHash = crypto.createHash('sha256').update(password || '').digest('hex');
    const now = new Date().toISOString();

    // Check if email already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    // Insert user
    db.prepare(`
      INSERT INTO users (id, email, name, phone, password_hash, business_name, industry, agent_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, email, yourName, phone || '', passwordHash, businessName, industry || '', agentName || '', now);

    // Create workspace directory
    const workspaceBase = process.env.WORKSPACES_DIR || path.join(process.cwd(), 'workspaces');
    const userWorkspace = path.join(workspaceBase, userId);
    fs.mkdirSync(userWorkspace, { recursive: true });
    fs.mkdirSync(path.join(userWorkspace, 'agents'), { recursive: true });
    fs.mkdirSync(path.join(userWorkspace, 'docs'), { recursive: true });

    // Write config.json
    const config = {
      userId,
      businessName,
      industry,
      pitch,
      owner: { name: yourName, email, phone },
      agent: { name: agentName, title: agentTitle, email: agentEmail },
      tone: tone || 'professional',
      leadSources: leadSources || [],
      leadAge: leadAge || '0-48h',
      documents: documents || [],
      phone: { areaCode, portExisting, existingNumber },
      layout: layout || 'overview_first',
      capabilities: capabilities || {
        sms: true, email: true, voiceNotes: false,
        callBridge: false, autoReply: true, docCollection: true,
        courtSearch: true, notifications: true,
      },
      createdAt: now,
    };
    fs.writeFileSync(
      path.join(userWorkspace, 'config.json'),
      JSON.stringify(config, null, 2)
    );

    // Write SOUL.md
    const soul = `# SOUL.md — ${agentName || 'Agent'} for ${businessName}

## Identity
- Name: ${agentName || 'Agent'}
- Title: ${agentTitle || 'Sales Agent'}
- Business: ${businessName}
- Industry: ${industry}

## Pitch
${pitch || 'Business funding solutions tailored to your needs.'}

## Personality
Tone: ${tone || 'professional'}

## Owner
- ${yourName} (${email})
`;
    fs.writeFileSync(path.join(userWorkspace, 'agents', 'SOUL.md'), soul);

    // Write OUTREACH-RULES.md
    const outreachRules = `# OUTREACH-RULES.md

## Lead Sources
${(leadSources || []).join(', ') || 'General'}

## Lead Age Strategy
${leadAge || '0-48h'} leads — adjust urgency accordingly.

## Tone
${tone || 'professional'}
`;
    fs.writeFileSync(path.join(userWorkspace, 'agents', 'OUTREACH-RULES.md'), outreachRules);

    // Generate token
    const token = generateToken(userId);

    logger.info('New user registered', { userId, email, businessName });

    res.status(201).json({
      success: true,
      userId,
      token,
      redirectUrl: '/app/',
      message: `Welcome, ${yourName}! ${agentName || 'Your agent'} is ready.`,
    });
  } catch (err: unknown) {
    logger.error('Registration error', { err });
    res.status(500).json({ error: 'Registration failed', detail: String(err) });
  }
});

/**
 * POST /api/v1/register/login — Authenticate with email + password
 */
registerRouter.post('/login', (req: Request, res: Response) => {
  try {
    ensureUsersTable();
    const db = getDb();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

    const user = db.prepare(
      'SELECT id, email, name, business_name FROM users WHERE email = ? AND password_hash = ?'
    ).get(email, passwordHash) as { id: string; email: string; name: string; business_name: string } | undefined;

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id);
    logger.info('User logged in', { userId: user.id, email });

    return res.json({
      success: true,
      userId: user.id,
      token,
      message: `Welcome back, ${user.name}!`,
    });
  } catch (err: unknown) {
    logger.error('Login error', { err });
    return res.status(500).json({ error: 'Login failed', detail: String(err) });
  }
});

/**
 * GET /api/v1/register/me — Returns current user's profile + config
 * Requires Authorization: Bearer <token> header
 */
registerRouter.get('/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const token = authHeader.split(' ')[1];
  
  // Decode token (simple base64 JWT — not production secure, but functional)
  try {
    const [payloadB64] = token.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
    const userId = payload.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Load user's config
    const workspaceBase = process.env.WORKSPACES_DIR || path.join(process.cwd(), 'workspaces');
    const configPath = path.join(workspaceBase, userId, 'config.json');
    if (!fs.existsSync(configPath)) {
      return res.status(404).json({ error: 'User workspace not found' });
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    
    // Load SOUL.md
    const soulPath = path.join(workspaceBase, userId, 'agents', 'SOUL.md');
    const soul = fs.existsSync(soulPath) ? fs.readFileSync(soulPath, 'utf-8') : '';

    res.json({
      userId,
      config,
      soul,
      workspace: path.join(workspaceBase, userId),
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

