import dotenv from 'dotenv';
dotenv.config();

/**
 * Lazy config — reads from process.env at call time.
 * Allows test suites to set env vars before invoking functions.
 */
export const config = {
  get server() {
    return {
      port: parseInt(process.env.PORT ?? '3001', 10),
      nodeEnv: process.env.NODE_ENV ?? 'development',
    };
  },
  get ghl() {
    return {
      apiKey: process.env.GHL_API_KEY ?? '',
      locationId: 'dkqTGqWYd8HORwh5IVdq',
      baseUrl: 'https://services.leadconnectorhq.com',
    };
  },
  get sms() {
    const workspaces = ['jacob', 'angie'];
    const suffixes = ['', '-2', '-3'];
    const paths: string[] = [];
    for (const ws of workspaces) {
      for (const sfx of suffixes) {
        const base = `/home/ubuntu/.openclaw/workspace-${ws}${sfx}/pipeline/logs`;
        paths.push(`${base}/sends.jsonl`);
        paths.push(`${base}/events.jsonl`);
      }
    }
    return { logPaths: paths };
  },
  get db() {
    return {
      path: process.env.DB_PATH ?? './data/closerai.db',
    };
  },
  get logging() {
    return {
      level: process.env.LOG_LEVEL ?? 'info',
    };
  },
};
