import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { logger } from './logger';

/** Stored SMS send record */
export interface SmsSendRecord {
  id?: number;
  ts: string;
  contact_id: string;
  phone: string;
  tier: string;
  msg: string;
  agent: string;
  source_file: string;
}

/** Stored SMS event record */
export interface SmsEventRecord {
  id?: number;
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

let _db: Database.Database | null = null;

/**
 * Returns a singleton SQLite database instance.
 * Creates the database file and tables on first call.
 */
export function getDb(): Database.Database {
  if (_db) return _db;

  const dbPath = config.db.path;
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  _db = new Database(dbPath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  _db.exec(`
    CREATE TABLE IF NOT EXISTS sms_sends (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      ts           TEXT NOT NULL,
      contact_id   TEXT NOT NULL,
      phone        TEXT NOT NULL,
      tier         TEXT NOT NULL DEFAULT '',
      msg          TEXT NOT NULL DEFAULT '',
      agent        TEXT NOT NULL DEFAULT 'unknown',
      source_file  TEXT NOT NULL DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_sms_sends_phone ON sms_sends(phone);
    CREATE INDEX IF NOT EXISTS idx_sms_sends_ts    ON sms_sends(ts);

    CREATE TABLE IF NOT EXISTS sms_events (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      ts               TEXT NOT NULL,
      type             TEXT NOT NULL,
      phone            TEXT NOT NULL,
      chat_id          TEXT NOT NULL DEFAULT '',
      category         TEXT,
      score            REAL,
      suggested_action TEXT,
      raw_text         TEXT,
      agent            TEXT NOT NULL DEFAULT 'unknown'
    );

    CREATE INDEX IF NOT EXISTS idx_sms_events_phone ON sms_events(phone);
    CREATE INDEX IF NOT EXISTS idx_sms_events_ts    ON sms_events(ts);

    CREATE TABLE IF NOT EXISTS sms_log_cursors (
      source_file TEXT PRIMARY KEY,
      last_offset INTEGER NOT NULL DEFAULT 0
    );
  `);

  logger.info('SQLite database ready', { path: dbPath });
  return _db;
}

/** Reset db singleton (useful for testing) */
export function _resetDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
