import { Router, Request, Response } from 'express';
import fs from 'fs';
import { logger } from '../logger';

export const settingsRouter = Router();

const SETTINGS_PATH = '/home/ubuntu/.openclaw/workspace/dashboard/settings.json';

function readSettings(): any {
  try {
    return fs.existsSync(SETTINGS_PATH) ? JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8')) : {};
  } catch { return {}; }
}

settingsRouter.get('/', (_req: Request, res: Response) => {
  try {
    res.json({ settings: readSettings() });
  } catch (err) {
    logger.error('settings read error', { err });
    res.status(500).json({ error: String(err) });
  }
});

settingsRouter.post('/', (req: Request, res: Response) => {
  try {
    const current = readSettings();
    const updated = { ...current, ...req.body };
    const dir = SETTINGS_PATH.replace(/\/[^/]+$/, '');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(updated, null, 2), 'utf-8');
    res.json({ success: true, settings: updated });
  } catch (err) {
    logger.error('settings write error', { err });
    res.status(500).json({ error: String(err) });
  }
});
