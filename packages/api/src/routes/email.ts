import { Router, Request, Response } from 'express';
import { execSync } from 'child_process';
import { logger } from '../logger';

export const emailRouter = Router();

emailRouter.get('/inbox', async (_req: Request, res: Response) => {
  try {
    const raw = execSync('himalaya --output json envelope list --page-size 30', {
      timeout: 15000, encoding: 'utf-8',
    });
    const emails = JSON.parse(raw);
    const enriched = (Array.isArray(emails) ? emails : []).map((e: any) => ({
      ...e,
      isStatement: /bank|statement|attached|statements/i.test(e.subject || ''),
    }));
    res.json({ emails: enriched, total: enriched.length });
  } catch (err: any) {
    logger.error('email inbox error', { err: err.message || err });
    res.json({ emails: [], total: 0, error: 'Failed to fetch emails' });
  }
});
