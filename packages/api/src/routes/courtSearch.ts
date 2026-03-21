import { Router, Request, Response } from 'express';
import { execSync } from 'child_process';
import { logger } from '../logger';

export const courtSearchRouter = Router();

courtSearchRouter.get('/', async (req: Request, res: Response) => {
  const query = (req.query.q as string || '').trim();
  if (!query) {
    return res.json({ results: [], query: '', error: 'No query provided' });
  }
  try {
    const raw = execSync(
      `python3 /home/ubuntu/.openclaw/workspace/scripts/court_search.py "${query.replace(/"/g, '\\"')}"`,
      { timeout: 30000, encoding: 'utf-8' }
    );
    let results;
    try { results = JSON.parse(raw); } catch { results = { raw: raw.trim() }; }
    res.json({ results, query });
  } catch (err: any) {
    logger.error('court search error', { err: err.message });
    res.json({ results: [], query, error: err.message || 'Search failed' });
  }
});
