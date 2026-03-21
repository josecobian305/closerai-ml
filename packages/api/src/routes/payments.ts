import { Router, Request, Response } from 'express';
import fs from 'fs';
import { logger } from '../logger';

export const paymentsRouter = Router();

function readJsonl(path: string): any[] {
  try {
    if (!fs.existsSync(path)) return [];
    return fs.readFileSync(path, 'utf-8').trim().split('\n').filter(Boolean)
      .map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

paymentsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    // Check for call_log.jsonl in various locations
    const possiblePaths = [
      '/home/ubuntu/.openclaw/workspace/call_log.jsonl',
      '/home/ubuntu/.openclaw/workspace-jacob/pipeline/logs/call_log.jsonl',
      '/home/ubuntu/.openclaw/workspace/dashboard/call_log.jsonl',
    ];

    let callLog: any[] = [];
    for (const p of possiblePaths) {
      const data = readJsonl(p);
      if (data.length > 0) { callLog = data; break; }
    }

    res.json({
      callLog: callLog.slice(-30),
      totalCalls: callLog.length,
      apiPayEnabled: false,
      apiPayMessage: 'apiPay ACH Ledger — coming soon',
    });
  } catch (err) {
    logger.error('payments error', { err });
    res.status(500).json({ error: String(err) });
  }
});
