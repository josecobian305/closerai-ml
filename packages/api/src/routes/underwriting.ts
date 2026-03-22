import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import Database from 'better-sqlite3';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { logger } from '../logger';
import { getApplicationType } from '../lender-routing';

export const underwritingRouter = Router();

const CONTACT_DB_PATH = '/home/ubuntu/.openclaw/workspace/data/contact_index.db';
const LEAD_SEGMENTS_PATH = '/home/ubuntu/.openclaw/workspace/scripts/lead_segments_cache.json';
const EVENTS_PATH = '/home/ubuntu/.openclaw/workspace-jacob/pipeline/logs/events.jsonl';
const LENDER_MATCH_SCRIPT = '/home/ubuntu/openclaw/skills/lender-match/scripts/match.py';
const LENDER_ROUTING_JSON = '/home/ubuntu/.openclaw/workspace/data/lender_routing.json';
const LENDER_ROUTING_TS = '/tmp/closerai-ml/packages/api/src/lender-routing.ts';
const S3_BUCKET = 'chc-underwriting-bank-statements-2259';
const FROM_EMAIL = 'jclaude@chccapitalgroup.com';
const CC_EMAILS = ['jcobian@chccapitalgroup.com', 'eramirez@chccapitalgroup.com'];

const s3Client = new S3Client({ region: 'us-east-1' });
const lambda = new LambdaClient({ region: 'us-east-1' });

function getDb(): Database.Database {
  return new Database(CONTACT_DB_PATH, { readonly: true, fileMustExist: true });
}

function getDbRW(): Database.Database {
  return new Database(CONTACT_DB_PATH, { fileMustExist: true });
}

function readJsonSafe(filePath: string, fallback: any = {}): any {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf-8').trim();
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch { return fallback; }
}

function readJsonlSafe(filePath: string): any[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    return fs.readFileSync(filePath, 'utf-8').trim().split('\n')
      .filter(Boolean)
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);
  } catch { return []; }
}

function readLenderRouting(): Record<string, 'CHC' | 'WOTR'> {
  return readJsonSafe(LENDER_ROUTING_JSON, {});
}

function saveLenderRouting(data: Record<string, 'CHC' | 'WOTR'>): void {
  const dir = path.dirname(LENDER_ROUTING_JSON);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(LENDER_ROUTING_JSON, JSON.stringify(data, null, 2));
}

function updateLenderRoutingTs(data: Record<string, 'CHC' | 'WOTR'>): void {
  // Only include WOTR entries (CHC is default)
  const wotrEntries = Object.entries(data).filter(([_, v]) => v === 'WOTR');
  const mapLines = wotrEntries.map(([k, v]) => `  '${k}': '${v}',`).join('\n');

  const tsContent = `// Which LLC application to use per lender
// CHC = CHC Capital Group application
// WOTR = Way of the Road application

export const LENDER_APP_ROUTING: Record<string, 'CHC' | 'WOTR'> = {
${mapLines}
};

export function getApplicationType(lender_id: string, lender_name: string, notes?: string): 'CHC' | 'WOTR' {
  if (LENDER_APP_ROUTING[lender_id]) return LENDER_APP_ROUTING[lender_id];
  if (notes && (notes.toLowerCase().includes('wotr') || notes.toLowerCase().includes('way of the road'))) return 'WOTR';
  return 'CHC';
}
`;
  fs.writeFileSync(LENDER_ROUTING_TS, tsContent);
}

// ─── GET /queue ─────────────────────────────────────────────────
underwritingRouter.get('/queue', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const contacts = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM contact_documents WHERE contact_id = c.id) AS doc_count,
        (SELECT COUNT(*) FROM contact_documents WHERE contact_id = c.id AND doc_type = 'bank_statement') AS bank_stmt_count,
        (SELECT COUNT(*) FROM contact_documents WHERE contact_id = c.id AND doc_type IN ('chc_application','wotr_application')) AS app_count,
        (SELECT COUNT(*) FROM contact_documents WHERE contact_id = c.id AND doc_type = 'credit_report') AS credit_report_count,
        (SELECT COUNT(*) FROM contact_documents WHERE contact_id = c.id AND doc_type = 'background_check') AS bg_check_count,
        (SELECT MAX(uploaded_at) FROM contact_documents WHERE contact_id = c.id AND doc_type = 'bank_statement') AS last_statement_date,
        (SELECT MAX(ts) FROM contact_communications WHERE contact_id = c.id) AS last_activity,
        (SELECT message FROM contact_communications WHERE contact_id = c.id ORDER BY ts DESC LIMIT 1) AS last_message
      FROM contacts c
      WHERE c.id IN (
        SELECT DISTINCT contact_id FROM contact_documents WHERE doc_type = 'bank_statement'
      )
      ORDER BY
        CASE c.priority
          WHEN 'hyper' THEN 0
          WHEN 'docs_received' THEN 1
          WHEN 'urgent' THEN 2
          WHEN 'interested' THEN 3
          WHEN 'warm' THEN 4
          ELSE 5
        END,
        (SELECT COUNT(*) FROM contact_documents WHERE contact_id = c.id) DESC,
        c.created_at DESC
    `).all();

    db.close();

    // Enrich with segment scores
    const segments = readJsonSafe(LEAD_SEGMENTS_PATH, { segments: {} });
    const phoneScoreMap: Record<string, number> = {};
    for (const seg of ['urgent', 'warm', 'cold', 'no_reply', 'dead']) {
      for (const m of (segments.segments?.[seg] || [])) {
        if (m.phone) phoneScoreMap[m.phone] = m.score || 0;
      }
    }

    const enriched = (contacts as any[]).map(c => {
      let tags: string[] = [];
      try { tags = JSON.parse(c.ghl_tags || '[]'); } catch {}
      return {
        ...c,
        tags,
        score: c.phone ? (phoneScoreMap[c.phone] || 0) : 0,
      };
    });

    res.json({ contacts: enriched, total: enriched.length });
  } catch (err) {
    logger.error('underwriting queue error', { err: String(err) });
    res.status(500).json({ error: String(err) });
  }
});

// ═══════════════════════════════════════════════════════════════════
// LENDER ROUTING MANAGEMENT (must be before /:contactId catch-all)
// ═══════════════════════════════════════════════════════════════════

// ─── GET /lenders ───────────────────────────────────────────────
underwritingRouter.get('/lenders', async (_req: Request, res: Response) => {
  try {
    // Get lender match with broad criteria to return all lenders
    let allLenders: any[] = [];
    try {
      const profileJson = JSON.stringify({
        credit_score: 850,
        monthly_revenue: 1000000,
        state: 'FL',
        industry: 'general',
        existing_positions: 0,
        months_in_business: 120,
        requested_amount: 10000,
      });
      const result = execSync(
        `python3 ${LENDER_MATCH_SCRIPT} --format json --top 100 --json '${profileJson}' 2>/dev/null`,
        { timeout: 30000, encoding: 'utf-8' }
      );
      const jsonMatch = result.match(/(\[|\{)[\s\S]*(\]|\})/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        allLenders = Array.isArray(parsed) ? parsed : (parsed.matches || []);
      }
    } catch (e) {
      logger.warn('Lender fetch failed', { err: String(e) });
    }

    // Load routing overrides
    const routing = readLenderRouting();

    // Enrich each lender with app_type
    const enriched = allLenders.map((l: any, i: number) => {
      const lid = l.lender_id || l.id || '';
      return {
        ...l,
        rank: i + 1,
        app_type: routing[lid] || getApplicationType(lid, l.lender_name || l.name || '', ''),
        contact_email: l.contact_email || l.email || '',
      };
    });

    res.json({ lenders: enriched, total: enriched.length });
  } catch (err) {
    logger.error('lenders list error', { err: String(err) });
    res.status(500).json({ error: String(err) });
  }
});

// ─── POST /lenders/:lenderId/routing ────────────────────────────
underwritingRouter.post('/lenders/:lenderId/routing', async (req: Request, res: Response) => {
  try {
    const { lenderId } = req.params;
    const { app_type } = req.body;

    if (!app_type || !['CHC', 'WOTR'].includes(app_type)) {
      return res.status(400).json({ error: 'app_type must be CHC or WOTR' });
    }

    // Load existing routing
    const routing = readLenderRouting();

    // Update
    if (app_type === 'CHC') {
      delete routing[lenderId];
    } else {
      routing[lenderId] = app_type;
    }

    // Save JSON
    saveLenderRouting(routing);

    // Update TS file
    updateLenderRoutingTs(routing);

    logger.info('Lender routing updated', { lenderId, app_type });
    res.json({ ok: true, lender_id: lenderId, app_type });
  } catch (err) {
    logger.error('lender routing update error', { err: String(err) });
    res.status(500).json({ error: String(err) });
  }
});

// ─── GET /:contactId ────────────────────────────────────────────
underwritingRouter.get('/:contactId', async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;

    const db = getDb();
    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contactId) as any;
    if (!contact) { db.close(); return res.status(404).json({ error: 'Contact not found' }); }

    const documents = db.prepare('SELECT * FROM contact_documents WHERE contact_id = ? ORDER BY doc_type, uploaded_at').all(contactId);
    const communications = db.prepare('SELECT * FROM contact_communications WHERE contact_id = ? ORDER BY ts ASC').all(contactId);
    db.close();

    // Presigned URLs via proxy
    const docsWithUrls = (documents as any[]).map(doc => {
      const proxyUrl = `/app/api/v1/pipeline/doc/${doc.id}?key=${encodeURIComponent(doc.s3_key || '')}&bucket=${doc.s3_bucket || S3_BUCKET}`;
      return { ...doc, presigned_url: proxyUrl };
    });

    // Group documents
    const docsByType: Record<string, any[]> = {};
    for (const doc of docsWithUrls) {
      if (!docsByType[doc.doc_type]) docsByType[doc.doc_type] = [];
      docsByType[doc.doc_type].push(doc);
    }

    // Run lender match
    let lenderMatches: any[] = [];
    const routing = readLenderRouting();
    try {
      const profileJson = JSON.stringify({
        credit_score: Number(contact.credit_score) || 580,
        monthly_revenue: Number(contact.monthly_revenue) || 15000,
        state: contact.state || 'FL',
        industry: contact.industry || 'general',
        existing_positions: 0,
        months_in_business: 24,
        requested_amount: Number(contact.loan_amount) || 50000,
      });
      const result = execSync(
        `python3 ${LENDER_MATCH_SCRIPT} --format json --json '${profileJson.replace(/'/g, "\\'")}' 2>/dev/null`,
        { timeout: 30000, encoding: 'utf-8' }
      );
      const jsonMatch = result.match(/(\[|\{)[\s\S]*(\]|\})/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        lenderMatches = Array.isArray(parsed) ? parsed : (parsed.matches || []);
        lenderMatches.forEach((m: any, i: number) => {
          m.rank = i + 1;
          const lid = m.lender_id || m.id || '';
          m.application_type = routing[lid] || getApplicationType(lid, m.lender_name || m.name || '', m.notes);

          // Build WHY explanation from match_reasons or criteria
          if (m.match_reasons && Array.isArray(m.match_reasons)) {
            m.why = m.match_reasons.join('. ') + '.';
          } else {
            const parts: string[] = [];
            const cs = Number(contact.credit_score) || 580;
            const rev = Number(contact.monthly_revenue) || 15000;
            if (m.min_credit_score) parts.push(`Credit ${cs} ${cs >= m.min_credit_score ? 'meets' : 'below'} minimum ${m.min_credit_score}`);
            if (m.max_amount) parts.push(`Amount within $${Number(m.max_amount).toLocaleString()} max`);
            parts.push(`Revenue $${rev.toLocaleString()}/mo`);
            if (contact.state) parts.push(`${contact.state} not restricted`);
            m.why = parts.join('. ') + '.';
          }
        });
      }
    } catch (e) {
      logger.warn('Lender match failed', { contactId, err: String(e) });
    }

    // Statement analysis from events
    let statementAnalysis = null;
    const allEvents = readJsonlSafe(EVENTS_PATH);
    const hyperEvents = allEvents.filter(
      (e: any) => e.phone === contact.phone && e.type === 'hyper_mode_triggered'
    );
    if (hyperEvents.length > 0) {
      const last = hyperEvents[hyperEvents.length - 1];
      const analysis = last.analysis || {};
      const avgRev = analysis.avg_revenue || last.avg_revenue;
      const negDays = analysis.negative_days ?? last.negative_days;
      const redFlags = analysis.red_flags || last.red_flags || [];
      const hasFlags = Array.isArray(redFlags) ? redFlags.length > 0 : !!redFlags;

      statementAnalysis = {
        status: hasFlags ? (redFlags.length > 2 ? 'high_risk' : 'needs_attention') : 'clean',
        avg_revenue: avgRev,
        negative_days: negDays,
        revenue_trend: analysis.revenue_trend || last.revenue_trend,
        existing_advances: analysis.existing_advances || last.existing_advances || [],
        red_flags: redFlags,
        raw: analysis.notes || last.notes,
      };
    }

    // Parse GHL tags
    let tags: string[] = [];
    try { tags = JSON.parse(contact.ghl_tags || '[]'); } catch {}

    res.json({
      contact: { ...contact, tags },
      documents: docsWithUrls,
      documents_by_type: docsByType,
      communications,
      lender_matches: lenderMatches,
      statement_analysis: statementAnalysis,
    });
  } catch (err) {
    logger.error('underwriting detail error', { err: String(err) });
    res.status(500).json({ error: String(err) });
  }
});

// ─── POST /:contactId/upload ────────────────────────────────────
underwritingRouter.post('/:contactId/upload', async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;

    // Read multipart via raw body (simple approach: base64 in JSON)
    const { filename, content_base64, doc_type } = req.body;
    if (!filename || !content_base64 || !doc_type) {
      return res.status(400).json({ error: 'filename, content_base64, and doc_type required' });
    }

    const db = getDb();
    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contactId) as any;
    db.close();
    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    const phone = (contact.phone || 'unknown').replace(/[^0-9]/g, '');
    const s3Key = `underwriting/${phone}/${filename}`;

    // Upload to S3
    const body = Buffer.from(content_base64, 'base64');
    await s3Client.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: body,
      ContentType: filename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
    }));

    // Record in DB
    const rwDb = getDbRW();
    const docId = require('crypto').randomBytes(16).toString('hex');
    rwDb.prepare(`
      INSERT INTO contact_documents (id, contact_id, doc_type, s3_bucket, s3_key, filename, file_size, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(docId, contactId, doc_type, S3_BUCKET, s3Key, filename, body.length, new Date().toISOString());
    rwDb.close();

    logger.info('Underwriting doc uploaded', { contactId, doc_type, s3Key });
    res.json({ ok: true, doc_id: docId, s3_key: s3Key });
  } catch (err) {
    logger.error('upload error', { err: String(err) });
    res.status(500).json({ error: String(err) });
  }
});

// ─── POST /:contactId/approve ───────────────────────────────────
underwritingRouter.post('/:contactId/approve', async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;
    const { lenders, notes, agent, decision, missing_docs } = req.body;

    const db = getDb();
    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contactId) as any;
    if (!contact) { db.close(); return res.status(404).json({ error: 'Contact not found' }); }
    const documents = db.prepare('SELECT * FROM contact_documents WHERE contact_id = ?').all(contactId) as any[];
    db.close();

    const agentName = agent || 'Jacob Claude';
    const decisionType = decision || 'approve';

    // ── PAUSE ──
    if (decisionType === 'pause') {
      const rwDb = getDbRW();
      rwDb.prepare('UPDATE contacts SET status = ? WHERE id = ?').run('paused', contactId);
      rwDb.close();
      const event = { ts: new Date().toISOString(), type: 'underwriting_paused', contact_id: contactId, phone: contact.phone, business: contact.business, agent: agentName, notes: notes || '' };
      fs.appendFileSync(EVENTS_PATH, JSON.stringify(event) + '\n');
      return res.json({ ok: true, decision: 'pause' });
    }

    // ── REQUEST DOCS ──
    if (decisionType === 'request_docs') {
      const docsList = (missing_docs || []).join(', ');
      const smsBody = `Hi, this is ${agentName} from CHC Capital. To complete your file, we still need: ${docsList}. Please send them at your earliest convenience. Thank you!`;

      try {
        execSync(`python3 -c "
import os, requests, re
from dotenv import load_dotenv
load_dotenv('/home/ubuntu/.openclaw/.env.secrets')
TT_SID = os.environ.get('TT_SID','')
TT_KEY = os.environ.get('TT_KEY','')
phone = '${contact.phone || ''}'
digits = re.sub(r'\\\\D','',phone)[-10:]
headers = {'X-API-SID': TT_SID, 'X-API-PUBLIC-KEY': TT_KEY, 'Content-Type': 'application/json'}
r = requests.get(f'https://api.texttorrent.com/api/v1/inbox?limit=1&search={digits}', headers=headers, timeout=10)
chats = (r.json().get('data') or {}).get('data', [])
if chats:
    chat_id = chats[0]['id']
    requests.post('https://api.texttorrent.com/api/v1/inbox/chat', headers=headers,
        json={'chat_id': str(chat_id), 'from_number': '+12624191533', 'sender_id': '+12624191533', 'to_number': f'+1{digits}', 'message': '''${smsBody.replace(/'/g, "\\'")}'''}, timeout=10)
" 2>/dev/null`, { timeout: 15000 });
      } catch (e) {
        logger.warn('SMS request docs failed', { err: String(e) });
      }

      const event = { ts: new Date().toISOString(), type: 'underwriting_request_docs', contact_id: contactId, phone: contact.phone, business: contact.business, agent: agentName, missing_docs: missing_docs || [], notes: notes || '' };
      fs.appendFileSync(EVENTS_PATH, JSON.stringify(event) + '\n');
      return res.json({ ok: true, decision: 'request_docs', missing_docs });
    }

    // ── APPROVE & SEND ──
    if (!lenders || !Array.isArray(lenders) || lenders.length === 0) {
      return res.status(400).json({ error: 'lenders[] required for approve' });
    }

    const results: any[] = [];
    const routing = readLenderRouting();

    for (const lender of lenders) {
      const lid = lender.lender_id || '';
      const appType = routing[lid] || lender.app_type || getApplicationType(lid, lender.lender_name || '', notes);

      const appDocType = appType === 'WOTR' ? 'wotr_application' : 'chc_application';
      const appDoc = documents.find((d: any) => d.doc_type === appDocType);
      const bankStmts = documents.filter((d: any) => d.doc_type === 'bank_statement');

      const subject = `Submission — ${contact.business || 'Unknown'} | ${contact.loan_amount ? `$${Number(contact.loan_amount).toLocaleString()}` : 'TBD'} | MCA`;
      const body = `Hi ${lender.lender_name || 'Team'},

Please find attached the following submission for your review:

Business: ${contact.business}
Owner: ${contact.name}
Monthly Revenue: ~$${contact.monthly_revenue ? Number(contact.monthly_revenue).toLocaleString() : 'TBD'}
Requested: $${contact.loan_amount ? Number(contact.loan_amount).toLocaleString() : 'TBD'}
Product: MCA
Application Type: ${appType}

Included:
✓ Bank Statements (${bankStmts.length} files)
✓ ${appType === 'WOTR' ? 'Way of the Road (WOTR)' : 'CHC Capital Group'} Application

${notes || 'No additional notes.'}

— ${agentName}
CHC Capital Group`;

      try {
        // Watermark
        const docsToSend = [...(appDoc ? [appDoc] : []), ...bankStmts];
        const watermarkedPaths: string[] = [];
        for (const doc of docsToSend) {
          try {
            const wArgs = JSON.stringify({
              s3_bucket: doc.s3_bucket || S3_BUCKET,
              s3_key: doc.s3_key,
              lender_name: lender.lender_name || 'Unknown',
              output_dir: '/tmp/watermarked',
            });
            execSync(`python3 /home/ubuntu/.openclaw/workspace/scripts/pdf_watermarker.py '${wArgs.replace(/'/g, "\\'")}'`, { timeout: 30000 });
            watermarkedPaths.push(`/tmp/watermarked/${doc.filename}`);
          } catch (e) { logger.warn('Watermark failed', { doc: doc.filename, err: String(e) }); }
        }

        const attachments: any[] = [];
        for (const wp of watermarkedPaths) {
          try {
            if (fs.existsSync(wp)) {
              attachments.push({
                filename: path.basename(wp),
                content: fs.readFileSync(wp).toString('base64'),
                contentType: 'application/pdf',
              });
            }
          } catch {}
        }

        const sesPayload = {
          to: lender.contact_email,
          from_email: FROM_EMAIL,
          cc: CC_EMAILS,
          subject,
          html: `<html><body style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px'><pre style='font-family:Arial;white-space:pre-wrap'>${body}</pre></body></html>`,
          attachments: attachments.length > 0 ? attachments : undefined,
        };

        const sesResp = await lambda.send(new InvokeCommand({
          FunctionName: 'CHC-SES-Sender',
          InvocationType: 'RequestResponse',
          Payload: Buffer.from(JSON.stringify(sesPayload)),
        }));
        const sesResult = sesResp.Payload ? JSON.parse(Buffer.from(sesResp.Payload).toString()) : {};
        results.push({
          lender_name: lender.lender_name,
          status: sesResult.statusCode === 200 ? 'sent' : 'error',
          error: sesResult.statusCode !== 200 ? (sesResult.error || 'Unknown') : null,
        });
      } catch (emailErr: any) {
        results.push({ lender_name: lender.lender_name, status: 'error', error: emailErr.message || String(emailErr) });
      }
    }

    // Log event
    const event = {
      ts: new Date().toISOString(),
      type: 'underwriting_approved',
      contact_id: contactId,
      phone: contact.phone,
      business: contact.business,
      lenders: lenders.map((l: any) => l.lender_name),
      results,
      agent: agentName,
      notes: notes || '',
    };
    fs.appendFileSync(EVENTS_PATH, JSON.stringify(event) + '\n');

    // Update status
    try {
      const rwDb = getDbRW();
      rwDb.prepare('UPDATE contacts SET status = ? WHERE id = ?').run('submitted', contactId);
      rwDb.close();
    } catch {}

    const sentCount = results.filter(r => r.status === 'sent').length;
    logger.info('Underwriting approved', { contactId, sent: sentCount, total: lenders.length });
    res.json({ ok: true, results, sent: sentCount, total: lenders.length });
  } catch (err) {
    logger.error('underwriting approve error', { err: String(err) });
    res.status(500).json({ error: String(err) });
  }
});

// ─── LLC Profiles ──────────────────────────────────────────────────────────
const LLC_PROFILES_PATH = '/home/ubuntu/.openclaw/workspace/data/llc_profiles.json';

underwritingRouter.get('/llc-profiles', (_req: Request, res: Response): void => {
  try {
    const data = fs.existsSync(LLC_PROFILES_PATH) 
      ? JSON.parse(fs.readFileSync(LLC_PROFILES_PATH, 'utf-8'))
      : { profiles: [] };
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

underwritingRouter.post('/llc-profiles', (req: Request, res: Response): void => {
  try {
    const data = req.body;
    data.updated_at = new Date().toISOString();
    fs.writeFileSync(LLC_PROFILES_PATH, JSON.stringify(data, null, 2));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

underwritingRouter.put('/llc-profiles/:id', (req: Request, res: Response): void => {
  try {
    const data = fs.existsSync(LLC_PROFILES_PATH)
      ? JSON.parse(fs.readFileSync(LLC_PROFILES_PATH, 'utf-8'))
      : { profiles: [] };
    const idx = data.profiles.findIndex((p: any) => p.id === req.params.id);
    if (idx === -1) {
      data.profiles.push({ ...req.body, id: req.params.id });
    } else {
      data.profiles[idx] = { ...data.profiles[idx], ...req.body };
    }
    data.updated_at = new Date().toISOString();
    fs.writeFileSync(LLC_PROFILES_PATH, JSON.stringify(data, null, 2));
    res.json({ ok: true, profile: idx === -1 ? data.profiles[data.profiles.length-1] : data.profiles[idx] });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

underwritingRouter.post('/llc-profiles/:id/logo', async (req: Request, res: Response): Promise<void> => {
  try {
    // Accept base64 logo upload → save to S3
    const { logo_data, filename, content_type } = req.body;
    if (!logo_data) { res.status(400).json({ error: 'logo_data required' }); return; }
    
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const s3c = new S3Client({ region: 'us-east-1' });
    const key = `llc-logos/${req.params.id}/${filename || 'logo.png'}`;
    await s3c.send(new PutObjectCommand({
      Bucket: 'chc-underwriting-bank-statements-2259',
      Key: key,
      Body: Buffer.from(logo_data, 'base64'),
      ContentType: content_type || 'image/png',
      ACL: 'public-read' as any,
    }));
    const url = `https://chc-underwriting-bank-statements-2259.s3.us-east-1.amazonaws.com/${key}`;
    
    // Update profile
    const data = JSON.parse(fs.readFileSync(LLC_PROFILES_PATH, 'utf-8'));
    const profile = data.profiles.find((p: any) => p.id === req.params.id);
    if (profile) { profile.logo_s3_key = key; profile.logo_url = url; }
    data.updated_at = new Date().toISOString();
    fs.writeFileSync(LLC_PROFILES_PATH, JSON.stringify(data, null, 2));
    
    res.json({ ok: true, logo_url: url, s3_key: key });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
