import { Router, Request, Response } from 'express';
import fs from 'fs';
import { logger } from '../logger';

/** Agent status descriptor */
export interface AgentStatus {
  name: string;
  displayName: string;
  workspacePath: string;
  logPaths: {
    sends: string;
    events: string;
  };
  stats: {
    sendsFileSize: number;
    eventsFileSize: number;
    lastModified?: string;
  };
  active: boolean;
}

export const agentsRouter = Router();

const AGENTS = [
  { name: 'jacob', displayName: 'Jacob', workspace: '/home/ubuntu/.openclaw/workspace-jacob' },
  { name: 'jacob-2', displayName: 'Jacob (Batch 2)', workspace: '/home/ubuntu/.openclaw/workspace-jacob-2' },
  { name: 'jacob-3', displayName: 'Jacob (Batch 3)', workspace: '/home/ubuntu/.openclaw/workspace-jacob-3' },
  { name: 'angie', displayName: 'Angie', workspace: '/home/ubuntu/.openclaw/workspace-angie' },
  { name: 'angie-2', displayName: 'Angie (Batch 2)', workspace: '/home/ubuntu/.openclaw/workspace-angie-2' },
  { name: 'angie-3', displayName: 'Angie (Batch 3)', workspace: '/home/ubuntu/.openclaw/workspace-angie-3' },
];

/**
 * GET /api/v1/agents
 * Returns status for all Jacob and Angie agent workspaces.
 */
agentsRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const statuses: AgentStatus[] = AGENTS.map((a) => {
      const sendsPath = `${a.workspace}/pipeline/logs/sends.jsonl`;
      const eventsPath = `${a.workspace}/pipeline/logs/events.jsonl`;

      const sendsExists = fs.existsSync(sendsPath);
      const eventsExists = fs.existsSync(eventsPath);

      let sendsSize = 0;
      let eventsSize = 0;
      let lastModified: string | undefined;

      if (sendsExists) {
        const stat = fs.statSync(sendsPath);
        sendsSize = stat.size;
        lastModified = stat.mtime.toISOString();
      }

      if (eventsExists) {
        const stat = fs.statSync(eventsPath);
        eventsSize = stat.size;
        if (!lastModified || stat.mtime.toISOString() > lastModified) {
          lastModified = stat.mtime.toISOString();
        }
      }

      return {
        name: a.name,
        displayName: a.displayName,
        workspacePath: a.workspace,
        logPaths: { sends: sendsPath, events: eventsPath },
        stats: {
          sendsFileSize: sendsSize,
          eventsFileSize: eventsSize,
          lastModified,
        },
        active: sendsExists || eventsExists,
      };
    });

    res.json({ agents: statuses });
  } catch (err) {
    logger.error('agents route error', { err });
    res.status(500).json({ error: String(err) });
  }
});
