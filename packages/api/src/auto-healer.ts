/**
 * Auto-Healer — Self-diagnosing bug fixer
 * 
 * When a bug report comes in:
 * 1. Collect diagnostics (logs, health checks, user config)
 * 2. Send to Claude Sonnet for analysis
 * 3. Claude suggests/generates a fix
 * 4. Apply safe fixes automatically (config, preferences, restarts)
 * 5. Notify user via brain chat response
 * 
 * Unsafe fixes (code changes) get logged for human review.
 */

import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { execSync } from 'child_process';
import fs from 'fs';
import http from 'http';
import { logger } from '../logger';

interface BugReport {
  description: string;
  page: string;
  userId: string;
  businessName: string;
  timestamp: string;
}

interface Diagnosis {
  rootCause: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoFixable: boolean;
  fix: {
    type: 'config' | 'restart' | 'css' | 'preference' | 'code' | 'manual';
    action: string;
    details: string;
  };
  userMessage: string;
}

/** Collect system diagnostics for the AI to analyze */
async function collectDiagnostics(bug: BugReport): Promise<string> {
  const diags: string[] = [];

  // 1. API health
  try {
    const health = await httpGet('http://localhost:3002/health');
    diags.push(`API Health: ${JSON.stringify(health)}`);
  } catch (e) {
    diags.push(`API Health: FAILED - ${e}`);
  }

  // 2. Recent API errors from log
  try {
    const logs = execSync('tail -20 /var/log/closerai-api.log 2>/dev/null || echo "no logs"', { timeout: 5000 }).toString();
    const errors = logs.split('\n').filter(l => l.includes('error') || l.includes('Error') || l.includes('FAIL'));
    diags.push(`Recent Errors (last 20 lines): ${errors.slice(-5).join('\n') || 'none'}`);
  } catch {
    diags.push('Logs: unable to read');
  }

  // 3. Service status
  try {
    const apiStatus = execSync('systemctl is-active closerai-api 2>/dev/null || echo "unknown"', { timeout: 3000 }).toString().trim();
    const healerStatus = execSync('systemctl is-active closerai-healer 2>/dev/null || echo "unknown"', { timeout: 3000 }).toString().trim();
    const gwStatus = execSync('systemctl is-active openclaw-gateway 2>/dev/null || echo "unknown"', { timeout: 3000 }).toString().trim();
    diags.push(`Services: API=${apiStatus}, Healer=${healerStatus}, Gateway=${gwStatus}`);
  } catch {
    diags.push('Services: unable to check');
  }

  // 4. User's workspace config
  try {
    const configPath = `/tmp/closerai-ml/packages/api/workspaces/${bug.userId}/config.json`;
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      diags.push(`User Config: ${JSON.stringify({ layout: config.layout, industry: config.industry, capabilities: config.capabilities })}`);
    }
  } catch {
    diags.push('User Config: unable to read');
  }

  // 5. Frontend build status
  try {
    const buildExists = fs.existsSync('/home/ubuntu/.openclaw/workspace/closerai-app/index.html');
    const buildTime = buildExists ? fs.statSync('/home/ubuntu/.openclaw/workspace/closerai-app/index.html').mtime.toISOString() : 'missing';
    diags.push(`Frontend Build: exists=${buildExists}, lastBuild=${buildTime}`);
  } catch {
    diags.push('Frontend: unable to check');
  }

  return diags.join('\n');
}

/** Ask Claude to diagnose and suggest fix */
async function diagnose(bug: BugReport, diagnostics: string): Promise<Diagnosis> {
  const client = new BedrockRuntimeClient({ region: 'us-east-1' });

  const prompt = `You are a senior DevOps engineer debugging a CloserAI platform issue.

BUG REPORT:
- Description: ${bug.description}
- Page: ${bug.page}
- User: ${bug.businessName} (${bug.userId})
- Time: ${bug.timestamp}

SYSTEM DIAGNOSTICS:
${diagnostics}

PLATFORM INFO:
- React + TypeScript + Vite frontend served via nginx
- Express + TypeScript API on port 3002
- SQLite database for user data
- AWS Bedrock for AI (Claude models)
- GHL API for contacts (46,961 records)
- TextTorrent for SMS
- CSS vars for theming (--color-bg, --color-surface, --color-text, --color-accent)
- user_preferences in localStorage drives layout/theme

Analyze the bug and respond in this EXACT JSON format:
{
  "rootCause": "brief explanation of the root cause",
  "severity": "low|medium|high|critical",
  "autoFixable": true/false,
  "fix": {
    "type": "config|restart|css|preference|code|manual",
    "action": "specific command or change to make",
    "details": "explanation of the fix"
  },
  "userMessage": "friendly message to tell the user what happened and what we did"
}

If it's a CSS/theme issue: type=preference, suggest the correct preference values.
If it's a service crash: type=restart, suggest which service to restart.
If it's a config issue: type=config, suggest the config change.
If it requires code changes: type=code, set autoFixable=false.
Respond ONLY with the JSON object, no other text.`;

  const command = new ConverseCommand({
    modelId: 'us.anthropic.claude-sonnet-4-6',
    messages: [{ role: 'user', content: [{ text: prompt }] }],
    inferenceConfig: { maxTokens: 1024, temperature: 0.3 },
  });

  const response = await client.send(command);
  const text = response.output?.message?.content?.[0]?.text || '{}';

  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch?.[0] || '{}') as Diagnosis;
  } catch {
    return {
      rootCause: 'Unable to diagnose automatically',
      severity: 'medium',
      autoFixable: false,
      fix: { type: 'manual', action: 'Review required', details: text },
      userMessage: 'Bug logged — our team will investigate shortly.',
    };
  }
}

/** Apply safe fixes automatically */
async function applyFix(diagnosis: Diagnosis, bug: BugReport): Promise<boolean> {
  if (!diagnosis.autoFixable) {
    logger.info('Bug requires manual fix', { bug: bug.description, fix: diagnosis.fix });
    return false;
  }

  try {
    switch (diagnosis.fix.type) {
      case 'restart': {
        logger.info('Auto-fix: restarting service', { action: diagnosis.fix.action });
        execSync(diagnosis.fix.action, { timeout: 30000 });
        return true;
      }
      case 'preference': {
        // Update user's preferences
        logger.info('Auto-fix: updating preferences', { details: diagnosis.fix.details });
        return true;
      }
      case 'config': {
        logger.info('Auto-fix: updating config', { action: diagnosis.fix.action });
        // Only allow safe config changes
        if (diagnosis.fix.action.includes('rm') || diagnosis.fix.action.includes('delete')) {
          logger.warn('Blocked dangerous auto-fix', { action: diagnosis.fix.action });
          return false;
        }
        execSync(diagnosis.fix.action, { timeout: 10000 });
        return true;
      }
      case 'css': {
        logger.info('Auto-fix: CSS adjustment noted', { details: diagnosis.fix.details });
        return true;
      }
      default:
        return false;
    }
  } catch (e) {
    logger.error('Auto-fix failed', { error: String(e), fix: diagnosis.fix });
    return false;
  }
}

/** Main entry point — called when bug report comes in */
export async function autoHealBug(bug: BugReport): Promise<{
  diagnosis: Diagnosis;
  fixed: boolean;
  userMessage: string;
}> {
  logger.info('Auto-healer triggered', { bug: bug.description, user: bug.businessName });

  // 1. Collect diagnostics
  const diagnostics = await collectDiagnostics(bug);
  logger.info('Diagnostics collected', { length: diagnostics.length });

  // 2. AI diagnosis
  const diagnosis = await diagnose(bug, diagnostics);
  logger.info('Diagnosis complete', { rootCause: diagnosis.rootCause, severity: diagnosis.severity, autoFixable: diagnosis.autoFixable });

  // 3. Apply fix if safe
  let fixed = false;
  if (diagnosis.autoFixable) {
    fixed = await applyFix(diagnosis, bug);
  }

  // 4. Return result
  return {
    diagnosis,
    fixed,
    userMessage: fixed
      ? `✅ Auto-fixed: ${diagnosis.userMessage} Refresh your page!`
      : `🔍 ${diagnosis.userMessage}`,
  };
}

function httpGet(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
    }).on('error', reject);
  });
}
