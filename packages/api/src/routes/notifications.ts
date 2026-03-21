import { Router, Request, Response } from 'express';
import fs from 'fs';
import { logger } from '../logger';

export const notificationsRouter = Router();

const IMPORTANT_TYPES = new Set([
  'hyper_mode_triggered', 'state_transition', 'auto_reply', 'docs_received',
  'reply_classified', 'email_sent', 'voice_note_sent',
]);

function readJsonl(path: string): any[] {
  try {
    if (!fs.existsSync(path)) return [];
    return fs.readFileSync(path, 'utf-8').trim().split('\n').filter(Boolean)
      .map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

notificationsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const allEvents: any[] = [];
    for (const ws of ['/home/ubuntu/.openclaw/workspace-jacob', '/home/ubuntu/.openclaw/workspace-angie']) {
      const events = readJsonl(`${ws}/pipeline/logs/events.jsonl`);
      const agent = ws.includes('angie') ? 'angie' : 'jacob';
      for (const ev of events) {
        if (!IMPORTANT_TYPES.has(ev.type)) continue;
        // Filter: state_transition only for important states
        if (ev.type === 'state_transition' && !['docs_received', 'funded', 'hot'].includes(ev.to)) continue;
        // Filter: auto_reply only INTERESTED
        if (ev.type === 'auto_reply' && ev.category !== 'INTERESTED' && ev.classification !== 'interested') continue;
        allEvents.push({ ...ev, agent });
      }
    }
    allEvents.sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
    res.json({ notifications: allEvents.slice(0, 50), total: allEvents.length });
  } catch (err) {
    logger.error('notifications error', { err });
    res.status(500).json({ error: String(err) });
  }
});
