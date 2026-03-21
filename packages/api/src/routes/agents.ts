import { Router, Request, Response } from 'express';
import path from 'path';
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

// ── Live workspace view ──────────────────────────────────────────────
interface WorkspaceFile {
  name: string;
  path: string;
  content: string;
  lastModified: string;
}

/**
 * GET /api/v1/agents/:name/workspace
 * Returns the agent's configuration files (SOUL.md, rules, lead states)
 */
agentsRouter.get('/:name/workspace', (req: Request, res: Response) => {
  const agentName = req.params.name;
  const wsMap: Record<string, string> = {
    'jacob': '/home/ubuntu/.openclaw/workspace-jacob',
    'jacob-2': '/home/ubuntu/.openclaw/workspace-jacob-2',
    'jacob-3': '/home/ubuntu/.openclaw/workspace-jacob-3',
    'angie': '/home/ubuntu/.openclaw/workspace-angie',
    'angie-2': '/home/ubuntu/.openclaw/workspace-angie-2',
    'angie-3': '/home/ubuntu/.openclaw/workspace-angie-3',
  };

  const wsPath = wsMap[agentName];
  if (!wsPath) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  const files: WorkspaceFile[] = [];
  const importantFiles = [
    'SOUL.md', 'IDENTITY.md', 'AGENTS.md', 'TOOLS.md',
    'REPLY-RULES.md', 'OUTREACH-RULES.md', 'EMAIL-RULES.md', 'VOICE-RULES.md',
    'HEARTBEAT.md', 'USER.md',
    'pipeline/logs/lead_states.json',
    'pipeline/logs/opt_outs.json',
    'pipeline/logs/sent_today.json',
  ];

  for (const fname of importantFiles) {
    const fpath = path.join(wsPath, fname);
    try {
      if (fs.existsSync(fpath)) {
        const stat = fs.statSync(fpath);
        const content = fs.readFileSync(fpath, 'utf-8');
        files.push({
          name: fname,
          path: fpath,
          content: content.substring(0, 10000), // cap at 10KB
          lastModified: stat.mtime.toISOString(),
        });
      }
    } catch {
      // skip unreadable files
    }
  }

  res.json({ agent: agentName, workspace: wsPath, files });
});

/**
 * PUT /api/v1/agents/:name/workspace/:file
 * Update an agent's configuration file (live intervention)
 */
agentsRouter.put('/:name/workspace/:file', (req: Request, res: Response) => {
  const agentName = req.params.name;
  const fileName = req.params.file;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'content required' });
  }

  const wsMap: Record<string, string> = {
    'jacob': '/home/ubuntu/.openclaw/workspace-jacob',
    'angie': '/home/ubuntu/.openclaw/workspace-angie',
  };

  const wsPath = wsMap[agentName];
  if (!wsPath) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  // Only allow editing specific files
  const allowedFiles = ['SOUL.md', 'REPLY-RULES.md', 'OUTREACH-RULES.md', 'HEARTBEAT.md', 'EMAIL-RULES.md', 'VOICE-RULES.md'];
  if (!allowedFiles.includes(fileName)) {
    return res.status(403).json({ error: 'Cannot edit this file' });
  }

  const fpath = path.join(wsPath, fileName);
  try {
    fs.writeFileSync(fpath, content, 'utf-8');
    logger.info('Agent workspace file updated', { agent: agentName, file: fileName });
    res.json({ success: true, file: fileName, agent: agentName });
  } catch (err) {
    res.status(500).json({ error: `Failed to write: ${err}` });
  }
});

// ── Live lead states ──────────────────────────────────────────────────
/**
 * GET /api/v1/agents/:name/leads
 * Returns the agent's current lead states (who's been contacted, stage, etc.)
 */
agentsRouter.get('/:name/leads', (req: Request, res: Response) => {
  const agentName = req.params.name;
  const wsMap: Record<string, string> = {
    'jacob': '/home/ubuntu/.openclaw/workspace-jacob',
    'jacob-2': '/home/ubuntu/.openclaw/workspace-jacob-2',
    'jacob-3': '/home/ubuntu/.openclaw/workspace-jacob-3',
    'angie': '/home/ubuntu/.openclaw/workspace-angie',
    'angie-2': '/home/ubuntu/.openclaw/workspace-angie-2',
    'angie-3': '/home/ubuntu/.openclaw/workspace-angie-3',
  };

  const wsPath = wsMap[agentName];
  if (!wsPath) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  try {
    const statesPath = path.join(wsPath, 'pipeline/logs/lead_states.json');
    const optOutsPath = path.join(wsPath, 'pipeline/logs/opt_outs.json');
    const sentTodayPath = path.join(wsPath, 'pipeline/logs/sent_today.json');

    const states = fs.existsSync(statesPath) ? JSON.parse(fs.readFileSync(statesPath, 'utf-8')) : {};
    const optOuts = fs.existsSync(optOutsPath) ? JSON.parse(fs.readFileSync(optOutsPath, 'utf-8')) : {};
    const sentToday = fs.existsSync(sentTodayPath) ? JSON.parse(fs.readFileSync(sentTodayPath, 'utf-8')) : {};

    res.json({
      agent: agentName,
      leadStates: states,
      optOuts,
      sentToday,
      totalLeads: Object.keys(states).length,
      totalOptOuts: Object.keys(optOuts).length,
      sentTodayCount: Object.keys(sentToday).length,
    });
  } catch (err) {
    res.status(500).json({ error: `Failed to read leads: ${err}` });
  }
});

// ── Intervention: stop/blacklist a specific number ────────────────────
/**
 * POST /api/v1/agents/:name/stop
 * Stop all outreach to a specific phone number for this agent
 */
agentsRouter.post('/:name/stop', (req: Request, res: Response) => {
  const agentName = req.params.name;
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: 'phone required' });
  }

  const wsMap: Record<string, string> = {
    'jacob': '/home/ubuntu/.openclaw/workspace-jacob',
    'angie': '/home/ubuntu/.openclaw/workspace-angie',
  };

  const wsPath = wsMap[agentName];
  if (!wsPath) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  try {
    const optOutsPath = path.join(wsPath, 'pipeline/logs/opt_outs.json');
    const optOuts = fs.existsSync(optOutsPath) ? JSON.parse(fs.readFileSync(optOutsPath, 'utf-8')) : {};
    optOuts[phone] = { reason: 'manual_stop_dashboard', timestamp: new Date().toISOString() };
    fs.writeFileSync(optOutsPath, JSON.stringify(optOuts, null, 2), 'utf-8');
    
    logger.info('Lead stopped via dashboard', { agent: agentName, phone });
    res.json({ success: true, phone, agent: agentName });
  } catch (err) {
    res.status(500).json({ error: `Failed: ${err}` });
  }
});




/**
 * GET /api/v1/agents/system/health
 * Returns self-healing status for all services
 */
agentsRouter.get('/system/health', (_req: Request, res: Response) => {
  try {
    const { getStatus } = require('../self-healing');
    res.json(getStatus());
  } catch {
    res.json({
      services: [],
      recentEvents: [],
      uptime: process.uptime(),
      note: 'Self-healing manager not running as daemon'
    });
  }
});
