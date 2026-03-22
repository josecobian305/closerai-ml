import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import Database from 'better-sqlite3';
import { logger } from '../logger';

export const dealsRouter = Router();

const DB_PATH = '/home/ubuntu/.openclaw/workspace/data/contact_index.db';
const MATCH_SCRIPT = '/home/ubuntu/openclaw/skills/lender-match/scripts/match.py';
const S3_BUCKET = 'chc-underwriting-bank-statements-2259';
const lambda = new LambdaClient({ region: 'us-east-1' });
const s3 = new S3Client({ region: 'us-east-1' });

function getDb(): Database.Database {
  return new Database(DB_PATH);
}

// ─── GET /api/v1/deals ───────────────────────────────────────────
dealsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const deals = db.prepare(`
      SELECT d.*,
        c.name AS contact_name, c.email AS contact_email,
        (SELECT COUNT(*) FROM lender_offers WHERE deal_id = d.id) AS offer_count,
        (SELECT COUNT(*) FROM lender_offers WHERE deal_id = d.id AND status = 'approved') AS approved_count
      FROM deals d
      LEFT JOIN contacts c ON c.id = d.contact_id
      ORDER BY d.updated_at DESC
    `).all();
    db.close();
    res.json({ deals, total: deals.length });
  } catch (err: any) {
    logger.error('GET /deals error', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/v1/deals/offers-board ──────────────────────────────
dealsRouter.get('/offers-board', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const since = req.query.since as string | undefined;

    let query = `
      SELECT lo.*, d.business, d.phone, d.amount_requested,
             c.name as merchant_name, c.email as merchant_email
      FROM lender_offers lo
      LEFT JOIN deals d ON lo.deal_id = d.id
      LEFT JOIN contacts c ON d.contact_id = c.id
    `;
    const params: any[] = [];
    if (since) {
      query += ' WHERE lo.received_at > ? ';
      params.push(since);
    }
    query += ' ORDER BY lo.received_at DESC';

    const allOffers = db.prepare(query).all(...params) as any[];

    const approved = allOffers.filter((o: any) => o.status === 'approved' || o.status === 'accepted');
    const declined = allOffers.filter((o: any) => o.status === 'declined');
    const countered = allOffers.filter((o: any) => o.status === 'countered');
    const pending = allOffers.filter((o: any) => o.status === 'pending' || o.status === 'submitted');

    const summary = {
      approved: approved.length,
      declined: declined.length,
      countered: countered.length,
      pending: pending.length,
      total: allOffers.length,
    };

    db.close();
    res.json({ summary, approved, declined, countered, pending, all: allOffers });
  } catch (err: any) {
    logger.error('GET /deals/offers-board error', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/v1/deals/offers/:offerId/manual-entry ─────────────
dealsRouter.post('/offers/:offerId/manual-entry', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const offer = db.prepare('SELECT * FROM lender_offers WHERE id = ?').get(req.params.offerId) as any;
    if (!offer) { db.close(); res.status(404).json({ error: 'Offer not found' }); return; }

    const {
      lender_name, status, offer_amount, factor_rate, term_months,
      payment_amount, payment_frequency, decline_reason, notes,
    } = req.body;

    const now = new Date().toISOString();
    const totalPayback = (offer_amount || offer.offer_amount || 0) * (factor_rate || offer.factor_rate || 1);

    db.prepare(`
      UPDATE lender_offers SET
        lender_name = COALESCE(?, lender_name),
        status = COALESCE(?, status),
        offer_amount = COALESCE(?, offer_amount),
        factor_rate = COALESCE(?, factor_rate),
        term_months = COALESCE(?, term_months),
        payment_amount = COALESCE(?, payment_amount),
        payment_frequency = COALESCE(?, payment_frequency),
        decline_reason = COALESCE(?, decline_reason),
        notes = COALESCE(?, notes),
        total_payback = ?,
        received_at = ?
      WHERE id = ?
    `).run(
      lender_name || null, status || null, offer_amount || null, factor_rate || null,
      term_months || null, payment_amount || null, payment_frequency || null,
      decline_reason || null, notes || null, totalPayback, now, req.params.offerId
    );

    if (offer.deal_id) {
      db.prepare('UPDATE deals SET updated_at = ? WHERE id = ?').run(now, offer.deal_id);
    }

    const updated = db.prepare('SELECT * FROM lender_offers WHERE id = ?').get(req.params.offerId);
    db.close();
    res.json({ updated: true, offer: updated });
  } catch (err: any) {
    logger.error('POST /deals/offers/:offerId/manual-entry error', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/v1/deals/:dealId ───────────────────────────────────
dealsRouter.get('/:dealId', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.dealId) as any;
    if (!deal) { db.close(); res.status(404).json({ error: 'Deal not found' }); return; }

    const contact = deal.contact_id
      ? db.prepare('SELECT * FROM contacts WHERE id = ?').get(deal.contact_id)
      : null;

    const offers = db.prepare('SELECT * FROM lender_offers WHERE deal_id = ? ORDER BY received_at DESC').all(deal.id);

    // Documents with presigned URLs
    const rawDocs = deal.contact_id
      ? db.prepare('SELECT * FROM contact_documents WHERE contact_id = ?').all(deal.contact_id) as any[]
      : [];

    const documents = await Promise.all(rawDocs.map(async (doc: any) => {
      try {
        const url = await getSignedUrl(s3, new GetObjectCommand({
          Bucket: doc.s3_bucket || S3_BUCKET,
          Key: doc.s3_key,
        }), { expiresIn: 86400 });
        return { ...doc, presigned_url: url };
      } catch {
        return { ...doc, presigned_url: null };
      }
    }));

    // Parse JSON fields
    let lender_matches: any[] = [];
    try { lender_matches = deal.lender_matches ? JSON.parse(deal.lender_matches) : []; } catch {}

    let existing_advances: any[] = [];
    try { existing_advances = deal.existing_advances ? JSON.parse(deal.existing_advances) : []; } catch {}

    // Get latest underwriting history
    const uw = deal.contact_id
      ? db.prepare('SELECT * FROM underwriting_history WHERE contact_id=? ORDER BY version DESC LIMIT 1').get(deal.contact_id) as any
      : null;

    let revenue_by_month: Record<string, number> = {};
    let uw_red_flags: string[] = [];
    let uw_notes = '';
    let nsf_count = 0;
    let negative_days = 0;
    if (uw) {
      try { revenue_by_month = JSON.parse(uw.revenue_by_month || '{}'); } catch {}
      try { uw_red_flags = JSON.parse(uw.red_flags || '[]'); } catch {}
      uw_notes = uw.qualification_notes || '';
      nsf_count = uw.nsf_count || 0;
      negative_days = uw.negative_days || 0;
    }

    // Detect online/fintech banks + decline notes from documents
    const FINTECH_BANKS = ['found', 'gobank', 'mercury', 'relay', 'novo', 'bluevine', 'brex', 'rho'];
    const allDocRows = deal.contact_id
      ? db.prepare('SELECT filename, s3_key, doc_type FROM contact_documents WHERE contact_id = ?').all(deal.contact_id) as any[]
      : [];
    const detectedBanks = FINTECH_BANKS.filter(b =>
      allDocRows.some((d: any) => (d.filename || d.s3_key || '').toLowerCase().includes(b))
    );
    const declineNotes = allDocRows
      .filter((d: any) => d.doc_type === 'decline_note')
      .map((d: any) => d.filename || '');

    db.close();
    res.json({
      deal: { ...deal, lender_matches, existing_advances },
      contact,
      offers,
      documents,
      underwriting: uw ? {
        version: uw.version,
        avg_monthly_revenue: uw.avg_monthly_revenue,
        revenue_by_month,
        red_flags: uw_red_flags,
        qualification_notes: uw_notes,
        nsf_count,
        negative_days,
        position: uw.position,
        status: uw.status,
        max_recommended_funding: uw.max_recommended_funding,
        analyst: uw.analyst,
        analysis_date: uw.analysis_date,
      } : null,
      fintech_banks: detectedBanks,
      decline_notes: declineNotes,
    });
  } catch (err: any) {
    logger.error('GET /deals/:dealId error', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/v1/deals ─────────────────────────────────────────
dealsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { contact_id, phone, amount_requested, notes } = req.body;
    const db = getDb();
    const id = randomUUID();
    const now = new Date().toISOString();

    // Look up contact for profile fields
    let contact: any = null;
    if (contact_id) {
      contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contact_id);
    } else if (phone) {
      contact = db.prepare('SELECT * FROM contacts WHERE phone = ?').get(phone);
    }

    const business = contact?.business || req.body.business || '';
    const industry = contact?.industry || '';
    const state = contact?.state || '';
    const monthly_revenue = parseFloat(contact?.monthly_revenue) || 0;
    const credit_score = contact?.credit_score || '';
    const avg_daily_balance = req.body.avg_daily_balance || 0;
    const existing_advances = req.body.existing_advances || '[]';
    const position = req.body.position || '';

    // Run lender match
    let lender_matches: any[] = [];
    try {
      const profile = {
        credit_score: parseInt(credit_score) || 0,
        monthly_revenue,
        state,
        industry,
        existing_positions: JSON.parse(typeof existing_advances === 'string' ? existing_advances : JSON.stringify(existing_advances)).length || 0,
        amount_requested: amount_requested || 0,
      };
      const result = execSync(
        `python3 ${MATCH_SCRIPT} --format json --json '${JSON.stringify(profile)}'`,
        { encoding: 'utf-8', timeout: 30000 }
      );
      lender_matches = JSON.parse(result);
    } catch (e: any) {
      logger.warn('Lender match failed on deal create', { err: e.message });
    }

    db.prepare(`
      INSERT INTO deals (id, contact_id, phone, business, status, created_at, updated_at,
        notes, industry, state, monthly_revenue, credit_score, avg_daily_balance,
        existing_advances, amount_requested, position, lender_matches)
      VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, contact?.id || contact_id || null, phone || contact?.phone || null,
      business, now, now, notes || null, industry, state, monthly_revenue,
      credit_score, avg_daily_balance,
      typeof existing_advances === 'string' ? existing_advances : JSON.stringify(existing_advances),
      amount_requested || null, position, JSON.stringify(lender_matches)
    );

    const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(id);
    db.close();
    res.json({ ...deal as any, lender_matches });
  } catch (err: any) {
    logger.error('POST /deals error', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/v1/deals/:dealId/refresh-matches ─────────────────
dealsRouter.post('/:dealId/refresh-matches', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.dealId) as any;
    if (!deal) { db.close(); res.status(404).json({ error: 'Deal not found' }); return; }

    let existingCount = 0;
    try { existingCount = JSON.parse(deal.existing_advances || '[]').length; } catch {}

    const profile = {
      credit_score: parseInt(deal.credit_score) || 0,
      monthly_revenue: deal.monthly_revenue || 0,
      state: deal.state || '',
      industry: deal.industry || '',
      existing_positions: existingCount,
      amount_requested: deal.amount_requested || 0,
    };

    const result = execSync(
      `python3 ${MATCH_SCRIPT} --format json --json '${JSON.stringify(profile)}'`,
      { encoding: 'utf-8', timeout: 30000 }
    );
    const lender_matches = JSON.parse(result);

    db.prepare('UPDATE deals SET lender_matches = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(lender_matches), new Date().toISOString(), deal.id);
    db.close();

    res.json({ lender_matches, refreshed: true });
  } catch (err: any) {
    logger.error('refresh-matches error', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/v1/deals/:dealId/offer ─────────────────────────────
dealsRouter.put('/:dealId/offer', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.dealId) as any;
    if (!deal) { db.close(); res.status(404).json({ error: 'Deal not found' }); return; }

    const {
      lender_id, lender_name, offer_amount, factor_rate, term_months,
      payment_amount, payment_frequency, buy_rate, sell_rate,
      commission_pct, notes, status, requested_amount,
    } = req.body;

    const total_payback = (offer_amount || 0) * (factor_rate || 1);
    const commission_dollars = (offer_amount || 0) * ((sell_rate || 0) - (buy_rate || 0));
    const now = new Date().toISOString();

    // Check for existing offer from same lender
    const existing = db.prepare(
      'SELECT id FROM lender_offers WHERE deal_id = ? AND lender_name = ?'
    ).get(deal.id, lender_name) as any;

    if (existing) {
      db.prepare(`
        UPDATE lender_offers SET
          offer_amount = ?, factor_rate = ?, term_months = ?, payment_amount = ?,
          payment_frequency = ?, total_payback = ?, buy_rate = ?, sell_rate = ?,
          commission_pct = ?, commission_dollars = ?, notes = ?, status = ?,
          requested_amount = ?, received_at = ?
        WHERE id = ?
      `).run(
        offer_amount, factor_rate, term_months, payment_amount,
        payment_frequency || 'daily', total_payback, buy_rate, sell_rate,
        commission_pct, commission_dollars, notes, status || 'approved',
        requested_amount || deal.amount_requested, now, existing.id
      );
      db.prepare('UPDATE deals SET updated_at = ? WHERE id = ?').run(now, deal.id);
      db.close();
      res.json({ id: existing.id, updated: true });
    } else {
      const id = randomUUID();
      db.prepare(`
        INSERT INTO lender_offers (id, deal_id, contact_id, lender_id, lender_name, status,
          offer_amount, requested_amount, factor_rate, term_months, payment_amount,
          payment_frequency, total_payback, buy_rate, sell_rate, commission_pct,
          commission_dollars, notes, received_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, deal.id, deal.contact_id, lender_id, lender_name, status || 'approved',
        offer_amount, requested_amount || deal.amount_requested, factor_rate, term_months,
        payment_amount, payment_frequency || 'daily', total_payback,
        buy_rate, sell_rate, commission_pct, commission_dollars, notes, now
      );
      // Update deal status
      db.prepare('UPDATE deals SET status = ?, updated_at = ? WHERE id = ?')
        .run('offers_received', now, deal.id);
      db.close();
      res.json({ id, created: true });
    }
  } catch (err: any) {
    logger.error('PUT /deals/:dealId/offer error', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/v1/deals/:dealId/send-pitch ───────────────────────
dealsRouter.post('/:dealId/send-pitch', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.dealId) as any;
    if (!deal) { db.close(); res.status(404).json({ error: 'Deal not found' }); return; }

    const contact = deal.contact_id
      ? db.prepare('SELECT * FROM contacts WHERE id = ?').get(deal.contact_id) as any
      : null;

    const { offer_ids, agent_email } = req.body;

    // Get selected offers (or all approved)
    let offers: any[];
    if (offer_ids && offer_ids.length > 0) {
      const placeholders = offer_ids.map(() => '?').join(',');
      offers = db.prepare(`SELECT * FROM lender_offers WHERE id IN (${placeholders})`).all(...offer_ids);
    } else {
      offers = db.prepare("SELECT * FROM lender_offers WHERE deal_id = ? AND status = 'approved'").all(deal.id);
    }
    db.close();

    // Build pitch HTML
    const offersHtml = offers.map((o: any, i: number) => `
      <tr style="border-bottom:1px solid #333;">
        <td style="padding:10px;color:#fff;">${i + 1}. ${o.lender_name}</td>
        <td style="padding:10px;color:#4ade80;font-weight:bold;">$${Number(o.offer_amount || 0).toLocaleString()}</td>
        <td style="padding:10px;color:#ccc;">${o.factor_rate || 'N/A'}</td>
        <td style="padding:10px;color:#ccc;">${o.term_months || 'N/A'}mo</td>
        <td style="padding:10px;color:#ccc;">$${Number(o.payment_amount || 0).toLocaleString()}/${o.payment_frequency || 'daily'}</td>
        <td style="padding:10px;color:#facc15;">$${Number(o.commission_dollars || 0).toLocaleString()}</td>
      </tr>
    `).join('');

    let existingStr = '';
    try {
      const adv = JSON.parse(deal.existing_advances || '[]');
      if (adv.length > 0) {
        existingStr = adv.map((a: any) => `${a.lender}: $${a.daily_payment}/day`).join(', ');
      }
    } catch {}

    const html = `
    <div style="font-family:Arial,sans-serif;background:#0f0f23;padding:30px;border-radius:12px;max-width:800px;">
      <h1 style="color:#818cf8;margin:0 0 20px;">📋 Pitch Report — ${deal.business}</h1>
      <table style="width:100%;color:#ccc;font-size:14px;margin-bottom:20px;">
        <tr><td style="padding:4px 10px;color:#999;">Business</td><td style="color:#fff;font-weight:bold;">${deal.business}</td></tr>
        <tr><td style="padding:4px 10px;color:#999;">Owner</td><td style="color:#fff;">${contact?.name || '—'}</td></tr>
        <tr><td style="padding:4px 10px;color:#999;">Phone</td><td style="color:#fff;">${deal.phone || '—'}</td></tr>
        <tr><td style="padding:4px 10px;color:#999;">Industry</td><td style="color:#fff;">${deal.industry || '—'}</td></tr>
        <tr><td style="padding:4px 10px;color:#999;">State</td><td style="color:#fff;">${deal.state || '—'}</td></tr>
        <tr><td style="padding:4px 10px;color:#999;">Monthly Revenue</td><td style="color:#4ade80;font-weight:bold;">$${Number(deal.monthly_revenue || 0).toLocaleString()}/mo</td></tr>
        <tr><td style="padding:4px 10px;color:#999;">Credit Score</td><td style="color:#fff;">${deal.credit_score || '—'}</td></tr>
        <tr><td style="padding:4px 10px;color:#999;">Avg Daily Balance</td><td style="color:#fff;">$${Number(deal.avg_daily_balance || 0).toLocaleString()}</td></tr>
        <tr><td style="padding:4px 10px;color:#999;">Amount Requested</td><td style="color:#fff;font-weight:bold;">$${Number(deal.amount_requested || 0).toLocaleString()}</td></tr>
        <tr><td style="padding:4px 10px;color:#999;">Position</td><td style="color:#fff;">${deal.position || '—'}</td></tr>
        ${existingStr ? `<tr><td style="padding:4px 10px;color:#999;">Existing Advances</td><td style="color:#f87171;">${existingStr}</td></tr>` : ''}
      </table>
      ${deal.notes ? `<div style="background:#1a1a2e;border-left:3px solid #818cf8;padding:12px;margin-bottom:20px;border-radius:6px;"><p style="color:#999;margin:0 0 4px;font-size:12px;">Deal Notes</p><p style="color:#fff;margin:0;">${deal.notes}</p></div>` : ''}
      <h2 style="color:#4ade80;font-size:16px;">Offers (${offers.length})</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
        <tr style="background:#1a1a2e;"><th style="padding:8px;color:#999;text-align:left;">Lender</th><th style="padding:8px;color:#999;text-align:left;">Amount</th><th style="padding:8px;color:#999;text-align:left;">Factor</th><th style="padding:8px;color:#999;text-align:left;">Term</th><th style="padding:8px;color:#999;text-align:left;">Payment</th><th style="padding:8px;color:#999;text-align:left;">Commission</th></tr>
        ${offersHtml}
      </table>
      <p style="color:#666;font-size:11px;">Generated by CloserAI Deal Engine · ${new Date().toISOString()}</p>
    </div>`;

    // Send via SES Lambda
    const sesPayload = {
      action: 'send_email',
      to: agent_email || 'jcobian@chccapitalgroup.com',
      cc: 'jclaude@chccapitalgroup.com',
      subject: `📋 Pitch Report: ${deal.business} — ${offers.length} Offer${offers.length !== 1 ? 's' : ''}`,
      html,
    };

    const sesResp = await lambda.send(new InvokeCommand({
      FunctionName: 'CHC-SES-Sender',
      InvocationType: 'RequestResponse',
      Payload: Buffer.from(JSON.stringify(sesPayload)),
    }));

    const sesResult = sesResp.Payload ? JSON.parse(Buffer.from(sesResp.Payload).toString()) : {};
    logger.info('Pitch report sent', { dealId: deal.id, to: sesPayload.to });

    res.json({ sent: true, to: sesPayload.to, cc: sesPayload.cc, offers: offers.length, ses: sesResult });
  } catch (err: any) {
    logger.error('send-pitch error', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/v1/deals/:dealId/compile-pitch ────────────────────
dealsRouter.post('/:dealId/compile-pitch', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.dealId) as any;
    if (!deal) { db.close(); res.status(404).json({ error: 'Deal not found' }); return; }

    const { offer_ids } = req.body;
    let offers: any[];
    if (offer_ids && offer_ids.length > 0) {
      const ph = offer_ids.map(() => '?').join(',');
      offers = db.prepare(`SELECT * FROM lender_offers WHERE id IN (${ph})`).all(...offer_ids);
    } else {
      offers = db.prepare("SELECT * FROM lender_offers WHERE deal_id = ? AND status = 'approved'").all(deal.id);
    }
    db.close();

    let strategy = '';
    if (offers.length >= 2) {
      const best = offers.reduce((a: any, b: any) => (a.commission_dollars || 0) > (b.commission_dollars || 0) ? a : b);
      strategy = `Lead with ${best.lender_name} ($${Number(best.offer_amount).toLocaleString()} at ${best.factor_rate}x). Commission: $${Number(best.commission_dollars || 0).toLocaleString()}. Present as the primary recommendation, show alternatives as backup options.`;
    } else if (offers.length === 1) {
      strategy = `Single offer from ${offers[0].lender_name}. Present confidently — "$${Number(offers[0].offer_amount).toLocaleString()} approved, let's get you funded today."`;
    }

    res.json({ strategy, offers: offers.length, compiled: true });
  } catch (err: any) {
    logger.error('compile-pitch error', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/v1/deals/:dealId/send-offer-sms ──────────────────
dealsRouter.post('/:dealId/send-offer-sms', async (req: Request, res: Response) => {
  try {
    const { offer_id, merchant_phone, merchant_name } = req.body;
    if (!offer_id || !merchant_phone) {
      res.status(400).json({ error: 'offer_id and merchant_phone required' });
      return;
    }

    const db = getDb();
    const offer = db.prepare('SELECT * FROM lender_offers WHERE id = ?').get(offer_id) as any;
    if (!offer) { db.close(); res.status(404).json({ error: 'Offer not found' }); return; }

    const acceptUrl = `https://agents.chccapitalgroup.com/offer/${offer_id}`;
    const payFreq = offer.payment_frequency || 'day';
    const message = `Hey ${merchant_name || 'there'}, great news — you're approved for $${Number(offer.offer_amount || 0).toLocaleString()} at $${Number(offer.payment_amount || 0).toLocaleString()}/${payFreq}. Review your offer and confirm here: ${acceptUrl}`;

    // Update offer with acceptance URL
    db.prepare('UPDATE lender_offers SET acceptance_url = ? WHERE id = ?').run(acceptUrl, offer_id);
    db.close();

    // Send SMS via TextTorrent
    const ttSid = process.env.TT_SID;
    const ttKey = process.env.TT_KEY;
    if (!ttSid || !ttKey) {
      res.status(500).json({ error: 'TextTorrent credentials not configured' });
      return;
    }

    const digits = merchant_phone.replace(/\D/g, '').slice(-10);
    const ttResp = await fetch('https://api.texttorrent.com/api/v1/inbox/chat', {
      method: 'POST',
      headers: {
        'X-API-SID': ttSid,
        'X-API-PUBLIC-KEY': ttKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to: digits, message }),
    });

    const ttResult = await ttResp.json().catch(() => ({}));
    logger.info('Offer SMS sent', { offer_id, phone: merchant_phone, tt_status: ttResp.status });

    res.json({ sent: true, phone: merchant_phone, message, acceptance_url: acceptUrl, tt: ttResult });
  } catch (err: any) {
    logger.error('send-offer-sms error', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/v1/deals/offer/:offerId (public) ──────────────────
dealsRouter.get('/offer/:offerId', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const offer = db.prepare('SELECT * FROM lender_offers WHERE id = ?').get(req.params.offerId) as any;
    if (!offer) { db.close(); res.status(404).json({ error: 'Offer not found' }); return; }

    const deal = db.prepare('SELECT business, phone FROM deals WHERE id = ?').get(offer.deal_id) as any;
    db.close();

    // Sanitized — no commission data
    res.json({
      id: offer.id,
      lender_name: offer.lender_name,
      offer_amount: offer.offer_amount,
      factor_rate: offer.factor_rate,
      term_months: offer.term_months,
      payment_amount: offer.payment_amount,
      payment_frequency: offer.payment_frequency,
      total_payback: offer.total_payback,
      status: offer.status,
      business: deal?.business || '',
      merchant_accepted: offer.merchant_accepted,
    });
  } catch (err: any) {
    logger.error('GET /deals/offer/:offerId error', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/v1/deals/offer/:offerId/accept ───────────────────
dealsRouter.post('/offer/:offerId/accept', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const offer = db.prepare('SELECT * FROM lender_offers WHERE id = ?').get(req.params.offerId) as any;
    if (!offer) { db.close(); res.status(404).json({ error: 'Offer not found' }); return; }

    const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(offer.deal_id) as any;

    const { files } = req.body; // [{name, data (base64)}]
    const uploaded: string[] = [];

    if (files && Array.isArray(files)) {
      for (const file of files) {
        const key = `merchant-accepted/${offer.id}/${file.name}`;
        const body = Buffer.from(file.data, 'base64');
        await s3.send(new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
          Body: body,
          ContentType: file.contentType || 'application/octet-stream',
        }));
        uploaded.push(key);
      }
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE lender_offers SET status = 'accepted', merchant_accepted = 1,
        acceptance_docs = ?, accepted_at = ? WHERE id = ?
    `).run(JSON.stringify(uploaded), now, offer.id);

    db.prepare("UPDATE deals SET status = 'accepted', selected_offer_id = ?, updated_at = ? WHERE id = ?")
      .run(offer.id, now, offer.deal_id);
    db.close();

    // Send SES alert
    try {
      await lambda.send(new InvokeCommand({
        FunctionName: 'CHC-SES-Sender',
        InvocationType: 'Event',
        Payload: Buffer.from(JSON.stringify({
          action: 'send_email',
          to: 'jcobian@chccapitalgroup.com',
          cc: 'jclaude@chccapitalgroup.com',
          subject: `🎉 OFFER ACCEPTED: ${deal?.business || 'Unknown'} — ${offer.lender_name} $${Number(offer.offer_amount).toLocaleString()}`,
          html: `<div style="font-family:Arial;background:#0f0f23;padding:30px;border-radius:12px;max-width:600px;">
            <h1 style="color:#4ade80;">🎉 Merchant Accepted Offer!</h1>
            <p style="color:#fff;">Business: <b>${deal?.business}</b></p>
            <p style="color:#fff;">Lender: <b>${offer.lender_name}</b></p>
            <p style="color:#4ade80;font-size:24px;font-weight:bold;">$${Number(offer.offer_amount).toLocaleString()}</p>
            <p style="color:#ccc;">Factor: ${offer.factor_rate} · Term: ${offer.term_months}mo</p>
            <p style="color:#facc15;">Commission: $${Number(offer.commission_dollars || 0).toLocaleString()}</p>
            ${uploaded.length > 0 ? `<p style="color:#ccc;">${uploaded.length} document(s) uploaded to S3</p>` : ''}
          </div>`,
        })),
      }));
    } catch (e: any) {
      logger.warn('SES alert failed on offer accept', { err: e.message });
    }

    res.json({ accepted: true, offer_id: offer.id, files_uploaded: uploaded.length });
  } catch (err: any) {
    logger.error('POST /deals/offer/:offerId/accept error', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ─── Pitch Frames: Bedrock + Cache ────────────────────────────────
const PITCH_CACHE_DIR = '/home/ubuntu/.openclaw/workspace/data/pitch_cache';
const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });
const HAIKU_MODEL = 'us.anthropic.claude-3-5-haiku-20241022-v1:0';

const FRAME_DEFS = [
  { id: 'carrot', name: 'Carrot — Bronze to Silver', emoji: '🥕', when_to_use: "Merchant got less than asked or is new to funding. Frame: You're starting at Bronze. Pay on time 90-150 days → we upgrade you to Silver (LOC, equipment, better rates, 8-15mo terms). Build your payment history, we build your funding capacity." },
  { id: 'refinance', name: 'Refinance', emoji: '🔄', when_to_use: 'Has existing advance — consolidate + add working capital, lower daily payment' },
  { id: 'credit-builder', name: 'Credit Builder', emoji: '🏗️', when_to_use: 'Thin credit / below-average profile — builds credit for better future terms' },
  { id: 'growth-play', name: 'Growth Play', emoji: '🚀', when_to_use: 'Strong revenue, clear use of funds — ROI play, returns beat payback' },
  { id: 'urgency', name: 'Urgency', emoji: '⏰', when_to_use: 'Rate-sensitive or time-limited offer — lock in now or lose it' },
  { id: 'best-available', name: 'Best Available', emoji: '🤝', when_to_use: 'Clean file, strong offer — best available for this profile, take it now' },
];

function getRecommendedFrames(deal: any, offers: any[]): string[] {
  const recommended: string[] = [];
  let existingAdv: any[] = [];
  try { existingAdv = JSON.parse(deal.existing_advances || '[]'); } catch {}

  if (existingAdv.length > 0) recommended.push('refinance');
  if ((parseInt(deal.credit_score) || 999) < 620) recommended.push('credit-builder');
  // Check revenue growth from deal notes or monthly_revenue
  if (deal.monthly_revenue > 30000 && existingAdv.length === 0) recommended.push('growth-play');
  // Recommend carrot when merchant got less than they asked for
  const gotLessThanAsked = deal.amount_requested && offers.length > 0 && offers[0]?.offer_amount && Number(offers[0].offer_amount) < Number(deal.amount_requested) * 0.8;
  if (gotLessThanAsked && !recommended.includes('carrot')) recommended.push('carrot');
  if (existingAdv.length === 0 && !gotLessThanAsked && !recommended.includes('growth-play')) recommended.push('growth-play');
  if (recommended.length === 0) recommended.push('best-available');
  return recommended.slice(0, 2);
}

dealsRouter.post('/:dealId/pitch-frames', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.dealId) as any;
    if (!deal) { db.close(); res.status(404).json({ error: 'Deal not found' }); return; }

    const contact = deal.contact_id
      ? db.prepare('SELECT * FROM contacts WHERE id = ?').get(deal.contact_id) as any
      : null;

    const { offer_ids } = req.body;
    let offers: any[];
    if (offer_ids && offer_ids.length > 0) {
      const ph = offer_ids.map(() => '?').join(',');
      offers = db.prepare(`SELECT * FROM lender_offers WHERE id IN (${ph})`).all(...offer_ids);
    } else {
      offers = db.prepare("SELECT * FROM lender_offers WHERE deal_id = ? AND status = 'approved'").all(deal.id);
    }
    db.close();

    // Check cache (1hr TTL)
    const cacheFile = path.join(PITCH_CACHE_DIR, `${deal.id}.json`);
    try {
      if (fs.existsSync(cacheFile)) {
        const stat = fs.statSync(cacheFile);
        const ageMs = Date.now() - stat.mtimeMs;
        if (ageMs < 3600_000) {
          const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
          logger.info('Pitch frames served from cache', { dealId: deal.id });
          res.json(cached);
          return;
        }
      }
    } catch {}

    // Build offer summary for prompt
    const offerSummary = offers.map((o: any) =>
      `${o.lender_name}: $${Number(o.offer_amount).toLocaleString()} @ ${o.factor_rate}x factor, ${o.term_months || 'N/A'} months, $${Number(o.payment_amount).toLocaleString()}/${o.payment_frequency || 'day'}`
    ).join('\n');

    let existingAdv = '[]';
    try {
      const adv = JSON.parse(deal.existing_advances || '[]');
      existingAdv = adv.map((a: any) => `${a.lender}: $${a.daily_payment}/day`).join(', ') || 'None';
    } catch { existingAdv = 'None'; }

    const lockDate = new Date(Date.now() + 3 * 86400_000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const prompt = `You are Jacob, a Miami-based business funding closer. Generate pitches for ALL 6 frames for this merchant deal.

Merchant & Offer Details:
- Business: ${deal.business}, Industry: ${deal.industry || 'N/A'}, State: ${deal.state || 'N/A'}
- Revenue: $${Number(deal.monthly_revenue || 0).toLocaleString()}/mo, Credit: ${deal.credit_score || 'N/A'}
- Offers:\n${offerSummary || 'No specific offer selected'}
- Existing advances: ${existingAdv}
- Requested: $${Number(deal.amount_requested || 0).toLocaleString()}
- Owner: ${contact?.name || 'the merchant'}

For each frame, generate conversational, direct pitch text in Jacob's voice (Miami energy, no fluff).
Use the actual numbers from the deal. For urgency frame, use ${lockDate} as the deadline.

Return a JSON array with exactly 6 objects, one per frame, in this order:
1. Carrot (Bronze-to-Silver frame): Merchant asked for more than they got. Frame: "You are at Bronze tier. Take this deal, pay on time for 90-150 days, and we automatically upgrade you to Silver — revolving lines of credit, equipment finance, better rates, 8-15 month terms. This is round 1. Your payment history with us builds your funding capacity. The bigger money opens up after you prove yourself here."
2. Refinance (consolidation framing)
3. Credit Builder (credit improvement framing)
4. Growth Play (ROI framing)
5. Urgency (time pressure framing)
6. Best Available (straightforward best offer framing)

Each object:
{
  "sms_text": "Under 160 chars. Conversational, direct. No fluff. Include a key number.",
  "email_subject": "Subject line under 60 chars",
  "email_html": "3-4 sentence HTML email body. Professional but warm. Include specific numbers from the deal. Use <b> for emphasis."
}

Return ONLY the JSON array, no markdown, no explanation.`;

    const bedrockResp = await bedrock.send(new InvokeModelCommand({
      modelId: HAIKU_MODEL,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    }));

    const respBody = JSON.parse(new TextDecoder().decode(bedrockResp.body));
    const rawText = respBody.content?.[0]?.text || '[]';
    
    // Extract JSON array from response
    let generatedFrames: any[];
    try {
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      generatedFrames = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
    } catch (e) {
      logger.error('Failed to parse Haiku response', { raw: rawText.slice(0, 500) });
      generatedFrames = [];
    }

    const recommendedIds = getRecommendedFrames(deal, offers);

    const frames = FRAME_DEFS.map((def, i) => ({
      ...def,
      sms_text: generatedFrames[i]?.sms_text || `Hey, you're approved for funding. Let's talk. - Jacob`,
      email_subject: generatedFrames[i]?.email_subject || `Your funding offer is ready`,
      email_html: generatedFrames[i]?.email_html || `<p>You've been approved for business funding. Let's discuss the details.</p>`,
      recommended: recommendedIds.includes(def.id),
    }));

    const result = {
      frames,
      deal_id: deal.id,
      business: deal.business,
      contact_name: contact?.name || '',
      contact_phone: deal.phone || contact?.phone || '',
      contact_email: contact?.email || '',
      monthly_revenue: deal.monthly_revenue,
      credit_score: deal.credit_score,
      existing_advances: deal.existing_advances,
      avg_daily_balance: deal.avg_daily_balance,
      notes: deal.notes,
      offers,
      generated_at: new Date().toISOString(),
    };

    // Cache
    try {
      fs.mkdirSync(PITCH_CACHE_DIR, { recursive: true });
      fs.writeFileSync(cacheFile, JSON.stringify(result, null, 2));
    } catch (e: any) { logger.warn('Cache write failed', { err: e.message }); }

    logger.info('Pitch frames generated', { dealId: deal.id, frameCount: frames.length });
    res.json(result);
  } catch (err: any) {
    logger.error('POST /deals/:dealId/pitch-frames error', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ─── Send Pitch Frame (SMS / Email / Both) ───────────────────────
dealsRouter.post('/:dealId/send-pitch-frame', async (req: Request, res: Response) => {
  try {
    const { frame_id, channel, merchant_phone, merchant_email, sms_text, email_subject, email_html, offer_ids } = req.body;
    if (!frame_id || !channel) {
      res.status(400).json({ error: 'frame_id and channel required' }); return;
    }

    const db = getDb();
    const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.dealId) as any;
    if (!deal) { db.close(); res.status(404).json({ error: 'Deal not found' }); return; }

    const results: { sms_sent: boolean; email_sent: boolean; errors: string[] } = {
      sms_sent: false, email_sent: false, errors: [],
    };

    // SMS via TextTorrent
    if ((channel === 'sms' || channel === 'both') && merchant_phone) {
      try {
        const ttSid = process.env.TT_SID;
        const ttKey = process.env.TT_KEY;
        if (!ttSid || !ttKey) throw new Error('TextTorrent credentials not configured');

        const digits = merchant_phone.replace(/\D/g, '').slice(-10);
        const ttResp = await fetch('https://api.texttorrent.com/api/v1/inbox/chat', {
          method: 'POST',
          headers: {
            'X-API-SID': ttSid,
            'X-API-PUBLIC-KEY': ttKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ to: digits, message: sms_text }),
        });
        if (!ttResp.ok) throw new Error(`TT ${ttResp.status}`);
        results.sms_sent = true;
        logger.info('Pitch SMS sent', { dealId: deal.id, frame: frame_id, phone: merchant_phone });
      } catch (e: any) {
        results.errors.push(`SMS: ${e.message}`);
        logger.error('Pitch SMS failed', { err: e.message });
      }
    }

    // Email via SES Lambda
    if ((channel === 'email' || channel === 'both') && merchant_email) {
      try {
        const sesPayload = {
          action: 'send_email',
          to: merchant_email,
          cc: 'jclaude@chccapitalgroup.com',
          subject: email_subject || `Your funding offer from CHC Capital`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">${email_html}</div>`,
        };
        await lambda.send(new InvokeCommand({
          FunctionName: 'CHC-SES-Sender',
          InvocationType: 'RequestResponse',
          Payload: Buffer.from(JSON.stringify(sesPayload)),
        }));
        results.email_sent = true;
        logger.info('Pitch email sent', { dealId: deal.id, frame: frame_id, to: merchant_email });
      } catch (e: any) {
        results.errors.push(`Email: ${e.message}`);
        logger.error('Pitch email failed', { err: e.message });
      }
    }

    // Log event
    try {
      const now = new Date().toISOString();
      db.prepare(`INSERT INTO lender_offers_events (id, deal_id, event_type, details, created_at)
        VALUES (?, ?, 'pitch_sent', ?, ?)`).run(
        randomUUID(), deal.id,
        JSON.stringify({ frame_id, channel, sms_sent: results.sms_sent, email_sent: results.email_sent }),
        now
      );
    } catch (e: any) {
      // Events table might not exist — not critical
      logger.warn('Event log failed (non-critical)', { err: e.message });
    }

    db.close();
    res.json(results);
  } catch (err: any) {
    logger.error('POST /deals/:dealId/send-pitch-frame error', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});


