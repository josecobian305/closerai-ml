import { Router, Request, Response } from 'express';
import twilio from 'twilio';
import { config } from '../config';
import { logger } from '../logger';

const router = Router();

const TWILIO_SID = process.env.TWILIO_SID || '';
const TWILIO_TOKEN = process.env.TWILIO_TOKEN || '';
const TWIML_APP_SID = process.env.TWIML_APP_SID || '';

const AGENTS: Record<string, { phone: string; name: string }> = {
  jose: { phone: '+17862804399', name: 'Jose Cobian' },
  ed: { phone: '+16463728300', name: 'Ed' },
};

/**
 * POST /api/v1/phone/token
 * Returns a Twilio Access Token for WebRTC Voice SDK
 */
router.post('/token', (req: Request, res: Response) => {
  try {
    const { agent = 'jose', identity } = req.body || {};
    const agentInfo = AGENTS[agent] || AGENTS.jose;

    // Use Access Token with Voice grant for Voice SDK 2.x
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    const token = new AccessToken(
      TWILIO_SID,
      process.env.TWILIO_API_KEY || TWILIO_SID,
      process.env.TWILIO_API_SECRET || TWILIO_TOKEN,
      { identity: identity || `closerai-${agent}` }
    );

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: TWIML_APP_SID || undefined,
      incomingAllow: false,
    });
    token.addGrant(voiceGrant);

    res.json({
      token: token.toJwt(),
      identity: identity || `closerai-${agent}`,
      agent: agentInfo,
    });
  } catch (err: any) {
    logger.error('Token generation failed', { error: err.message });
    res.status(500).json({ error: 'Token generation failed', details: err.message });
  }
});

/**
 * POST /api/v1/phone/call
 * Initiate an outbound call via Twilio REST
 * Body: { to, agent: 'jose'|'ed' }
 */
router.post('/call', async (req: Request, res: Response) => {
  try {
    const { to, agent = 'jose' } = req.body;
    if (!to) return res.status(400).json({ error: 'Missing "to" phone number' });

    const agentInfo = AGENTS[agent] || AGENTS.jose;
    const client = twilio(TWILIO_SID, TWILIO_TOKEN);

    const call = await client.calls.create({
      to,
      from: agentInfo.phone,
      url: 'https://agents.chccapitalgroup.com/api/bridge-connect',
      record: true,
      recordingStatusCallback: 'https://agents.chccapitalgroup.com/api/recording-callback',
    });

    logger.info('Call initiated', { sid: call.sid, to, agent });
    res.json({
      success: true,
      callSid: call.sid,
      from: agentInfo.phone,
      to,
      agent: agentInfo.name,
    });
  } catch (err: any) {
    logger.error('Call failed', { error: err.message });
    res.status(500).json({ error: 'Call failed', details: err.message });
  }
});

/**
 * POST /api/v1/phone/sms
 * Send SMS via Twilio from agent's verified number
 * Body: { to, message, agent: 'jose'|'ed' }
 */
router.post('/sms', async (req: Request, res: Response) => {
  try {
    const { to, message, agent = 'jose' } = req.body;
    if (!to || !message) return res.status(400).json({ error: 'Missing "to" or "message"' });

    const agentInfo = AGENTS[agent] || AGENTS.jose;
    const client = twilio(TWILIO_SID, TWILIO_TOKEN);

    try {
      // Try Twilio first (sends from agent's real number)
      const msg = await client.messages.create({
        to,
        from: agentInfo.phone,
        body: message,
      });

      logger.info('SMS sent via Twilio', { sid: msg.sid, to, agent });
      res.json({
        success: true,
        provider: 'twilio',
        sid: msg.sid,
        from: agentInfo.phone,
        to,
      });
    } catch (twilioErr: any) {
      // Fallback to TextTorrent
      logger.warn('Twilio SMS failed, trying TextTorrent', { error: twilioErr.message });

      const TT_SID = process.env.TT_SID || '';
      const TT_KEY = process.env.TT_KEY || '';
      const TT_FROM = process.env.TT_FROM_NUMBER || '';

      if (!TT_SID || !TT_KEY) {
        throw new Error('Both Twilio and TextTorrent unavailable');
      }

      const ttRes = await fetch('https://api.texttorrent.com/api/v1/messages', {
        method: 'POST',
        headers: {
          'X-API-SID': TT_SID,
          'X-API-PUBLIC-KEY': TT_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: TT_FROM,
          to: to.replace(/\D/g, ''),
          body: message,
        }),
      });

      const ttData = await ttRes.json();
      logger.info('SMS sent via TextTorrent', { to, response: ttData });
      res.json({
        success: true,
        provider: 'texttorrent',
        from: TT_FROM,
        to,
        data: ttData,
      });
    }
  } catch (err: any) {
    logger.error('SMS failed', { error: err.message });
    res.status(500).json({ error: 'SMS failed', details: err.message });
  }
});

/**
 * GET /api/v1/phone/agents
 * Return available agent configurations
 */
router.get('/agents', (_req: Request, res: Response) => {
  res.json(AGENTS);
});

export const phoneRouter = router;
