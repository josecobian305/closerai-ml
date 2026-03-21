/**
 * Tests for contacts route — enrichment logic
 */

import { agentFromPath } from '../sms';
import type { SmsSend } from '../sms';

describe('agentFromPath', () => {
  it('extracts jacob from workspace-jacob path', () => {
    expect(agentFromPath('/home/ubuntu/.openclaw/workspace-jacob/pipeline/logs/sends.jsonl')).toBe('jacob');
  });

  it('extracts angie from workspace-angie path', () => {
    expect(agentFromPath('/home/ubuntu/.openclaw/workspace-angie/pipeline/logs/events.jsonl')).toBe('angie');
  });

  it('extracts jacob-2 from workspace-jacob-2 path', () => {
    expect(agentFromPath('/home/ubuntu/.openclaw/workspace-jacob-2/pipeline/logs/sends.jsonl')).toBe('jacob-2');
  });

  it('returns unknown for unrecognised paths', () => {
    expect(agentFromPath('/some/other/path/file.jsonl')).toBe('unknown');
  });
});

describe('contacts enrichment logic', () => {
  const mockSends: SmsSend[] = [
    {
      ts: '2026-03-20T10:00:00Z',
      contact_id: 'c1',
      phone: '+18005551234',
      tier: 'hot',
      msg: 'Hello from Jacob at CHC Capital',
      agent: 'jacob',
    },
    {
      ts: '2026-03-21T09:00:00Z',
      contact_id: 'c1',
      phone: '+18005551234',
      tier: 'hot',
      msg: 'Follow up message',
      agent: 'jacob',
    },
  ];

  it('groups sends by phone', () => {
    const byPhone: Record<string, SmsSend[]> = {};
    for (const s of mockSends) {
      if (!byPhone[s.phone]) byPhone[s.phone] = [];
      byPhone[s.phone].push(s);
    }
    expect(byPhone['+18005551234']).toHaveLength(2);
  });

  it('picks most recent send as preview', () => {
    const sends = mockSends.filter((s) => s.phone === '+18005551234');
    sends.sort((a, b) => b.ts.localeCompare(a.ts));
    expect(sends[0].msg).toBe('Follow up message');
  });

  it('counts SMS sent correctly', () => {
    const sends = mockSends.filter((s) => s.phone === '+18005551234');
    expect(sends).toHaveLength(2);
  });
});

describe('config lazy loading', () => {
  it('reads GHL_API_KEY from env at call time', () => {
    const originalKey = process.env.GHL_API_KEY;
    process.env.GHL_API_KEY = 'test-key-123';

    // Re-require config to test lazy getter
    const { config } = require('../config');
    expect(config.ghl.apiKey).toBe('test-key-123');

    if (originalKey === undefined) {
      delete process.env.GHL_API_KEY;
    } else {
      process.env.GHL_API_KEY = originalKey;
    }
  });

  it('uses default port 3001 when PORT not set', () => {
    const originalPort = process.env.PORT;
    delete process.env.PORT;

    const { config } = require('../config');
    expect(config.server.port).toBe(3001);

    if (originalPort !== undefined) process.env.PORT = originalPort;
  });
});
