import { Router, Request, Response } from 'express';
import { listContacts, searchContacts } from '../ghl';
import { readAllSends } from '../sms';
import { logger } from '../logger';

/** Enriched contact for the CRM grid */
export interface EnrichedContact {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  companyName: string;
  tags: string[];
  dateAdded: string;
  lastActivity?: string;
  smsSentCount: number;
  lastSmsPreview?: string;
  lastSmsTs?: string;
  tier?: string;
}

export const contactsRouter = Router();

/**
 * GET /api/v1/contacts
 * Returns paginated, SMS-enriched contacts from GHL.
 *
 * Query params:
 *   - limit: number (default 20, max 100)
 *   - startAfterId: cursor for next page
 *   - query: search string
 */
contactsRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10), 100);
    const startAfterId = req.query.startAfterId as string | undefined;
    const query = req.query.query as string | undefined;

    let contacts;
    let meta;

    if (query && query.trim()) {
      const results = await searchContacts(query.trim(), limit);
      contacts = results;
      meta = { total: results.length, currentPage: 1 };
    } else {
      const result = await listContacts({ limit, startAfterId });
      contacts = result.contacts ?? [];
      meta = result.meta;
    }

    // Enrich with SMS log data
    const sends = await readAllSends();
    const smsByPhone: Record<string, typeof sends> = {};
    for (const s of sends) {
      if (!smsByPhone[s.phone]) smsByPhone[s.phone] = [];
      smsByPhone[s.phone].push(s);
    }

    const enriched: EnrichedContact[] = contacts.map((c) => {
      const phoneSends = smsByPhone[c.phone] ?? [];
      phoneSends.sort((a, b) => b.ts.localeCompare(a.ts));
      const last = phoneSends[0];

      return {
        id: c.id,
        name: c.name,
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone,
        email: c.email,
        companyName: c.companyName,
        tags: c.tags ?? [],
        dateAdded: c.dateAdded,
        lastActivity: c.lastActivity,
        smsSentCount: phoneSends.length,
        lastSmsPreview: last ? last.msg.slice(0, 80) : undefined,
        lastSmsTs: last?.ts,
        tier: last?.tier,
      };
    });

    res.json({ contacts: enriched, meta });
  } catch (err) {
    logger.error('contacts route error', { err });
    res.status(500).json({ error: String(err) });
  }
});
