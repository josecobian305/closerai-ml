import fs from 'fs';
import readline from 'readline';
import { config } from './config';
import { logger } from './logger';

/** Parsed SMS send log entry */
export interface SmsSend {
  ts: string;
  contact_id: string;
  phone: string;
  tier: string;
  msg: string;
  agent: string;
}

/** Parsed SMS event log entry */
export interface SmsEvent {
  ts: string;
  type: string;
  phone: string;
  chat_id: string;
  category?: string;
  score?: number;
  suggested_action?: string;
  raw_text?: string;
  agent: string;
}

/** Combined message for a contact (outbound + inbound) */
export interface SmsMessage {
  ts: string;
  direction: 'outbound' | 'inbound';
  phone: string;
  text: string;
  agent: string;
  type?: string;
  category?: string;
}

/** Per-agent SMS stats */
export interface AgentSmsStats {
  agent: string;
  sentToday: number;
  sentTotal: number;
  repliesTotal: number;
  repliesRepliedCategory: Record<string, number>;
}

/**
 * Determines the agent name from a log file path.
 * @param filePath - Full path to the log file
 * @returns Agent identifier (e.g. "jacob", "angie", "jacob-2")
 */
export function agentFromPath(filePath: string): string {
  const match = filePath.match(/workspace-([a-z]+-?\d*)/);
  return match ? match[1] : 'unknown';
}

/**
 * Reads all lines from a JSONL file, parsing each as JSON.
 * Silently skips missing files.
 *
 * @param filePath - Path to the JSONL file
 * @returns Array of parsed objects
 */
export async function readJsonl<T>(filePath: string): Promise<T[]> {
  if (!fs.existsSync(filePath)) return [];
  const results: T[] = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      results.push(JSON.parse(trimmed) as T);
    } catch {
      // skip malformed lines
    }
  }
  return results;
}

/**
 * Reads all SMS send logs from all agent pipeline paths.
 * @returns All SmsSend records with agent field populated
 */
export async function readAllSends(): Promise<SmsSend[]> {
  const all: SmsSend[] = [];
  const paths = config.sms.logPaths.filter((p) => p.endsWith('sends.jsonl'));

  for (const filePath of paths) {
    const agent = agentFromPath(filePath);
    const rows = await readJsonl<Omit<SmsSend, 'agent'>>(filePath);
    for (const row of rows) {
      all.push({ ...row, agent });
    }
  }

  logger.debug('SMS sends loaded', { total: all.length });
  return all;
}

/**
 * Reads all SMS event logs from all agent pipeline paths.
 * @returns All SmsEvent records with agent field populated
 */
export async function readAllEvents(): Promise<SmsEvent[]> {
  const all: SmsEvent[] = [];
  const paths = config.sms.logPaths.filter((p) => p.endsWith('events.jsonl'));

  for (const filePath of paths) {
    const agent = agentFromPath(filePath);
    const rows = await readJsonl<Omit<SmsEvent, 'agent'>>(filePath);
    for (const row of rows) {
      all.push({ ...row, agent });
    }
  }

  logger.debug('SMS events loaded', { total: all.length });
  return all;
}

/**
 * Returns all messages (sends + replies) for a given phone number.
 * @param phone - E.164 phone number
 * @returns Sorted message list
 */
export async function getMessagesForPhone(phone: string): Promise<SmsMessage[]> {
  const [sends, events] = await Promise.all([readAllSends(), readAllEvents()]);

  const messages: SmsMessage[] = [];

  for (const s of sends) {
    if (s.phone === phone) {
      messages.push({
        ts: s.ts,
        direction: 'outbound',
        phone: s.phone,
        text: s.msg,
        agent: s.agent,
      });
    }
  }

  for (const e of events) {
    if (e.phone === phone && e.raw_text) {
      messages.push({
        ts: e.ts,
        direction: 'inbound',
        phone: e.phone,
        text: e.raw_text,
        agent: e.agent,
        type: e.type,
        category: e.category,
      });
    }
  }

  messages.sort((a, b) => a.ts.localeCompare(b.ts));
  return messages;
}

/**
 * Computes per-agent SMS stats for the stats endpoint.
 * @returns Array of AgentSmsStats
 */
export async function computeSmsStats(): Promise<AgentSmsStats[]> {
  const [sends, events] = await Promise.all([readAllSends(), readAllEvents()]);

  const todayPrefix = new Date().toISOString().slice(0, 10);
  const statsMap: Record<string, AgentSmsStats> = {};

  const ensureAgent = (agent: string) => {
    if (!statsMap[agent]) {
      statsMap[agent] = {
        agent,
        sentToday: 0,
        sentTotal: 0,
        repliesTotal: 0,
        repliesRepliedCategory: {},
      };
    }
    return statsMap[agent];
  };

  for (const s of sends) {
    const stats = ensureAgent(s.agent);
    stats.sentTotal++;
    if (s.ts.startsWith(todayPrefix)) stats.sentToday++;
  }

  for (const e of events) {
    if (e.raw_text) {
      const stats = ensureAgent(e.agent);
      stats.repliesTotal++;
      const cat = e.category ?? 'unknown';
      stats.repliesRepliedCategory[cat] = (stats.repliesRepliedCategory[cat] ?? 0) + 1;
    }
  }

  return Object.values(statsMap);
}
