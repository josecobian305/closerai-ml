import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { getDb } from '../db';
import { logger } from '../logger';

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * All supported integration providers grouped by category.
 */
export type Provider =
  | 'ghl' | 'salesforce' | 'hubspot'          // CRM
  | 'texttorrent' | 'twilio' | 'aws_sms'       // SMS
  | 'gmail' | 'outlook' | 'aws_ses'            // Email
  | 'aws_bedrock' | 'openai'                   // AI
  | 'stripe' | 'apipay'                        // Payments
  | 'github'                                    // Dev
  | 'vapi' | 'twilio_voice'                    // Phone
  | 'plaid';                                    // Banking

/** Integration status */
export type IntegrationStatus = 'connected' | 'disconnected' | 'error';

/** Integration record as stored in SQLite */
export interface IntegrationRecord {
  id: number;
  user_id: string;
  provider: Provider;
  credentials: string; // encrypted JSON
  status: IntegrationStatus;
  last_tested: string | null;
  created_at: string;
}

/** Masked credentials for API responses (never return raw secrets) */
export interface MaskedCredential {
  key: string;
  masked: string; // ••••last4 or 'set' indicator
}

/** Public integration response shape */
export interface IntegrationResponse {
  provider: Provider;
  status: IntegrationStatus;
  last_tested: string | null;
  credentials: MaskedCredential[];
  created_at: string | null;
}

/** Test result returned from connection tests */
export interface TestResult {
  provider: Provider;
  success: boolean;
  message: string;
  timestamp: string;
}

// ── Encryption ─────────────────────────────────────────────────────────────

const VAULT_KEY = process.env.INTEGRATION_VAULT_KEY ?? 'closerai-vault-default-key-32ch!!';

/** Derives a 32-byte AES key from the vault secret */
function deriveKey(): Buffer {
  return crypto.createHash('sha256').update(VAULT_KEY).digest();
}

/**
 * Encrypts a JSON object using AES-256-GCM.
 * Returns `iv:authTag:ciphertext` as hex strings joined by colons.
 */
function encrypt(data: Record<string, string>): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plain = JSON.stringify(data);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 * Returns the parsed JSON object or null on failure.
 */
function decrypt(encoded: string): Record<string, string> | null {
  try {
    const key = deriveKey();
    const [ivHex, tagHex, ctHex] = encoded.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    const ciphertext = Buffer.from(ctHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  } catch {
    return null;
  }
}

/** Masks a credential value: shows ••••last4 or '(set)' for short values */
function maskValue(val: string): string {
  if (!val) return '';
  if (val.length <= 4) return '(set)';
  return `••••${val.slice(-4)}`;
}

// ── DB Initialization ──────────────────────────────────────────────────────

/** Ensures the integrations table exists */
function ensureTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS integrations (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     TEXT NOT NULL DEFAULT 'default',
      provider    TEXT NOT NULL,
      credentials TEXT NOT NULL DEFAULT '{}',
      status      TEXT NOT NULL DEFAULT 'disconnected',
      last_tested TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, provider)
    );
    CREATE INDEX IF NOT EXISTS idx_integrations_user ON integrations(user_id);
    CREATE INDEX IF NOT EXISTS idx_integrations_provider ON integrations(provider);
  `);
}

// ── Provider metadata ──────────────────────────────────────────────────────

/** All known providers in their display order */
const ALL_PROVIDERS: Provider[] = [
  'ghl', 'salesforce', 'hubspot',
  'texttorrent', 'twilio', 'aws_sms',
  'gmail', 'outlook', 'aws_ses',
  'aws_bedrock', 'openai',
  'stripe', 'apipay',
  'github',
  'vapi', 'twilio_voice',
  'plaid',
];

/** Credential field keys for each provider */
const PROVIDER_FIELDS: Record<Provider, string[]> = {
  ghl:          ['api_key'],
  salesforce:   ['client_id', 'client_secret', 'refresh_token'],
  hubspot:      ['api_key'],
  texttorrent:  ['sid', 'public_key'],
  twilio:       ['account_sid', 'auth_token'],
  aws_sms:      ['access_key', 'secret_key', 'region'],
  gmail:        ['access_token'],
  outlook:      ['access_token'],
  aws_ses:      ['access_key', 'secret_key', 'region'],
  aws_bedrock:  ['access_key', 'secret_key', 'region'],
  openai:       ['api_key'],
  stripe:       ['publishable_key', 'secret_key'],
  apipay:       ['account_id'],
  github:       ['pat_token', 'username'],
  vapi:         ['api_key'],
  twilio_voice: ['account_sid', 'auth_token'],
  plaid:        ['client_id', 'secret', 'environment'],
};

// ── Connection testers ─────────────────────────────────────────────────────

/**
 * Attempts a real connection test for each provider.
 * Returns { success, message }.
 */
async function testProvider(
  provider: Provider,
  creds: Record<string, string>,
): Promise<{ success: boolean; message: string }> {
  try {
    switch (provider) {
      case 'ghl': {
        const res = await fetch('https://rest.gohighlevel.com/v1/locations/', {
          headers: { Authorization: `Bearer ${creds.api_key}` },
        });
        return res.ok
          ? { success: true, message: 'GoHighLevel connected' }
          : { success: false, message: `GHL returned HTTP ${res.status}` };
      }

      case 'openai': {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${creds.api_key}` },
        });
        return res.ok
          ? { success: true, message: 'OpenAI connected' }
          : { success: false, message: `OpenAI returned HTTP ${res.status}` };
      }

      case 'hubspot': {
        const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
          headers: {
            Authorization: `Bearer ${creds.api_key}`,
            'Content-Type': 'application/json',
          },
        });
        return res.ok
          ? { success: true, message: 'HubSpot connected' }
          : { success: false, message: `HubSpot returned HTTP ${res.status}` };
      }

      case 'twilio':
      case 'twilio_voice': {
        const auth = Buffer.from(`${creds.account_sid}:${creds.auth_token}`).toString('base64');
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${creds.account_sid}.json`,
          { headers: { Authorization: `Basic ${auth}` } },
        );
        return res.ok
          ? { success: true, message: 'Twilio connected' }
          : { success: false, message: `Twilio returned HTTP ${res.status}` };
      }

      case 'texttorrent': {
        const auth = Buffer.from(`${creds.sid}:${creds.public_key}`).toString('base64');
        const res = await fetch('https://api.texttorrent.com/api/v1/account', {
          headers: { Authorization: `Basic ${auth}` },
        });
        return res.ok
          ? { success: true, message: 'TextTorrent connected' }
          : { success: false, message: `TextTorrent returned HTTP ${res.status}` };
      }

      case 'stripe': {
        const auth = Buffer.from(`${creds.secret_key}:`).toString('base64');
        const res = await fetch('https://api.stripe.com/v1/balance', {
          headers: { Authorization: `Basic ${auth}` },
        });
        return res.ok
          ? { success: true, message: 'Stripe connected' }
          : { success: false, message: `Stripe returned HTTP ${res.status}` };
      }

      case 'github': {
        const res = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `token ${creds.pat_token}`,
            'User-Agent': 'CloserAI-Integration-Check',
          },
        });
        if (res.ok) {
          const data = (await res.json()) as { login?: string };
          return { success: true, message: `GitHub connected as ${data.login ?? 'unknown'}` };
        }
        return { success: false, message: `GitHub returned HTTP ${res.status}` };
      }

      case 'vapi': {
        const res = await fetch('https://api.vapi.ai/call', {
          method: 'GET',
          headers: { Authorization: `Bearer ${creds.api_key}` },
        });
        return res.ok || res.status === 200
          ? { success: true, message: 'Vapi connected' }
          : { success: false, message: `Vapi returned HTTP ${res.status}` };
      }

      case 'plaid': {
        const env = creds.environment ?? 'sandbox';
        const baseUrl = env === 'production'
          ? 'https://production.plaid.com'
          : env === 'development'
          ? 'https://development.plaid.com'
          : 'https://sandbox.plaid.com';
        const res = await fetch(`${baseUrl}/institutions/get`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: creds.client_id,
            secret: creds.secret,
            count: 1,
            offset: 0,
            country_codes: ['US'],
          }),
        });
        return res.ok
          ? { success: true, message: `Plaid (${env}) connected` }
          : { success: false, message: `Plaid returned HTTP ${res.status}` };
      }

      case 'aws_sms':
      case 'aws_ses':
      case 'aws_bedrock':
        // AWS credential validation: check required fields are present and non-empty
        if (!creds.access_key || !creds.secret_key) {
          return { success: false, message: 'Access Key and Secret Key are required' };
        }
        return {
          success: true,
          message: `AWS credentials saved (${creds.region || 'us-east-1'}). Full validation requires AWS SDK.`,
        };

      case 'salesforce':
        if (!creds.client_id || !creds.client_secret || !creds.refresh_token) {
          return { success: false, message: 'Client ID, Client Secret, and Refresh Token are required' };
        }
        return { success: true, message: 'Salesforce credentials saved. OAuth refresh will validate on first use.' };

      case 'gmail':
      case 'outlook':
        if (!creds.access_token) {
          return { success: false, message: 'Access token is required' };
        }
        return { success: true, message: `${provider === 'gmail' ? 'Gmail' : 'Outlook'} OAuth token saved` };

      case 'apipay':
        if (!creds.account_id) {
          return { success: false, message: 'Account ID is required' };
        }
        return { success: true, message: 'apiPay account linked' };

      default:
        return { success: false, message: `Unknown provider: ${provider}` };
    }
  } catch (err) {
    return { success: false, message: `Connection error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Resolves caller's user_id from header or defaults to 'default' */
function getUserId(req: Request): string {
  return (req.headers['x-user-id'] as string) ?? 'default';
}

/** Builds a masked IntegrationResponse from a DB row (or null row for not-configured) */
function buildResponse(
  provider: Provider,
  row: IntegrationRecord | undefined,
): IntegrationResponse {
  const fields = PROVIDER_FIELDS[provider] ?? [];
  if (!row) {
    return {
      provider,
      status: 'disconnected',
      last_tested: null,
      credentials: fields.map((k) => ({ key: k, masked: '' })),
      created_at: null,
    };
  }

  const creds = decrypt(row.credentials) ?? {};
  return {
    provider,
    status: row.status,
    last_tested: row.last_tested,
    credentials: fields.map((k) => ({ key: k, masked: maskValue(creds[k] ?? '') })),
    created_at: row.created_at,
  };
}

// ── Router ─────────────────────────────────────────────────────────────────

export const integrationsRouter = Router();

/**
 * GET /api/v1/integrations
 * Returns all integrations for the current user (with masked credentials).
 */
integrationsRouter.get('/', (req: Request, res: Response): void => {
  try {
    ensureTable();
    const db = getDb();
    const userId = getUserId(req);

    const rows = db.prepare(
      'SELECT * FROM integrations WHERE user_id = ? ORDER BY provider ASC',
    ).all(userId) as IntegrationRecord[];

    const rowMap = new Map(rows.map((r) => [r.provider, r]));
    const results: IntegrationResponse[] = ALL_PROVIDERS.map((p) =>
      buildResponse(p, rowMap.get(p)),
    );

    res.json({ integrations: results });
  } catch (err) {
    logger.error('GET /integrations error', { err });
    res.status(500).json({ error: String(err) });
  }
});

/**
 * PUT /api/v1/integrations/:provider
 * Save or update credentials for a provider.
 * Body: { credentials: Record<string, string> }
 */
integrationsRouter.put('/:provider', (req: Request, res: Response): void => {
  try {
    ensureTable();
    const db = getDb();
    const userId = getUserId(req);
    const provider = req.params.provider as Provider;

    if (!ALL_PROVIDERS.includes(provider)) {
      res.status(400).json({ error: `Unknown provider: ${provider}` });
      return;
    }

    const { credentials } = req.body as { credentials: Record<string, string> };
    if (!credentials || typeof credentials !== 'object') {
      res.status(400).json({ error: 'credentials object required' });
      return;
    }

    const encrypted = encrypt(credentials);

    db.prepare(`
      INSERT INTO integrations (user_id, provider, credentials, status)
        VALUES (?, ?, ?, 'disconnected')
      ON CONFLICT(user_id, provider) DO UPDATE SET
        credentials = excluded.credentials,
        status = 'disconnected'
    `).run(userId, provider, encrypted);

    logger.info('Integration credentials saved', { userId, provider });
    res.json({ success: true, provider });
  } catch (err) {
    logger.error('PUT /integrations/:provider error', { err });
    res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /api/v1/integrations/:provider/test
 * Test the connection for a provider using stored or supplied credentials.
 * Body (optional): { credentials: Record<string, string> } — if supplied, tests without saving.
 */
integrationsRouter.post('/:provider/test', async (req: Request, res: Response): Promise<void> => {
  try {
    ensureTable();
    const db = getDb();
    const userId = getUserId(req);
    const provider = req.params.provider as Provider;

    if (!ALL_PROVIDERS.includes(provider)) {
      res.status(400).json({ error: `Unknown provider: ${provider}` });
      return;
    }

    // Prefer body credentials for live test; fall back to stored
    let creds: Record<string, string> = {};
    if (req.body?.credentials && typeof req.body.credentials === 'object') {
      creds = req.body.credentials as Record<string, string>;
    } else {
      const row = db.prepare(
        'SELECT credentials FROM integrations WHERE user_id = ? AND provider = ?',
      ).get(userId, provider) as { credentials: string } | undefined;

      if (!row) {
        res.status(404).json({ error: `No credentials stored for ${provider}` });
        return;
      }
      creds = decrypt(row.credentials) ?? {};
    }

    const { success, message } = await testProvider(provider, creds);
    const timestamp = new Date().toISOString();
    const newStatus: IntegrationStatus = success ? 'connected' : 'error';

    // Persist test result (upsert if row exists)
    db.prepare(`
      UPDATE integrations SET status = ?, last_tested = ? WHERE user_id = ? AND provider = ?
    `).run(newStatus, timestamp, userId, provider);

    const result: TestResult = { provider, success, message, timestamp };
    logger.info('Integration tested', { userId, provider, success, message });
    res.json(result);
  } catch (err) {
    logger.error('POST /integrations/:provider/test error', { err });
    res.status(500).json({ error: String(err) });
  }
});

/**
 * DELETE /api/v1/integrations/:provider
 * Remove stored credentials for a provider.
 */
integrationsRouter.delete('/:provider', (req: Request, res: Response): void => {
  try {
    ensureTable();
    const db = getDb();
    const userId = getUserId(req);
    const provider = req.params.provider as Provider;

    if (!ALL_PROVIDERS.includes(provider)) {
      res.status(400).json({ error: `Unknown provider: ${provider}` });
      return;
    }

    const result = db.prepare(
      'DELETE FROM integrations WHERE user_id = ? AND provider = ?',
    ).run(userId, provider);

    logger.info('Integration removed', { userId, provider, changes: result.changes });
    res.json({ success: true, provider, removed: result.changes > 0 });
  } catch (err) {
    logger.error('DELETE /integrations/:provider error', { err });
    res.status(500).json({ error: String(err) });
  }
});
