import { Router, Request, Response } from 'express';
import fs from 'fs';
import { execSync } from 'child_process';
import { logger } from '../logger';

export const documentsRouter = Router();

documentsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    // S3 bank statements
    let s3Files: any[] = [];
    try {
      const raw = execSync('aws s3 ls s3://chc-lendingtree-logs/bank-statements/ --recursive 2>/dev/null || true', {
        timeout: 10000, encoding: 'utf-8',
      });
      s3Files = raw.trim().split('\n').filter(Boolean).map(line => {
        const parts = line.trim().split(/\s+/);
        return { date: parts[0], time: parts[1], size: parseInt(parts[2] || '0'), key: parts.slice(3).join(' ') };
      }).filter(f => f.key);
    } catch {}

    // docs_received events
    const docsEvents: any[] = [];
    for (const ws of ['/home/ubuntu/.openclaw/workspace-jacob', '/home/ubuntu/.openclaw/workspace-angie']) {
      const evPath = `${ws}/pipeline/logs/events.jsonl`;
      if (!fs.existsSync(evPath)) continue;
      const lines = fs.readFileSync(evPath, 'utf-8').trim().split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const ev = JSON.parse(line);
          if (ev.type === 'docs_received' || ev.type === 'state_transition' && ev.to === 'docs_received') {
            docsEvents.push({ ...ev, agent: ws.includes('angie') ? 'angie' : 'jacob' });
          }
        } catch {}
      }
    }

    res.json({
      s3Documents: s3Files.slice(-50),
      docsEvents: docsEvents.slice(-50),
      totalS3: s3Files.length,
      totalEvents: docsEvents.length,
    });
  } catch (err) {
    logger.error('documents error', { err });
    res.status(500).json({ error: String(err) });
  }
});
