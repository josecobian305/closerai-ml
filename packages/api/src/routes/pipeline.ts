import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
// SES via CHC-SES-Sender Lambda (has correct IAM role)
import { logger } from '../logger';
import { getApplicationType } from '../lender-routing';

export const pipelineRouter = Router();

const LEAD_SEGMENTS_PATH = '/home/ubuntu/.openclaw/workspace/scripts/lead_segments_cache.json';
const LEAD_STATES_PATH = '/home/ubuntu/.openclaw/workspace-jacob/pipeline/logs/lead_states.json';
const EVENTS_PATH = '/home/ubuntu/.openclaw/workspace-jacob/pipeline/logs/events.jsonl';
const LENDER_MATCH_SCRIPT = '/home/ubuntu/openclaw/skills/lender-match/scripts/match.py';

const FROM_EMAIL = 'jclaude@chccapitalgroup.com';
const CC_EMAILS = ['jcobian@chccapitalgroup.com', 'eramirez@chccapitalgroup.com'];

const lambda = new LambdaClient({ region: 'us-east-1' });


// Pipeline stage order
const STAGES = [
  'outreach',
  'replied',
  'interested',
  'docs_requested',
  'hyper_mode',
  'pre_underwriting',
  'lender_match',
  'offer_submitted',
  'funded',
] as const;

type Stage = typeof STAGES[number];

function readJsonSafe(filePath: string, fallback: any = {}): any {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf-8').trim();
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function readJsonlSafe(filePath: string): any[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    return fs.readFileSync(filePath, 'utf-8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return 'never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

async function getDynamoStats(): Promise<Record<string, any>> {
  try {
    const resp = await lambda.send(new InvokeCommand({
      FunctionName: 'chc-sms-handler',
      Payload: Buffer.from(JSON.stringify({ action: 'stats' })),
    }));
    const body = JSON.parse(new TextDecoder().decode(resp.Payload));
    const parsed = typeof body.body === 'string' ? JSON.parse(body.body) : body;
    // Build a phone → status map
    const map: Record<string, any> = {};
    if (parsed.conversations) {
      for (const c of parsed.conversations) {
        map[c.phone] = c;
      }
    }
    return map;
  } catch (err) {
    logger.warn('Failed to fetch DynamoDB stats', { err: String(err) });
    return {};
  }
}

function determinePipelineStage(merchant: any, leadState: any, events: any[], dynamoInfo: any): Stage {
  const stateStr = leadState?.state || '';
  const seqStatus = dynamoInfo?.sequence_status || dynamoInfo?.status || '';

  // Check from highest stage to lowest
  if (stateStr === 'funded' || seqStatus === 'funded' || merchant.funded) {
    return 'funded';
  }

  const hasOfferEvent = events.some(e =>
    e.type === 'offer_submitted' || e.type === 'lender_emails_sent'
  );
  if (hasOfferEvent) return 'offer_submitted';

  const hasLenderMatch = events.some(e => e.type === 'lender_match_ready') || seqStatus === 'lender_match';
  if (hasLenderMatch) return 'lender_match';

  // Pre-underwriting: docs received AND has app fields
  const fieldsCollected = leadState?.fields_collected || [];
  const hasAppFields = fieldsCollected.some((f: string) => ['ein', 'ssn', 'dob'].includes(f));
  if (merchant.docs_received && hasAppFields) return 'pre_underwriting';

  // Hyper mode
  const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const hasHyperEvent = events.some(e =>
    e.type === 'hyper_mode_triggered' && new Date(e.ts).getTime() > fourteenDaysAgo
  );
  if (seqStatus === 'hyper' || merchant.hyper || hasHyperEvent) return 'hyper_mode';

  // Docs requested
  if (stateStr === 'docs_requested' || stateStr === 'docs_received') return 'docs_requested';
  if (merchant.docs_received) return 'docs_requested';

  // Check replies
  const replies = merchant.replies || [];
  const lastReply = replies.length > 0 ? replies[replies.length - 1] : null;
  const lastCat = lastReply?.cat || '';

  if (lastCat === 'interested' || lastCat === 'INTERESTED' || lastCat === 'QUALIFIED' || lastCat === 'qualified') {
    return 'interested';
  }

  if (replies.length > 0) return 'replied';

  return 'outreach';
}

// ─── GET /board ─────────────────────────────────────────────────
pipelineRouter.get('/board', async (_req: Request, res: Response) => {
  try {
    const segments = readJsonSafe(LEAD_SEGMENTS_PATH, { segments: {} });
    const leadStates = readJsonSafe(LEAD_STATES_PATH);
    const allEvents = readJsonlSafe(EVENTS_PATH);

    // Build events index by phone
    const eventsByPhone: Record<string, any[]> = {};
    for (const ev of allEvents) {
      if (!ev.phone) continue;
      if (!eventsByPhone[ev.phone]) eventsByPhone[ev.phone] = [];
      eventsByPhone[ev.phone].push(ev);
    }

    // Get DynamoDB stats (best effort)
    let dynamoMap: Record<string, any> = {};
    try {
      dynamoMap = await getDynamoStats();
    } catch {}

    // Aggregate all merchants from segments
    const allMerchants: any[] = [];
    const segKeys = ['urgent', 'warm', 'cold', 'no_reply', 'dead'];
    for (const seg of segKeys) {
      const merchants = segments.segments?.[seg] || [];
      for (const m of merchants) {
        allMerchants.push({ ...m, _segment: seg });
      }
    }

    // Build pipeline board
    const board: Record<Stage, any[]> = {
      outreach: [],
      replied: [],
      interested: [],
      docs_requested: [],
      hyper_mode: [],
      pre_underwriting: [],
      lender_match: [],
      offer_submitted: [],
      funded: [],
    };

    for (const m of allMerchants) {
      // Skip opted out
      if (m.opted_out) continue;

      const phone = m.phone;
      const leadState = leadStates[phone] || null;
      const events = eventsByPhone[phone] || [];
      const dynamoInfo = dynamoMap[phone] || {};

      const stage = determinePipelineStage(m, leadState, events, dynamoInfo);

      const lastReply = m.replies?.length > 0 ? m.replies[m.replies.length - 1] : null;
      const lastSend = m.last_send;

      board[stage].push({
        phone,
        business: m.business || '',
        name: m.name || '',
        score: m.score || 0,
        hyper: m.hyper || false,
        docs_received: m.docs_received || false,
        funded: m.funded || false,
        sends: m.sends || 0,
        reply_count: (m.replies || []).length,
        last_reply_text: lastReply?.text?.slice(0, 120) || '',
        last_reply_cat: lastReply?.cat || '',
        last_reply_ts: lastReply?.ts || '',
        last_send_ts: lastSend || '',
        last_contact_ago: timeAgo(lastReply?.ts || lastSend || ''),
        categories: m.categories || [],
        states: m.states || [],
        fields_collected: leadState?.fields_collected || [],
        fields_missing: leadState?.fields_missing || [],
        events_summary: events.slice(-5).map((e: any) => ({ type: e.type, ts: e.ts, notes: e.notes })),
        stage,
      });
    }

    // Sort each stage by score desc
    for (const stage of STAGES) {
      board[stage].sort((a, b) => (b.score || 0) - (a.score || 0));
    }

    const counts: Record<string, number> = {};
    for (const stage of STAGES) {
      counts[stage] = board[stage].length;
    }

    res.json({
      stages: board,
      counts,
      total: allMerchants.filter(m => !m.opted_out).length,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('pipeline board error', { err: String(err) });
    res.status(500).json({ error: String(err) });
  }
});

// ─── GET /merchant/:phone ───────────────────────────────────────
pipelineRouter.get('/merchant/:phone', async (req: Request, res: Response) => {
  try {
    const phone = req.params.phone.startsWith('+') ? req.params.phone : `+${req.params.phone}`;
    const segments = readJsonSafe(LEAD_SEGMENTS_PATH, { segments: {} });
    const leadStates = readJsonSafe(LEAD_STATES_PATH);
    const allEvents = readJsonlSafe(EVENTS_PATH);

    // Find merchant in segments
    let merchant: any = null;
    for (const seg of ['urgent', 'warm', 'cold', 'no_reply', 'dead']) {
      const found = (segments.segments?.[seg] || []).find((m: any) => m.phone === phone);
      if (found) { merchant = { ...found, _segment: seg }; break; }
    }

    const leadState = leadStates[phone] || null;
    const events = allEvents.filter(e => e.phone === phone);
    const dynamoInfo: any = {};

    const stage = merchant
      ? determinePipelineStage(merchant, leadState, events, dynamoInfo)
      : 'outreach';

    res.json({
      phone,
      merchant: merchant || { phone, business: '', name: '' },
      lead_state: leadState,
      events,
      stage,
    });
  } catch (err) {
    logger.error('merchant detail error', { err: String(err) });
    res.status(500).json({ error: String(err) });
  }
});

// ─── Bot trigger map — fires when agent manually moves a stage ───────────────
function triggerBotJob(phone: string, toStage: string, fromStage: string, notes: string): string {
  const { execSync: exec } = require('child_process');
  const timestamp = new Date().toISOString();

  // Log the bot trigger event
  const triggerEvent = JSON.stringify({
    ts: timestamp,
    type: 'bot_trigger',
    phone,
    trigger: toStage,
    from: fromStage,
    notes: notes || '',
    manual: true,
  });
  try {
    fs.appendFileSync(
      '/home/ubuntu/.openclaw/workspace-jacob/pipeline/logs/events.jsonl',
      triggerEvent + '\n'
    );
  } catch {}

  // Stage-specific bot jobs
  switch (toStage) {
    case 'interested':
      // Bot: qualify and ask for bank statements
      exec(
        `python3 -c "
import sys; sys.path.insert(0, '/home/ubuntu/.openclaw/workspace-jacob/pipeline')
from lead_state_machine import set_merchant_state
set_merchant_state('${phone}', 'docs_requested')
" 2>/dev/null`,
        { timeout: 5000 }
      );
      return 'qualification_triggered';

    case 'docs_requested':
      // Bot: send bank statement request via SMS immediately
      exec(
        `python3 -c "
import os, requests, re
from dotenv import load_dotenv
load_dotenv('/home/ubuntu/.openclaw/.env.secrets')
TT_SID = os.environ.get('TT_SID','')
TT_KEY = os.environ.get('TT_KEY','')
phone = '${phone}'
digits = re.sub(r'\\D','',phone)[-10:]
headers = {'X-API-SID': TT_SID, 'X-API-PUBLIC-KEY': TT_KEY, 'Content-Type': 'application/json'}
r = requests.get(f'https://api.texttorrent.com/api/v1/inbox?limit=1&search={digits}', headers=headers, timeout=10)
chats = (r.json().get('data') or {}).get('data', [])
if chats:
    chat_id = chats[0]['id']
    msg = 'Hey! Jacob from CHC Capital. To move your file forward I need your last 4 months of bank statements. You can text me photos, email PDF to jclaude@chccapitalgroup.com, or reply here. What works best?'
    requests.post('https://api.texttorrent.com/api/v1/inbox/chat', headers=headers,
        json={'chat_id': str(chat_id), 'from_number': '+12624191533', 'sender_id': '+12624191533', 'to_number': f'+1{digits}', 'message': msg}, timeout=10)
" 2>/dev/null &`,
        { timeout: 3000 }
      );
      return 'statement_request_sent';

    case 'hyper_mode':
      // Bot: trigger hyper email watcher immediately
      exec(
        `python3 /home/ubuntu/.openclaw/workspace/scripts/hyper_email_watcher.py 2>/dev/null &`,
        { timeout: 3000 }
      );
      // Also update DynamoDB sequence status
      try {
        exec(
          `aws lambda invoke --function-name SequenceEngine --region us-east-1 --cli-binary-format raw-in-base64-out --payload '{"merchant_phone":"${phone}","action":"set_hyper"}' /dev/null 2>/dev/null`,
          { timeout: 8000 }
        );
      } catch {}
      return 'hyper_mode_triggered';

    case 'pre_underwriting':
      // Bot: run statement analysis if not already done
      exec(
        `python3 -c "
import sys, boto3, json
lmb = boto3.client('lambda', region_name='us-east-1')
payload = json.dumps({'merchant_phone': '${phone}', 'action': 'analyze_statements'}).encode()
lmb.invoke(FunctionName='ExtractBankData', InvocationType='Event', Payload=payload)
" 2>/dev/null &`,
        { timeout: 3000 }
      );
      return 'statement_analysis_queued';

    case 'lender_match':
      // Bot: auto-run lender match and cache results
      try {
        exec(
          `python3 /home/ubuntu/openclaw/skills/lender-match/scripts/match.py --format json --json '{"credit_score":580,"monthly_revenue":15000,"state":"FL","industry":"general","existing_positions":0,"months_in_business":24}' > /tmp/lender_match_${phone.replace(/\+/g,'')}.json 2>/dev/null`,
          { timeout: 15000 }
        );
      } catch {}
      return 'lender_match_cached';

    case 'funded':
      // Bot: update GHL opportunity to Won + log funded event
      exec(
        `python3 -c "
import sys, os, requests, re
sys.path.insert(0, '/home/ubuntu/.openclaw/workspace-jacob/pipeline')
from dotenv import load_dotenv
load_dotenv('/home/ubuntu/.openclaw/.env.secrets')
GHL_KEY = os.environ.get('GHL_API_KEY','')
LOC = 'dkqTGqWYd8HORwh5IVdq'
phone = '${phone}'
digits = re.sub(r'\\D','',phone)[-10:]
h = {'Authorization': f'Bearer {GHL_KEY}', 'Version': '2021-07-28'}
r = requests.get(f'https://services.leadconnectorhq.com/contacts/?locationId={LOC}&limit=1&query={digits}', headers=h, timeout=8)
cs = r.json().get('contacts',[])
if cs:
    cid = cs[0]['id']
    requests.post(f'https://services.leadconnectorhq.com/contacts/{cid}/tags', headers={**h,'Content-Type':'application/json'}, json={'tags':['funded']}, timeout=8)
    print(f'Tagged funded: {cid}')
" 2>/dev/null`,
        { timeout: 8000 }
      );
      return 'funded_ghl_updated';

    default:
      return 'no_bot_job';
  }
}

// ─── POST /advance ──────────────────────────────────────────────
pipelineRouter.post('/advance', async (req: Request, res: Response) => {
  try {
    const { phone, from_stage, to_stage, notes } = req.body;
    if (!phone || !to_stage) {
      return res.status(400).json({ error: 'phone and to_stage required' });
    }

    const event = {
      ts: new Date().toISOString(),
      type: 'state_transition',
      phone,
      from_state: from_stage || 'unknown',
      to_state: to_stage,
      notes: notes || `Manual advance to ${to_stage}`,
      fields_collected: [],
      fields_missing: [],
    };

    // Append to events.jsonl
    fs.appendFileSync(EVENTS_PATH, JSON.stringify(event) + '\n');

    // Update lead_states.json
    const leadStates = readJsonSafe(LEAD_STATES_PATH);
    if (!leadStates[phone]) {
      leadStates[phone] = {
        state: to_stage,
        fields_collected: [],
        fields_missing: ['ein', 'ssn', 'dob', 'home_address', 'business_start_date'],
        docs_received: false,
        history: [],
        last_action_at: new Date().toISOString(),
      };
    }
    leadStates[phone].state = to_stage;
    leadStates[phone].last_action_at = new Date().toISOString();
    if (!leadStates[phone].history) leadStates[phone].history = [];
    leadStates[phone].history.push({
      ts: new Date().toISOString(),
      from: from_stage || 'unknown',
      to: to_stage,
      notes: notes || '',
    });
    fs.writeFileSync(LEAD_STATES_PATH, JSON.stringify(leadStates, null, 2));

    logger.info('Pipeline advance', { phone, from_stage, to_stage });

    // ─── BOT TRIGGER per stage ──────────────────────────────────────
    const botJob = triggerBotJob(phone, to_stage, from_stage, notes);
    res.json({ ok: true, phone, stage: to_stage, bot_job: botJob });
  } catch (err) {
    logger.error('pipeline advance error', { err: String(err) });
    res.status(500).json({ error: String(err) });
  }
});

// ─── GET /lender-match/:phone ───────────────────────────────────
pipelineRouter.get('/lender-match/:phone', async (req: Request, res: Response) => {
  try {
    const phone = req.params.phone.startsWith('+') ? req.params.phone : `+${req.params.phone}`;

    // Build merchant profile from query params or DynamoDB
    const credit = req.query.credit || req.query.credit_score || '580';
    const revenue = req.query.revenue || req.query.monthly_revenue || '15000';
    const state = req.query.state || 'FL';
    const industry = req.query.industry || 'general';
    const positions = req.query.positions || '0';
    const months = req.query.months || req.query.months_in_business || '24';
    const amount = req.query.amount || '50000';

    const profileJson = JSON.stringify({
      credit_score: Number(credit),
      monthly_revenue: Number(revenue),
      state: String(state),
      industry: String(industry),
      existing_positions: Number(positions),
      months_in_business: Number(months),
      requested_amount: Number(amount),
    });

    let result: string;
    try {
      result = execSync(
        `python3 ${LENDER_MATCH_SCRIPT} --format json --json '${profileJson}' 2>/dev/null`,
        { timeout: 30000, encoding: 'utf-8' }
      );
    } catch (e: any) {
      result = e.stdout || '[]';
    }

    // Try to parse JSON from the output
    let parsed: any = {};
    try {
      // Find JSON in output (may have text before/after)
      const jsonMatch = result.match(/(\[|\{)[\s\S]*(\]|\})/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch {
      parsed = { raw: result.slice(0, 2000) };
    }

    // Add application type info to each lender
    const matchList = Array.isArray(parsed) ? parsed : (parsed.matches || []);
    if (matchList.length > 0) {
      for (const match of matchList) {
        match.application_type = getApplicationType(
          match.lender_id || match.id || '',
          match.lender_name || match.name || '',
          match.notes
        );
      }
    }

    const finalMatches = Array.isArray(parsed) ? parsed : (parsed.matches || []);
    finalMatches.forEach((m: any, i: number) => { m.rank = i + 1; });
    res.json({
      phone,
      matches: finalMatches,
      total: finalMatches.length,
    });
  } catch (err) {
    logger.error('lender match error', { err: String(err) });
    res.status(500).json({ error: String(err) });
  }
});

// ─── GET /doc/:id — Proxy S3 document with correct Content-Type ──────────────
pipelineRouter.get('/doc/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { key, bucket } = req.query as { key: string; bucket: string };
    if (!key || !bucket) { res.status(400).json({ error: 'key and bucket required' }); return; }

    const s3Client = new S3Client({ region: 'us-east-1' });
    const cmd = new GetObjectCommand({ Bucket: bucket, Key: decodeURIComponent(key) });
    const obj = await s3Client.send(cmd);

    const fname = decodeURIComponent(key).split('/').pop() || 'document.pdf';
    const ct = fname.toLowerCase().endsWith('.pdf') ? 'application/pdf'
      : fname.match(/\.(jpg|jpeg)$/i) ? 'image/jpeg'
      : fname.match(/\.png$/i) ? 'image/png'
      : 'application/octet-stream';

    res.setHeader('Content-Type', ct);
    res.setHeader('Content-Disposition', `inline; filename="${fname}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    if (obj.Body) {
      const chunks: Buffer[] = [];
      for await (const chunk of obj.Body as any) {
        chunks.push(Buffer.from(chunk));
      }
      res.send(Buffer.concat(chunks));
    } else {
      res.status(404).json({ error: 'Empty document' });
    }
  } catch (err: any) {
    res.status(404).json({ error: String(err) });
  }
});

// ─── POST /submit-offer ─────────────────────────────────────────
pipelineRouter.post('/submit-offer', async (req: Request, res: Response) => {
  try {
    const { phone, merchant_name, business_name, lenders, notes, agent, amount, product, position } = req.body;

    if (!phone || !business_name || !lenders || !Array.isArray(lenders) || lenders.length === 0) {
      return res.status(400).json({ error: 'phone, business_name, and lenders[] required' });
    }

    const agentName = agent || 'Jacob Claude';
    let sent = 0;
    const errors: string[] = [];

    for (const lender of lenders) {
      const appType = getApplicationType(
        lender.lender_id || '',
        lender.lender_name || '',
        lender.notes || notes
      );

      const subject = `Submission — ${business_name} | ${amount ? `$${Number(amount).toLocaleString()}` : 'TBD'} | ${product || 'MCA'}`;

      const contactName = lender.contact_name || lender.lender_name || 'Team';

      const body = `Hi ${contactName},

Please find attached the following submission for your review:

Business: ${business_name}
Owner: ${merchant_name || 'N/A'}
Monthly Revenue: ~$${amount ? Math.round(Number(amount) / 12).toLocaleString() : 'TBD'}
Requested: $${amount ? Number(amount).toLocaleString() : 'TBD'}
Product: ${product || 'MCA'}
Position: ${position || '1st'}

Included:
✓ Bank Statements
✓ ${appType === 'WOTR' ? 'Way of the Road (WOTR)' : 'CHC Capital Group'} Application
✓ Submission Notes

${notes || 'No additional notes.'}

Please advise on next steps.

— ${agentName}
CHC Capital Group`;

      try {
        // Build rich watermarked HTML via Python submission_package builder
        let submissionHtml = '';
        try {
          const { execSync } = require('child_process');
          const pkgInput = JSON.stringify({
            merchant_name: merchant_name || '',
            business_name,
            phone,
            amount: amount || '0',
            product: product || 'MCA',
            position: position || '1st',
            monthly_revenue: req.body.monthly_revenue || '0',
            credit_score: req.body.credit_score || '',
            industry: req.body.industry || '',
            state: req.body.state || '',
            notes: notes || '',
            lender_name: lender.lender_name,
            lender_contact: lender.contact_email || '',
            app_type: appType,
            agent_name: agentName,
          });
          const pyScript = `
import sys, json
sys.path.insert(0, '/home/ubuntu/.openclaw/workspace/scripts')
from submission_package import build_submission_html
data = json.loads(sys.argv[1])
print(build_submission_html(**data))
`;
          submissionHtml = execSync(`python3 -c "${pyScript.replace(/"/g, '\\"')}" '${pkgInput.replace(/'/g, "\\'")}'`, { timeout: 10000 }).toString().trim();
        } catch (pyErr: any) {
          // Fallback to simple HTML
          submissionHtml = `<html><body style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px'><pre style='font-family:Arial;white-space:pre-wrap'>${body}</pre></body></html>`;
        }

        // Build attachments: watermarked application PDF + presigned statement links
        const attachments: Array<{name: string; data: string; content_type: string}> = [];
        let statementLinksHtml = '';
        
        try {
          // Get contact docs from SQLite
          const Database = require('better-sqlite3');
          const db = new Database('/home/ubuntu/.openclaw/workspace/data/contact_index.db', { readonly: true });
          const contactByPhone = db.prepare('SELECT id FROM contacts WHERE phone=?').get(phone) as any;
          
          if (contactByPhone) {
            const appDocType = appType === 'WOTR' ? 'wotr_application' : 'chc_application';
            const appDoc = db.prepare("SELECT s3_key, s3_bucket, filename FROM contact_documents WHERE contact_id=? AND doc_type=? LIMIT 1").get(contactByPhone.id, appDocType) as any;
            
            if (appDoc) {
              // Download + watermark the application PDF
              const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
              const s3c = new S3Client({ region: 'us-east-1' });
              
              try {
                const obj = await s3c.send(new GetObjectCommand({ Bucket: appDoc.s3_bucket, Key: appDoc.s3_key }));
                if (obj.Body) {
                  const chunks: Buffer[] = [];
                  for await (const chunk of obj.Body as any) chunks.push(Buffer.from(chunk));
                  let pdfBytes = Buffer.concat(chunks);
                  
                  // Watermark via Python
                  try {
                    const { execSync } = require('child_process');
                    const tmpIn = '/tmp/wm_input_' + Date.now() + '.pdf';
                    const tmpOut = '/tmp/wm_output_' + Date.now() + '.pdf';
                    fs.writeFileSync(tmpIn, pdfBytes);
                    execSync(`python3 -c "
import sys
sys.path.insert(0, '/home/ubuntu/.openclaw/workspace/scripts')
from pdf_watermarker import watermark_pdf
with open(sys.argv[1],'rb') as f: pdf=f.read()
wm = watermark_pdf(pdf, sys.argv[2], sys.argv[3])
with open(sys.argv[4],'wb') as f: f.write(wm)
" '${tmpIn}' '${lender.lender_name.replace(/'/g, "'")}' '${appType}' '${tmpOut}'`, { timeout: 20000 });
                    if (fs.existsSync(tmpOut)) {
                      pdfBytes = fs.readFileSync(tmpOut);
                      fs.unlinkSync(tmpOut);
                    }
                    fs.unlinkSync(tmpIn);
                  } catch (wmErr: any) { 
                    logger.warn('Watermark failed', { error: String(wmErr).slice(0,100) });
                  } // watermark optional
                  
                  // Only attach if under 4MB (leave room for email overhead)
                  if (pdfBytes.length < 4 * 1024 * 1024) {
                    attachments.push({
                      name: `${business_name.replace(/[^a-zA-Z0-9]/g,'_')}-${appType}-Application.pdf`,
                      data: pdfBytes.toString('base64'),
                      content_type: 'application/pdf'
                    });
                  }
                }
              } catch (appErr) { /* continue without app PDF */ }
            }
            
            // Attach deduplicated bank statements (one per unique month)
            const allStmts = db.prepare("SELECT s3_key, s3_bucket, filename FROM contact_documents WHERE contact_id=? AND doc_type='bank_statement' ORDER BY filename").all(contactByPhone.id) as any[];
            
            // Deduplicate by month
            const monthMap: Record<string, any> = {};
            for (const d of allStmts) {
              const fn = (d.filename || '').toLowerCase();
              const mo = fn.includes('october') || fn.includes('_oct') ? 'oct'
                : fn.includes('november') || fn.includes('_nov') ? 'nov'
                : fn.includes('december') || fn.includes('_dec') ? 'dec'
                : fn.includes('january') || fn.includes('_jan') ? 'jan'
                : fn.includes('february') || fn.includes('_feb') ? 'feb'
                : null;
              if (mo && !monthMap[mo]) monthMap[mo] = d;
            }
            const uniqueStmts = Object.values(monthMap);
            
            if (uniqueStmts.length > 0) {
              const { S3Client: S3C2, GetObjectCommand: GOC2 } = await import('@aws-sdk/client-s3');
              const s3c2 = new S3C2({ region: 'us-east-1' });
              
              for (const d of uniqueStmts) {
                try {
                  const obj2 = await s3c2.send(new GOC2({ Bucket: d.s3_bucket, Key: d.s3_key }));
                  if (obj2.Body) {
                    const chunks2: Buffer[] = [];
                    for await (const chunk2 of obj2.Body as any) chunks2.push(Buffer.from(chunk2));
                    const stmtBytes = Buffer.concat(chunks2);
                    const currentRawBytes = attachments.reduce((sum, a) => sum + Math.ceil(a.data.length * 3/4), 0);
                    const wouldBeSize = currentRawBytes + stmtBytes.length;
                    logger.info('Statement attach check', { file: d.filename, stmtKB: Math.round(stmtBytes.length/1024), currentMB: (currentRawBytes/1024/1024).toFixed(2), wouldBeMB: (wouldBeSize/1024/1024).toFixed(2), pass: wouldBeSize < 4.5*1024*1024 });
                    // Watermark statement with lender name + company
                    let finalStmtBytes = stmtBytes;
                    try {
                      const tmpIn2 = '/tmp/stmt_in_' + Date.now() + '.pdf';
                      const tmpOut2 = '/tmp/stmt_out_' + Date.now() + '.pdf';
                      fs.writeFileSync(tmpIn2, stmtBytes);
                      execSync(`python3 -c "
import sys
sys.path.insert(0, '/home/ubuntu/.openclaw/workspace/scripts')
from pdf_watermarker import watermark_pdf
with open(sys.argv[1],'rb') as f: pdf=f.read()
wm = watermark_pdf(pdf, sys.argv[2], sys.argv[3])
with open(sys.argv[4],'wb') as f: f.write(wm)
" '${tmpIn2}' '${lender.lender_name.replace(/'/g, "'")}' '${appType}' '${tmpOut2}'`, { timeout: 20000 });
                      if (fs.existsSync(tmpOut2)) {
                        finalStmtBytes = fs.readFileSync(tmpOut2);
                        fs.unlinkSync(tmpOut2);
                      }
                      fs.unlinkSync(tmpIn2);
                    } catch {} // watermark optional
                    
                    // Attach all statements regardless of size - Lambda handles up to 6MB
                    attachments.push({
                      name: d.filename || 'statement.pdf',
                      data: finalStmtBytes.toString('base64'),
                      content_type: 'application/pdf'
                    });
                  }
                } catch (stmtErr: any) { 
                  logger.warn('Statement attach error', { file: d.filename, error: String(stmtErr).slice(0,100) });
                }
              }
              
              const attachedStmtNames = attachments.filter(a => a.name !== `${business_name.replace(/[^a-zA-Z0-9]/g,'_')}-${appType}-Application.pdf`).map(a => a.name);
              if (attachedStmtNames.length > 0) {
                statementLinksHtml = `<div style="margin-top:12px;padding:10px;background:#f0fdf4;border-radius:6px"><p style="font-size:12px;color:#166534;margin:0">✅ ${attachedStmtNames.length} bank statement(s) attached as PDFs (${attachedStmtNames.join(', ').slice(0,80)}${attachedStmtNames.join(', ').length > 80 ? '...' : ''})</p></div>`;
              }
            }
          }
          db.close();
        } catch (docErr: any) { /* proceed without docs */ }
        
        // Inject statement links into HTML
        const finalHtml = (submissionHtml || `<html><body><pre>${body}</pre></body></html>`).replace('</body>', statementLinksHtml + '</body>');

        // Send via CHC-SES-Sender Lambda (has SES permissions)
        const sesPayload: any = {
          to: lender.contact_email,
          from_email: 'jclaude@chccapitalgroup.com',
          cc: CC_EMAILS,
          subject: subject,
          html: finalHtml,
        };
        if (attachments.length > 0) sesPayload.attachments = attachments;
        
        // Check total payload size (Lambda 6MB limit)
        const payloadSize = JSON.stringify(sesPayload).length;
        if (payloadSize > 5 * 1024 * 1024) {
          // Too large — remove attachments, keep links only
          delete sesPayload.attachments;
        }
        
        const sesResp = await lambda.send(new InvokeCommand({
          FunctionName: 'CHC-SES-Sender',
          InvocationType: 'RequestResponse',
          Payload: Buffer.from(JSON.stringify(sesPayload)),
        }));
        const sesResult = sesResp.Payload ? JSON.parse(Buffer.from(sesResp.Payload).toString()) : {};
        if (sesResult.statusCode !== 200) throw new Error(sesResult.error || 'SES Lambda failed');
        sent++;
      } catch (emailErr: any) {
        errors.push(`${lender.lender_name}: ${emailErr.message || String(emailErr)}`);
      }
    }

    // Log offer_submitted event
    const event = {
      ts: new Date().toISOString(),
      type: 'offer_submitted',
      phone,
      business: business_name,
      lenders_count: lenders.length,
      lenders_sent: sent,
      lender_names: lenders.map((l: any) => l.lender_name),
      agent: agentName,
      notes: notes || '',
    };
    fs.appendFileSync(EVENTS_PATH, JSON.stringify(event) + '\n');

    // Also update lead_states
    const leadStates = readJsonSafe(LEAD_STATES_PATH);
    if (leadStates[phone]) {
      leadStates[phone].state = 'offer_submitted';
      leadStates[phone].last_action_at = new Date().toISOString();
      if (!leadStates[phone].history) leadStates[phone].history = [];
      leadStates[phone].history.push({
        ts: new Date().toISOString(),
        from: leadStates[phone].state,
        to: 'offer_submitted',
        notes: `Submitted to ${sent} lenders`,
      });
      fs.writeFileSync(LEAD_STATES_PATH, JSON.stringify(leadStates, null, 2));
    }

    logger.info('Offer submitted', { phone, business_name, sent, errors: errors.length });
    res.json({ sent, errors, phone, business_name });
  } catch (err) {
    logger.error('submit offer error', { err: String(err) });
    res.status(500).json({ error: String(err) });
  }
});

// ═══════════════════════════════════════════════════════════════════
// REVIEW QUEUE ENDPOINTS (contact organizer + submission review)
// ═══════════════════════════════════════════════════════════════════

import Database from 'better-sqlite3';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const CONTACT_DB_PATH = '/home/ubuntu/.openclaw/workspace/data/contact_index.db';
const S3_BUCKET = 'chc-underwriting-bank-statements-2259';
const s3Client = new S3Client({ region: 'us-east-1' });

function getDb(): Database.Database {
  return new Database(CONTACT_DB_PATH, { readonly: true, fileMustExist: true });
}

function getDbRW(): Database.Database {
  return new Database(CONTACT_DB_PATH, { fileMustExist: true });
}

function priorityOrder(p: string): number {
  const order: Record<string, number> = {
    hyper: 0, docs_received: 1, urgent: 2, interested: 3, warm: 4, cold: 5, pending: 6
  };
  return order[p] ?? 99;
}

// ─── GET /review-queue ──────────────────────────────────────────
pipelineRouter.get('/review-queue', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const contacts = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM contact_documents WHERE contact_id = c.id) AS doc_count,
        (SELECT MAX(ts) FROM contact_communications WHERE contact_id = c.id) AS last_activity,
        (SELECT message FROM contact_communications WHERE contact_id = c.id ORDER BY ts DESC LIMIT 1) AS last_message
      FROM contacts c
      ORDER BY
        CASE c.priority
          WHEN 'hyper' THEN 0
          WHEN 'docs_received' THEN 1
          WHEN 'urgent' THEN 2
          WHEN 'interested' THEN 3
          WHEN 'warm' THEN 4
          ELSE 5
        END,
        c.created_at DESC
    `).all();

    db.close();
    res.json({ contacts, total: contacts.length });
  } catch (err) {
    logger.error('review-queue error', { err: String(err) });
    res.status(500).json({ error: String(err) });
  }
});

// ─── GET /review/:contactId ─────────────────────────────────────
pipelineRouter.get('/review/:contactId', async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;
    const db = getDb();

    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contactId) as any;
    if (!contact) {
      db.close();
      return res.status(404).json({ error: 'Contact not found' });
    }

    const documents = db.prepare('SELECT * FROM contact_documents WHERE contact_id = ? ORDER BY doc_type, uploaded_at').all(contactId);
    const communications = db.prepare('SELECT * FROM contact_communications WHERE contact_id = ? ORDER BY ts ASC').all(contactId);
    db.close();

    // Generate presigned URLs for all documents
    const docsWithUrls = await Promise.all(
      (documents as any[]).map(async (doc: any) => {
        try {
          const url = await getSignedUrl(s3Client, new GetObjectCommand({
            Bucket: doc.s3_bucket || S3_BUCKET,
            Key: doc.s3_key,
          }), { expiresIn: 3600 });
          // Use proxy URL instead of raw S3 presigned (fixes mobile PDF loading)
          const proxyUrl = `/app/api/v1/pipeline/doc/${doc.id}?key=${encodeURIComponent(doc.s3_key || '')}&bucket=${doc.s3_bucket || ''}`;
          return { ...doc, presigned_url: proxyUrl, direct_url: url };
        } catch {
          return { ...doc, presigned_url: null };
        }
      })
    );

    // Run lender match if contact has profile data
    let lenderMatches: any[] = [];
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
          m.application_type = getApplicationType(m.lender_id || m.id || '', m.lender_name || m.name || '', m.notes);
        });
      }
    } catch (e) {
      logger.warn('Lender match failed for review', { contactId, err: String(e) });
    }

    // Pull hyper mode analysis from events
    let statementAnalysis = null;
    const hyperEvents = readJsonlSafe(EVENTS_PATH).filter(
      (e: any) => e.phone === contact.phone && e.type === 'hyper_mode_triggered'
    );
    if (hyperEvents.length > 0) {
      const lastHyper = hyperEvents[hyperEvents.length - 1];
      statementAnalysis = {
        avg_revenue: lastHyper.avg_revenue || lastHyper.analysis?.avg_revenue,
        negative_days: lastHyper.negative_days || lastHyper.analysis?.negative_days,
        red_flags: lastHyper.red_flags || lastHyper.analysis?.red_flags,
        position: lastHyper.position || lastHyper.analysis?.position,
        raw: lastHyper.analysis || lastHyper.notes,
      };
    }

    // Parse GHL tags
    let tags: string[] = [];
    try { tags = JSON.parse(contact.ghl_tags || '[]'); } catch {}

    res.json({
      contact: { ...contact, tags },
      documents: docsWithUrls,
      communications,
      lender_matches: lenderMatches,
      statement_analysis: statementAnalysis,
    });
  } catch (err) {
    logger.error('review detail error', { err: String(err) });
    res.status(500).json({ error: String(err) });
  }
});

// ─── POST /review/:contactId/approve ────────────────────────────
pipelineRouter.post('/review/:contactId/approve', async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;
    const { lenders, notes, agent } = req.body;

    if (!lenders || !Array.isArray(lenders) || lenders.length === 0) {
      return res.status(400).json({ error: 'lenders[] required' });
    }

    const db = getDb();
    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contactId) as any;
    if (!contact) {
      db.close();
      return res.status(404).json({ error: 'Contact not found' });
    }
    const documents = db.prepare('SELECT * FROM contact_documents WHERE contact_id = ?').all(contactId) as any[];
    db.close();

    const agentName = agent || 'Jacob Claude';
    const results: any[] = [];

    for (const lender of lenders) {
      const appType = lender.app_type || getApplicationType(
        lender.lender_id || '', lender.lender_name || '', notes
      );

      // Find the right application PDF
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
        // Watermark PDFs per lender
        const docsToSend = [...(appDoc ? [appDoc] : []), ...bankStmts];
        let watermarkedPaths: string[] = [];

        for (const doc of docsToSend) {
          try {
            const watermarkArgs = JSON.stringify({
              s3_bucket: doc.s3_bucket || S3_BUCKET,
              s3_key: doc.s3_key,
              lender_name: lender.lender_name || 'Unknown',
              output_dir: '/tmp/watermarked',
            });
            execSync(`python3 /home/ubuntu/.openclaw/workspace/scripts/pdf_watermarker.py '${watermarkArgs.replace(/'/g, "\\'")}'`, { timeout: 30000 });
            watermarkedPaths.push(`/tmp/watermarked/${doc.filename}`);
          } catch (wErr) {
            logger.warn('Watermark failed', { doc: doc.filename, err: String(wErr) });
          }
        }

        // Build attachments as base64
        const attachments: any[] = [];
        for (const wp of watermarkedPaths) {
          try {
            if (fs.existsSync(wp)) {
              const data = fs.readFileSync(wp);
              attachments.push({
                filename: path.basename(wp),
                content: data.toString('base64'),
                contentType: 'application/pdf',
              });
            }
          } catch {}
        }

        // Send via CHC-SES-Sender Lambda
        const sesPayload = {
          to: lender.contact_email,
          from_email: 'jclaude@chccapitalgroup.com',
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
          error: sesResult.statusCode !== 200 ? (sesResult.error || 'Unknown error') : null,
        });
      } catch (emailErr: any) {
        results.push({
          lender_name: lender.lender_name,
          status: 'error',
          error: emailErr.message || String(emailErr),
        });
      }
    }

    // Log submission event
    const event = {
      ts: new Date().toISOString(),
      type: 'submission_approved',
      contact_id: contactId,
      phone: contact.phone,
      business: contact.business,
      lenders: lenders.map((l: any) => l.lender_name),
      results,
      agent: agentName,
      notes: notes || '',
    };
    fs.appendFileSync(EVENTS_PATH, JSON.stringify(event) + '\n');

    // Update contact status in SQLite
    try {
      const rwDb = getDbRW();
      rwDb.prepare('UPDATE contacts SET status = ? WHERE id = ?').run('submitted', contactId);
      rwDb.close();
    } catch {}

    const sentCount = results.filter(r => r.status === 'sent').length;
    logger.info('Review approved', { contactId, sent: sentCount, total: lenders.length });
    res.json({ ok: true, results, sent: sentCount, total: lenders.length });
  } catch (err) {
    logger.error('review approve error', { err: String(err) });
    res.status(500).json({ error: String(err) });
  }
});
