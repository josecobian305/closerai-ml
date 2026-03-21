import { Router, Request, Response } from 'express';
import fs from 'fs';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { logger } from '../logger';

export const dealsRouter = Router();

const LEAD_STATES_PATH = '/home/ubuntu/.openclaw/workspace-jacob/pipeline/logs/lead_states.json';

dealsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const funded: any[] = [];

    // From lead_states.json
    if (fs.existsSync(LEAD_STATES_PATH)) {
      const raw = JSON.parse(fs.readFileSync(LEAD_STATES_PATH, 'utf-8'));
      for (const [phone, data] of Object.entries(raw) as any) {
        if (data.state === 'funded') {
          funded.push({ phone, ...data });
        }
      }
    }

    // From events - funded transitions
    for (const ws of ['/home/ubuntu/.openclaw/workspace-jacob', '/home/ubuntu/.openclaw/workspace-angie']) {
      const evPath = `${ws}/pipeline/logs/events.jsonl`;
      if (!fs.existsSync(evPath)) continue;
      const lines = fs.readFileSync(evPath, 'utf-8').trim().split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const ev = JSON.parse(line);
          if (ev.type === 'state_transition' && ev.to === 'funded' && !funded.find(f => f.phone === ev.phone)) {
            funded.push({ phone: ev.phone, business: ev.business, ts: ev.ts, agent: ws.includes('angie') ? 'angie' : 'jacob' });
          }
        } catch {}
      }
    }

    // Lambda stats
    let lambdaStats: any = null;
    try {
      const lambda = new LambdaClient({ region: 'us-east-1' });
      const resp = await lambda.send(new InvokeCommand({
        FunctionName: 'SequenceEngine',
        Payload: Buffer.from(JSON.stringify({ action: 'stats' })),
      }));
      lambdaStats = JSON.parse(Buffer.from(resp.Payload!).toString());
    } catch (e: any) {
      logger.warn('Lambda stats failed', { err: e.message });
    }

    res.json({ deals: funded, total: funded.length, lambdaStats });
  } catch (err) {
    logger.error('deals error', { err });
    res.status(500).json({ error: String(err) });
  }
});
