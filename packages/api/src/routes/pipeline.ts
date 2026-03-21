import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
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
const ses = new SESClient({ region: 'us-east-1' });

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
    res.json({ ok: true, phone, stage: to_stage });
  } catch (err) {
    logger.error('pipeline advance error', { err: String(err) });
    res.status(500).json({ error: String(err) });
  }
});

// ─── GET /lender-match/:phone ───────────────────────────────────
pipelineRouter.get('/lender-match/:phone', async (req: Request, res: Response) => {
  try {
    const phone = req.params.phone.startsWith('+') ? req.params.phone : `+${req.params.phone}`;

    let result: string;
    try {
      result = execSync(
        `python3 ${LENDER_MATCH_SCRIPT} --phone "${phone}" 2>/dev/null || python3 ${LENDER_MATCH_SCRIPT} 2>/dev/null`,
        { timeout: 30000, encoding: 'utf-8' }
      );
    } catch (e: any) {
      result = e.stdout || '{}';
    }

    // Try to parse JSON from the output
    let parsed: any = {};
    try {
      // Find JSON in output (may have text before/after)
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch {
      parsed = { raw: result.slice(0, 2000) };
    }

    // Add application type info to each lender
    if (parsed.matches && Array.isArray(parsed.matches)) {
      for (const match of parsed.matches) {
        match.application_type = getApplicationType(
          match.lender_id || match.id || '',
          match.lender_name || match.name || '',
          match.notes
        );
      }
    }

    res.json({
      phone,
      ...parsed,
    });
  } catch (err) {
    logger.error('lender match error', { err: String(err) });
    res.status(500).json({ error: String(err) });
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
        await ses.send(new SendEmailCommand({
          Source: FROM_EMAIL,
          Destination: {
            ToAddresses: [lender.contact_email],
            CcAddresses: CC_EMAILS,
          },
          Message: {
            Subject: { Data: subject },
            Body: { Text: { Data: body } },
          },
        }));
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
