import { Router, Request, Response } from 'express';
import fs from 'fs';
import { execSync } from 'child_process';
import { logger } from '../logger';

export const reportsRouter = Router();

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

reportsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const agentData: any[] = [];
    const dailyVolumes: Record<string, Record<string, number>> = {};
    const dailyReplies: Record<string, Record<string, number>> = {};

    for (const agent of AGENTS) {
      const sends = readJsonl(`${agent.workspace}/pipeline/logs/sends.jsonl`);
      const replies = readJsonl(`${agent.workspace}/pipeline/logs/replies.jsonl`);
      const weightsRaw = fs.existsSync(`${agent.workspace}/pipeline/weights.json`)
        ? JSON.parse(fs.readFileSync(`${agent.workspace}/pipeline/weights.json`, 'utf-8'))
        : null;

      // Daily volumes (last 14 days)
      for (const s of sends) {
        const day = (s.ts || '').slice(0, 10);
        if (!day) continue;
        if (!dailyVolumes[day]) dailyVolumes[day] = {};
        dailyVolumes[day][agent.name] = (dailyVolumes[day][agent.name] || 0) + 1;
      }

      for (const r of replies) {
        const day = (r.ts || '').slice(0, 10);
        if (!day) continue;
        if (!dailyReplies[day]) dailyReplies[day] = {};
        dailyReplies[day][agent.name] = (dailyReplies[day][agent.name] || 0) + 1;
      }

      agentData.push({
        agent: agent.name,
        totalSends: sends.length,
        totalReplies: replies.length,
        replyRate: sends.length > 0 ? Math.round((replies.length / sends.length) * 1000) / 10 : 0,
        weights: weightsRaw?.weights || null,
        ranking: weightsRaw?.ranking || null,
        top3: weightsRaw?.top_3 || null,
      });
    }

    // Build 14-day chart data
    const days = Object.keys({ ...dailyVolumes, ...dailyReplies }).sort().slice(-14);
    const chartData = days.map(day => ({
      date: day,
      jacobSends: dailyVolumes[day]?.jacob || 0,
      angieSends: dailyVolumes[day]?.angie || 0,
      jacobReplies: dailyReplies[day]?.jacob || 0,
      angieReplies: dailyReplies[day]?.angie || 0,
    }));

    res.json({ agents: agentData, chartData, days: chartData.length });
  } catch (err) {
    logger.error('reports error', { err });
    res.status(500).json({ error: String(err) });
  }
});

reportsRouter.post('/retrain', async (_req: Request, res: Response) => {
  const script = '/home/ubuntu/.openclaw/workspace-jacob/pipeline/ml_weight_engine.py';
  if (!fs.existsSync(script)) {
    return res.status(404).json({ error: 'ml_weight_engine.py not found' });
  }
  try {
    const output = execSync(`cd /home/ubuntu/.openclaw/workspace-jacob/pipeline && python3 ml_weight_engine.py 2>&1`, {
      timeout: 60000, encoding: 'utf-8',
    });
    res.json({ success: true, output: output.slice(0, 2000) });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});
