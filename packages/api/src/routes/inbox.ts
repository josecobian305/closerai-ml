import { Router, Request, Response } from 'express';
import fs from 'fs';
import { logger } from '../logger';

export const inboxRouter = Router();

const AGENTS = [
  { name: 'jacob', workspace: '/home/ubuntu/.openclaw/workspace-jacob' },
  { name: 'angie', workspace: '/home/ubuntu/.openclaw/workspace-angie' },
];

function readJsonl(path: string): any[] {
  try {
    if (!fs.existsSync(path)) return [];
    return fs.readFileSync(path, 'utf-8').trim().split('\n').filter(Boolean)
      .map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

inboxRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const allReplies: any[] = [];
    for (const agent of AGENTS) {
      const replies = readJsonl(`${agent.workspace}/pipeline/logs/replies.jsonl`);
      replies.forEach(r => allReplies.push({ ...r, agent: agent.name }));
    }
    allReplies.sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
    res.json({ replies: allReplies.slice(0, 50), total: allReplies.length });
  } catch (err) {
    logger.error('inbox error', { err });
    res.status(500).json({ error: String(err) });
  }
});
