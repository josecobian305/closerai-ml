import { Router, Request, Response } from 'express';
import fs from 'fs';
import { logger } from '../logger';

export const dashboardRouter = Router();

const AGENTS = [
  { name: 'jacob', workspace: '/home/ubuntu/.openclaw/workspace-jacob' },
  { name: 'angie', workspace: '/home/ubuntu/.openclaw/workspace-angie' },
];

function readJsonl(path: string, limit?: number): any[] {
  try {
    if (!fs.existsSync(path)) return [];
    const lines = fs.readFileSync(path, 'utf-8').trim().split('\n').filter(Boolean);
    const arr = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    if (limit) return arr.slice(-limit);
    return arr;
  } catch { return []; }
}

function readJson(path: string): any {
  try { return fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, 'utf-8')) : null; } catch { return null; }
}

dashboardRouter.get('/', async (_req: Request, res: Response) => {
  try {
    // KPIs
    const today = new Date().toISOString().slice(0, 10);
    let totalSmsToday = 0;
    let totalReplies = 0;
    let totalSends = 0;
    let hyperCount = 0;
    let activeSequences = 0;
    const allEvents: any[] = [];
    const allWeights: any[] = [];

    for (const agent of AGENTS) {
      const sends = readJsonl(`${agent.workspace}/pipeline/logs/sends.jsonl`);
      const events = readJsonl(`${agent.workspace}/pipeline/logs/events.jsonl`);
      const replies = readJsonl(`${agent.workspace}/pipeline/logs/replies.jsonl`);

      totalSends += sends.length;
      totalSmsToday += sends.filter((s: any) => s.ts?.startsWith(today)).length;
      totalReplies += replies.length;
      hyperCount += events.filter((e: any) => e.type === 'hyper_mode_triggered').length;
      activeSequences += sends.filter((s: any) => {
        if (!s.ts) return false;
        const d = new Date(s.ts);
        return Date.now() - d.getTime() < 7 * 86400000;
      }).length;

      // Collect last events for activity feed
      events.slice(-30).forEach((e: any) => allEvents.push({ ...e, agent: agent.name }));

      // Weights
      const w = readJson(`${agent.workspace}/pipeline/weights.json`);
      if (w?.weights) {
        allWeights.push({ agent: agent.name, weights: w.weights, ranking: w.ranking, top_3: w.top_3 });
      }
    }

    const replyRate = totalSends > 0 ? Math.round((totalReplies / totalSends) * 1000) / 10 : 0;

    // Activity feed: last 20, sorted newest first
    allEvents.sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
    const activityFeed = allEvents.slice(0, 20);

    // Top angles
    const topAngles = allWeights.length > 0 ? allWeights[0] : null;

    res.json({
      kpis: {
        totalContacts: totalSends,
        smsToday: totalSmsToday,
        replyRate,
        activeSequences: Math.min(activeSequences, totalSends),
        hyperCount,
      },
      activityFeed,
      topAngles,
    });
  } catch (err) {
    logger.error('dashboard error', { err });
    res.status(500).json({ error: String(err) });
  }
});
