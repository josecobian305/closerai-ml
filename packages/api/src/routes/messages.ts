import { Router, Request, Response } from 'express';
import { getMessagesForPhone } from '../sms';
import { logger } from '../logger';

export const messagesRouter = Router({ mergeParams: true });

/**
 * GET /api/v1/contacts/:phone/messages
 * Returns all outbound SMS + inbound replies for a given phone number.
 * Phone should be URL-encoded E.164 (e.g. %2B18005551234).
 */
messagesRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    if (!phone.startsWith('+')) {
      res.status(400).json({ error: 'Phone must be E.164 format (starts with +)' });
      return;
    }

    const messages = await getMessagesForPhone(phone);
    res.json({ phone, messages, count: messages.length });
  } catch (err) {
    logger.error('messages route error', { err });
    res.status(500).json({ error: String(err) });
  }
});
