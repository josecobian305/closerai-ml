import { Router, Request, Response } from 'express';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import * as fs from 'fs';

const lambdaClient = new LambdaClient({ region: 'us-east-1' });

const JACOB_LOGS = '/home/ubuntu/.openclaw/workspace-jacob/pipeline/logs';
const ANGIE_LOGS = '/home/ubuntu/.openclaw/workspace-angie/pipeline/logs';

const ANGLES: Record<string, {
  id: string; name: string; agent: string; template: string;
  best_day_range: string; tone: string; channel: string; industry_variants?: Record<string,string>;
}> = {
  A: { id: 'A', name: 'Approvals on File', agent: 'both', template: "We have your 2026 approval on file. To access the funds, we need your info updated + last 4 months of statements.", best_day_range: '1-3', tone: 'urgent', channel: 'sms' },
  B: { id: 'B', name: 'Q1/Q2 Seasonal Window', agent: 'both', template: "Q1 approvals just opened up. [Industry] businesses are getting funded fast right now — your file's ready.", best_day_range: '1-3', tone: 'urgent', channel: 'sms' },
  C: { id: 'C', name: 'Industry Specific', agent: 'both', template: "Hey [Name], a lot of [industry] businesses are using capital right now for [use_case] — your profile looks strong. Want me to put your file together?", best_day_range: '1-3', tone: 'warm', channel: 'both',
    industry_variants: { Construction: 'materials, equipment, payroll bridge, contracts', Restaurant: 'renovations, equipment, staff, busy season prep', 'Auto/Transport': 'fleet, inventory, repairs', Retail: 'inventory, build-out, seasonal stock', 'Salon/Beauty': 'build-out, equipment, spring season', Healthcare: 'equipment, expansion', Default: 'grow revenue, hire, expand' }
  },
  D: { id: 'D', name: 'File Expiring', agent: 'jacob', template: "Your file at CHC Capital is about to go inactive. Before I close it — still looking for capital?", best_day_range: '1-7', tone: 'scarcity', channel: 'sms' },
  E: { id: 'E', name: 'I Pulled Your File', agent: 'jacob', template: "I pulled your file today — it looks strong. Just need last 4 months of statements to get you in front of our underwriters.", best_day_range: '4-7', tone: 'authority', channel: 'sms' },
  F: { id: 'F', name: 'Serious Business Owners Only', agent: 'jacob', template: "We work with business owners focused on growth, not haggling over fractions of a point. Your profile fits. Want to move on this?", best_day_range: '4-7', tone: 'selective', channel: 'sms' },
  G: { id: 'G', name: 'ROI Reframe', agent: 'both', template: "If putting $50K to work brings you $8K more per month — does the rate really matter? That's the math we focus on.", best_day_range: '8-14', tone: 'logical', channel: 'both' },
  H: { id: 'H', name: 'MTD Direct Ask', agent: 'both', template: "Need your last 4 months of statements + screenshots of all transactions from the 1st of this month to today. Text or email them and I'll put the file together same day.", best_day_range: '8-14', tone: 'direct', channel: 'both' },
  I: { id: 'I', name: 'Gloves Off (NY Energy)', agent: 'jacob', template: "I'm going to be straight — your file is solid, the money is there. You either want to grow the business or you don't. Send me the statements and let's close this.", best_day_range: '15-20', tone: 'aggressive', channel: 'sms' },
  J: { id: 'J', name: 'Nuclear Last Touch', agent: 'both', template: "Last time I'm reaching out on this. We have the approval and the lenders. Just need your statements. After this I'm moving the file. Your call.", best_day_range: '21+', tone: 'final', channel: 'sms' },
};

const CAMPAIGNS = [
  { id: 'jacob_hot', name: 'Jacob — Hot Leads (0-21 days)', agent: 'jacob', tier: 'hot', description: 'LendingTree + direct leads, last 3 weeks. Aggressive cadence.', sequence_days: 20, angles_rotation: ['A','B','C','D','E','F','G','H','I','J'], channels: ['sms','email'], persona: 'Head of Processing — direct lender, $20M', goal: 'Bank statements + application submitted', status: 'active' },
  { id: 'jacob_old', name: 'Jacob — Old Leads (21+ days)', agent: 'jacob', tier: 'old', description: 'Leads that went cold. Re-engagement focus.', sequence_days: 20, angles_rotation: ['A','C','G','H','I','J'], channels: ['sms','email'], persona: 'Head of Processing — reference history', goal: 'Re-qualify then collect docs', status: 'active' },
  { id: 'angie_hot', name: 'Angie — Hot Leads (0-21 days)', agent: 'angie', tier: 'hot', description: 'Parallel hot lead cadence, warmer tone.', sequence_days: 20, angles_rotation: ['A','B','C','G','H','J'], channels: ['sms','email'], persona: 'Processing Officer — empathetic, relationship-first', goal: 'Bank statements + application submitted', status: 'active' },
  { id: 'angie_old', name: 'Angie — Old Leads (21+ days)', agent: 'angie', tier: 'old', description: 'Old leads under Angie persona. Softer re-engagement.', sequence_days: 20, angles_rotation: ['A','B','C','G','H','J'], channels: ['sms','email'], persona: 'Processing Officer — warm check-in', goal: 'Re-engage, then collect docs', status: 'active' },
];

const ESCALATION_LADDER = [
  { days: '1-3',   angles: ['A','B','C','D'], tone: 'Warm, industry-relevant, approvals framing' },
  { days: '4-7',   angles: ['E','F'],          tone: 'Authority, selectivity frame' },
  { days: '8-14',  angles: ['G','H'],          tone: 'ROI reframe + direct doc ask' },
  { days: '15-20', angles: ['I'],              tone: 'NY energy — direct, no more massaging' },
  { days: '21+',   angles: ['J'],              tone: 'Nuclear last touch, then archive' },
];

const CADENCE_PHASES = [
  { label: 'Days 1-3',   touches: 12, desc: 'Max aggression — strike while warm',       color: '#ef4444' },
  { label: 'Days 4-7',   touches: 9,  desc: 'Authority frame, confidence push',          color: '#f97316' },
  { label: 'Days 8-14',  touches: 7,  desc: 'ROI logic, direct doc ask',                color: '#eab308' },
  { label: 'Days 15-20', touches: 5,  desc: 'Final push, NY energy, nuclear',            color: '#22c55e' },
];

async function getLiveStats() {
  try {
    const payload = Buffer.from(JSON.stringify({ action: 'stats' }));
    const cmd = new InvokeCommand({ FunctionName: 'SequenceEngine', InvocationType: 'RequestResponse', Payload: payload });
    const resp = await lambdaClient.send(cmd);
    if (resp.Payload) {
      const result = JSON.parse(Buffer.from(resp.Payload).toString());
      if (result?.stats) return result;
    }
  } catch (e) {
    // silently fail
  }
  return null;
}

export const campaignsRouter = Router();

campaignsRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  const liveResult = await getLiveStats();
  const live_stats = liveResult?.stats ?? { active: null, cooling: null, funded: null, total_scanned: null, agents: {}, error: 'Lambda unavailable' };
  res.json({ campaigns: CAMPAIGNS, live_stats, escalation_ladder: ESCALATION_LADDER, total_campaigns: CAMPAIGNS.length });
});

campaignsRouter.get('/angles', (_req: Request, res: Response): void => {
  const agentFilter = (_req.query.agent as string) || 'all';
  const angles = Object.values(ANGLES).filter(a => agentFilter === 'all' || a.agent === agentFilter || a.agent === 'both');
  res.json({ angles, count: angles.length });
});

campaignsRouter.get('/sequence-stats', async (_req: Request, res: Response): Promise<void> => {
  const liveResult = await getLiveStats();
  if (liveResult?.by_day) {
    res.json({ by_day: liveResult.by_day, recent_active: liveResult.recent_active ?? [], total_active: liveResult.total_active ?? 0 });
    return;
  }
  res.json({ by_day: [], recent_active: [], total_active: 0, error: 'Lambda unavailable' });
});

campaignsRouter.get('/cadence', (_req: Request, res: Response): void => {
  res.json({ phases: CADENCE_PHASES, escalation_ladder: ESCALATION_LADDER });
});

campaignsRouter.get('/hyper', async (_req: Request, res: Response): Promise<void> => {
  const hyper: Record<string, any> = {};

  // 1. Read hyper_queue.jsonl
  for (const logDir of [JACOB_LOGS, ANGIE_LOGS]) {
    const queueFile = `${logDir}/hyper_queue.jsonl`;
    if (fs.existsSync(queueFile)) {
      const lines = fs.readFileSync(queueFile, 'utf-8').split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const e = JSON.parse(line);
          const phone = e.phone || '';
          if (!phone) continue;
          if (!hyper[phone]) {
            hyper[phone] = { ...e, triggers: 0, last_trigger: e.flagged_at || e.triggered_at || '' };
          }
          hyper[phone].triggers = (hyper[phone].triggers || 0) + 1;
          if ((e.triggered_at || e.flagged_at || '') > hyper[phone].last_trigger) {
            hyper[phone].last_trigger = e.triggered_at || e.flagged_at;
          }
        } catch {}
      }
    }

    // 2. Pull hyper_mode_triggered events from events.jsonl
    const eventsFile = `${logDir}/events.jsonl`;
    if (fs.existsSync(eventsFile)) {
      const content = fs.readFileSync(eventsFile, 'utf-8');
      const lines = content.split('\n').filter(Boolean);
      // Only look at last 200 lines for speed
      const recent = lines.slice(-200);
      for (const line of recent) {
        try {
          const e = JSON.parse(line);
          if (e.type !== 'hyper_mode_triggered') continue;
          const phone = e.phone || '';
          if (!phone) continue;
          if (!hyper[phone]) {
            hyper[phone] = {
              phone,
              name: e.merchant || '',
              business: e.business || '',
              status: 'hyper_active',
              triggers: 0,
              last_trigger: e.ts || '',
              red_flags: [],
              analysis_status: e.analysis_status || '',
              email_subject: e.subject || '',
            };
          }
          hyper[phone].triggers = (hyper[phone].triggers || 0) + 1;
          if ((e.ts || '') > hyper[phone].last_trigger) {
            hyper[phone].last_trigger = e.ts;
            if (e.subject) hyper[phone].email_subject = e.subject;
            if (e.red_flags) hyper[phone].red_flags = e.red_flags;
            if (e.analysis_status) hyper[phone].analysis_status = e.analysis_status;
          }
        } catch {}
      }
    }

    // 3. Pull docs_received state transitions
    const stateFile = `${logDir}/events.jsonl`;
    if (fs.existsSync(stateFile)) {
      const lines = fs.readFileSync(stateFile, 'utf-8').split('\n').filter(Boolean).slice(-300);
      for (const line of lines) {
        try {
          const e = JSON.parse(line);
          if (e.type !== 'state_transition') continue;
          if (!['docs_received', 'docs_reviewed', 'app_fields_needed'].includes(e.to_state || '')) continue;
          const phone = e.phone || '';
          if (!phone) continue;
          if (!hyper[phone]) {
            hyper[phone] = {
              phone,
              name: '',
              business: '',
              status: 'hyper_active',
              triggers: 1,
              last_trigger: e.ts || '',
              red_flags: [],
              state: e.to_state,
              notes: e.notes || '',
            };
          } else {
            if ((e.ts || '') > hyper[phone].last_trigger) {
              hyper[phone].state = e.to_state;
              hyper[phone].notes = e.notes || hyper[phone].notes || '';
            }
          }
        } catch {}
      }
    }
  }

  const list = Object.values(hyper).sort((a: any, b: any) =>
    (b.last_trigger || '').localeCompare(a.last_trigger || '')
  );

  res.json({ hyper: list, count: list.length });
});
