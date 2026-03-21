import { Router, Request, Response } from 'express';
import { listContacts } from '../ghl';
import { computeSmsStats } from '../sms';
import { logger } from '../logger';

/** Dashboard stats payload */
export interface DashboardStats {
  totalContacts: number;
  smsSentToday: number;
  smsSentTotal: number;
  repliesTotal: number;
  repliesByCategory: Record<string, number>;
  agentStats: Array<{
    agent: string;
    sentToday: number;
    sentTotal: number;
    repliesTotal: number;
  }>;
  asOf: string;
}

export const statsRouter = Router();

/**
 * GET /api/v1/stats
 * Returns live dashboard numbers: GHL total contacts + SMS stats.
 */
statsRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [ghlResult, agentStats] = await Promise.all([
      listContacts({ limit: 1 }),
      computeSmsStats(),
    ]);

    const smsSentToday = agentStats.reduce((sum, a) => sum + a.sentToday, 0);
    const smsSentTotal = agentStats.reduce((sum, a) => sum + a.sentTotal, 0);
    const repliesTotal = agentStats.reduce((sum, a) => sum + a.repliesTotal, 0);

    const repliesByCategory: Record<string, number> = {};
    for (const a of agentStats) {
      for (const [cat, count] of Object.entries(a.repliesRepliedCategory)) {
        repliesByCategory[cat] = (repliesByCategory[cat] ?? 0) + count;
      }
    }

    const stats: DashboardStats = {
      totalContacts: ghlResult.meta?.total ?? 0,
      smsSentToday,
      smsSentTotal,
      repliesTotal,
      repliesByCategory,
      agentStats: agentStats.map(({ agent, sentToday, sentTotal, repliesTotal }) => ({
        agent,
        sentToday,
        sentTotal,
        repliesTotal,
      })),
      asOf: new Date().toISOString(),
    };

    res.json(stats);
  } catch (err) {
    logger.error('stats route error', { err });
    res.status(500).json({ error: String(err) });
  }
});
