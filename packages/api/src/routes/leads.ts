import { Router, Request, Response } from 'express';
import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const CACHE_FILE = '/home/ubuntu/.openclaw/workspace/scripts/lead_segments_cache.json';
const SEGMENT_SCRIPT = '/home/ubuntu/.openclaw/workspace/scripts/lead_segmentation.py';
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export const leadsRouter = Router();

function loadCache(): any | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
    const data = JSON.parse(raw);
    const generatedAt = data._generated_at;
    if (!generatedAt) return null;
    const age = Date.now() - new Date(generatedAt).getTime();
    if (age < CACHE_TTL_MS) return data;
    return null; // stale
  } catch {
    return null;
  }
}

function runSegmentation(): Promise<any> {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', [SEGMENT_SCRIPT], { timeout: 30000 });
    let stderr = '';
    proc.stderr.on('data', (d: Buffer) => stderr += d.toString());
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Segmentation failed (code ${code}): ${stderr.slice(0, 200)}`));
        return;
      }
      try {
        const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
        resolve(data);
      } catch (e) {
        reject(e);
      }
    });
    proc.on('error', reject);
  });
}

// GET /api/v1/leads — returns cached segments (runs Python if stale)
leadsRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  // Try cache first
  const cached = loadCache();
  if (cached) {
    res.json({ ...cached, _source: 'cache' });
    return;
  }

  // Run segmentation
  try {
    const data = await runSegmentation();
    res.json({ ...data, _source: 'fresh' });
  } catch (e: any) {
    // Return stale cache if available even if expired
    try {
      const stale = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      res.json({ ...stale, _source: 'stale', _error: e.message });
    } catch {
      res.status(500).json({ error: e.message, summary: {}, segments: {} });
    }
  }
});

// GET /api/v1/leads/summary — lightweight: just counts, no merchant arrays
leadsRouter.get('/summary', async (_req: Request, res: Response): Promise<void> => {
  const cached = loadCache();
  if (cached) {
    res.json({ summary: cached.summary, _generated_at: cached._generated_at });
    return;
  }
  try {
    const data = await runSegmentation();
    res.json({ summary: data.summary, _generated_at: data._generated_at });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/v1/leads/urgent — just urgent segment
leadsRouter.get('/urgent', async (_req: Request, res: Response): Promise<void> => {
  const cached = loadCache();
  const data = cached ?? (() => {
    try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8')); } catch { return null; }
  })();
  if (!data) { res.json({ leads: [], count: 0 }); return; }
  const urgent = data.segments?.urgent ?? [];
  res.json({ leads: urgent, count: urgent.length, _generated_at: data._generated_at });
});

// POST /api/v1/leads/refresh — force re-run (admin action, rate-limit yourself)
leadsRouter.post('/refresh', async (_req: Request, res: Response): Promise<void> => {
  try {
    if (fs.existsSync(CACHE_FILE)) fs.unlinkSync(CACHE_FILE);
    const data = await runSegmentation();
    res.json({ ok: true, summary: data.summary });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
