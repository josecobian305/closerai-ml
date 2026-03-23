import { Router } from 'express';
import { logger } from '../logger';
import crypto from 'crypto';
import { execSync } from 'child_process';
import fs from 'fs';

export const onboardingRouter = Router();

// In-memory store (swap for SQLite/DynamoDB in prod)
const sessions: Record<string, any> = {};

const ADMIN_EMAIL = 'jcobian@chccapitalgroup.com';
const FROM_EMAIL = 'jclaude@chccapitalgroup.com';
const JACOB_NAME = 'Jacob Claude';
const ANGIE_NAME = 'Angie Ramirez';
const BASE_URL = 'https://closerai.apipay.cash';

// ── Helper: send email via himalaya/SES ───────────────────────────────────────
function sendEmail(to: string, subject: string, plainBody: string, htmlBody: string, cc?: string): boolean {
  try {
    let headers = `From: ${FROM_EMAIL}\nTo: ${to}\nSubject: ${subject}`;
    if (cc) headers += `\nCc: ${cc}`;
    const mml = `${headers}\n\n<#multipart type=alternative>\n${plainBody}\n<#part type=text/html>\n${htmlBody}\n<#/multipart>`;
    const tmpPath = `/tmp/onboard_email_${Date.now()}_${Math.random().toString(36).slice(2)}.mml`;
    fs.writeFileSync(tmpPath, mml);
    execSync(`cat ${tmpPath} | himalaya template send`, { timeout: 15000 });
    try { fs.unlinkSync(tmpPath); } catch {}
    logger.info(`Email sent: ${subject} → ${to}${cc ? ` (CC: ${cc})` : ''}`);
    return true;
  } catch (e: any) {
    logger.error(`Email send failed: ${subject} → ${to}`, { error: String(e) });
    return false;
  }
}

// ── HTML email template ───────────────────────────────────────────────────────
function emailHtml(title: string, bodyContent: string): string {
  return `<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#070710;font-family:'Inter',Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:40px 24px;">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="display:inline-block;width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#635bff,#4f46e5);line-height:48px;text-align:center;font-size:24px;">⚡</div>
    <div style="margin-top:12px;font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.5px;">CloserAI</div>
  </div>
  <div style="background:#12121c;border:1px solid rgba(99,91,255,0.2);border-radius:16px;padding:32px;">
    <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#fff;">${title}</h1>
    ${bodyContent}
  </div>
  <div style="text-align:center;margin-top:24px;font-size:11px;color:#475569;">
    CloserAI by CHC Capital Group · Powered by AI<br>
    <a href="${BASE_URL}" style="color:#635bff;text-decoration:none;">closerai.apipay.cash</a>
  </div>
</div></body></html>`;
}

// POST /api/v1/onboarding/start — create onboarding session
onboardingRouter.post('/start', (req, res) => {
  const id = crypto.randomUUID();
  sessions[id] = { id, step: 1, createdAt: new Date().toISOString(), data: {} };
  logger.info(`Onboarding session started: ${id}`);
  res.json({ sessionId: id, step: 1 });
});

// GET /api/v1/onboarding/:id — get session state
onboardingRouter.get('/:id', (req, res) => {
  const session = sessions[req.params.id];
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
});

// POST /api/v1/onboarding/:id/step — save step data
onboardingRouter.post('/:id/step', (req, res) => {
  const session = sessions[req.params.id];
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const { step, data } = req.body;
  session.step = step;
  session.data = { ...session.data, ...data };
  res.json({ ok: true, step });
});

// POST /api/v1/onboarding/:id/assets — upload training assets metadata
onboardingRouter.post('/:id/assets', (req, res) => {
  const session = sessions[req.params.id];
  if (!session) return res.status(404).json({ error: 'Session not found' });
  session.data.assets = req.body.assets || [];
  res.json({ ok: true, count: session.data.assets.length });
});

// ─── DEMO RUN (no session required) — fires real emails ─────────────────────
onboardingRouter.post('/demo/demo-run', (req, res) => {
  const { runId, customerName, industry, revenue, businessName, email } = req.body;

  const bName = businessName || 'Your Business';
  const userEmail = email || ADMIN_EMAIL;

  // ── Email 1: Business owner notification (FROM Jacob, CC user) ──────────
  const ownerSubject = `🧪 Demo Run #${runId} — ${customerName} just entered your pipeline`;
  const ownerHtml = emailHtml(ownerSubject, `
    <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 16px;">
      Hi! This is <strong style="color:#a5b4fc;">${JACOB_NAME}</strong>, your operations agent.
    </p>
    <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 20px;">
      A new test lead just came through your onboarding demo. Here's what happened:
    </p>
    <div style="background:rgba(99,91,255,0.08);border:1px solid rgba(99,91,255,0.2);border-radius:10px;padding:16px;margin-bottom:20px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="color:#64748b;font-size:12px;padding:4px 0;">Business</td><td style="color:#fff;font-size:14px;font-weight:600;text-align:right;">${customerName}</td></tr>
        <tr><td style="color:#64748b;font-size:12px;padding:4px 0;">Industry</td><td style="color:#fff;font-size:14px;text-align:right;">${industry || 'General'}</td></tr>
        <tr><td style="color:#64748b;font-size:12px;padding:4px 0;">Revenue</td><td style="color:#fff;font-size:14px;text-align:right;">${revenue || '$50,000/mo'}</td></tr>
        <tr><td style="color:#64748b;font-size:12px;padding:4px 0;">Status</td><td style="color:#22c55e;font-size:14px;font-weight:600;text-align:right;">✅ Pipeline Complete</td></tr>
        <tr><td style="color:#64748b;font-size:12px;padding:4px 0;">Sent by</td><td style="color:#a5b4fc;font-size:14px;text-align:right;">${JACOB_NAME}</td></tr>
      </table>
    </div>
    <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 20px;">
      All 6 stages passed: Lead In → Underwriting → Deal → Offer → Pitch Review → Approval Link
    </p>
    <a href="${BASE_URL}/app/" style="display:inline-block;background:linear-gradient(135deg,#635bff,#4f46e5);color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">
      View in Dashboard →
    </a>
    <p style="color:#64748b;font-size:11px;margin-top:20px;">— ${JACOB_NAME}, ${bName}</p>
  `);
  const ownerPlain = `From: ${JACOB_NAME}\n\nDemo Run #${runId} — ${customerName}\nIndustry: ${industry || 'General'}\nRevenue: ${revenue || '$50,000/mo'}\nStatus: Pipeline Complete\n\nAll 6 stages passed.\n\nView: ${BASE_URL}/app/`;

  // ── Email 2: Customer welcome (FROM Angie, CC user) ────────────────────
  const custSubject = `${customerName} — Your funding pre-qualification is ready`;
  const custHtml = emailHtml(custSubject, `
    <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 16px;">
      Hi there! 👋
    </p>
    <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 16px;">
      My name is <strong style="color:#a5b4fc;">${ANGIE_NAME}</strong> and I work with <strong style="color:#fff;">${bName}</strong>.
    </p>
    <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 20px;">
      Based on your profile, we've pre-qualified you for funding. Here's a quick summary:
    </p>
    <div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:10px;padding:16px;margin-bottom:20px;">
      <div style="font-size:24px;font-weight:800;color:#22c55e;text-align:center;">Pre-Qualified ✅</div>
      <div style="font-size:13px;color:#86efac;text-align:center;margin-top:4px;">Up to $250,000 available</div>
    </div>
    <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 16px;">
      <strong style="color:#fff;">Next steps:</strong><br>
      1. Reply to this email with your last 3 months of bank statements<br>
      2. We'll have your offer ready within 24 hours<br>
      3. Funding as fast as same-day upon approval
    </p>
    <a href="${BASE_URL}/offer/demo-${runId}" style="display:inline-block;background:linear-gradient(135deg,#635bff,#4f46e5);color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">
      View Your Pre-Qualification →
    </a>
    <p style="color:#64748b;font-size:11px;margin-top:20px;">— ${ANGIE_NAME}, ${bName}</p>
  `);
  const custPlain = `From: ${ANGIE_NAME}\n\nHi! My name is ${ANGIE_NAME} from ${bName}.\n\nBased on your profile, we've pre-qualified you for up to $250,000 in funding.\n\nNext steps:\n1. Reply with last 3 months bank statements\n2. Offer ready in 24h\n3. Same-day funding on approval\n\nView: ${BASE_URL}/offer/demo-${runId}`;

  // Jacob sends owner email → to admin, CC user
  const ccUser = (userEmail && userEmail !== ADMIN_EMAIL) ? userEmail : undefined;
  const sent1 = sendEmail(ADMIN_EMAIL, `[Jacob → Owner] ${ownerSubject}`, ownerPlain, ownerHtml, ccUser);
  // Angie sends customer email → to admin, CC user
  const sent2 = sendEmail(ADMIN_EMAIL, `[Angie → Customer] ${custSubject}`, custPlain, custHtml, ccUser);

  // Log the run (no session storage needed)
  logger.info(`Demo run #${runId} complete: ${customerName} — owner=${sent1}, customer=${sent2}`);

  res.json({ ok: true, emailsSent: { owner: sent1, customer: sent2 } });
});

// POST /api/v1/onboarding/:id/confirm — lock in config
onboardingRouter.post('/:id/confirm', (req, res) => {
  const session = sessions[req.params.id];
  if (!session) return res.status(404).json({ error: 'Session not found' });
  session.data.confirmed = true;
  session.data.confirmedAt = new Date().toISOString();
  res.json({ ok: true });
});

// ─── PROVISION — create account + send 2 login emails ────────────────────────
onboardingRouter.post('/provision', async (req, res) => {
  try {
    const {
      businessName, industry, state, phone, email, password,
      monthlyRevenue, dealSize, agentCount,
      aiLevel, botCount, iqLevel, iqModel,
      pipelineStages, assets,
    } = req.body;

    logger.info(`Provisioning account for ${businessName} (${email})`);

    const crmPassword = crypto.randomBytes(8).toString('hex');
    const trainingPassword = crypto.randomBytes(8).toString('hex');
    const accountId = crypto.randomUUID();

    // ── Email 1: CRM Login ───────────────────────────────────────────────
    const crmHtml = emailHtml('Your CloserAI CRM is ready! 🎉', `
      <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 16px;">
        Congratulations! Your AI-powered CRM has been configured and is ready to go.
      </p>
      <div style="background:rgba(99,91,255,0.08);border:1px solid rgba(99,91,255,0.2);border-radius:10px;padding:16px;margin-bottom:20px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="color:#64748b;font-size:12px;padding:6px 0;">Login URL</td><td style="color:#a5b4fc;font-size:14px;text-align:right;"><a href="${BASE_URL}/app/login" style="color:#a5b4fc;">${BASE_URL}/app/login</a></td></tr>
          <tr><td style="color:#64748b;font-size:12px;padding:6px 0;">Email</td><td style="color:#fff;font-size:14px;text-align:right;">${email}</td></tr>
          <tr><td style="color:#64748b;font-size:12px;padding:6px 0;">Temp Password</td><td style="color:#fff;font-size:14px;font-family:monospace;text-align:right;">${crmPassword}</td></tr>
        </table>
      </div>
      <p style="color:#94a3b8;font-size:13px;line-height:1.7;margin:0 0 16px;">
        <strong style="color:#fff;">Your pipeline:</strong> ${(pipelineStages || []).join(' → ') || 'Default pipeline'}<br>
        <strong style="color:#fff;">AI Level:</strong> ${aiLevel}% · <strong style="color:#fff;">Intelligence:</strong> ${iqModel}
      </p>
      <a href="${BASE_URL}/app/login" style="display:inline-block;background:linear-gradient(135deg,#635bff,#4f46e5);color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-size:15px;font-weight:700;">
        Open Your CRM →
      </a>
    `);
    const crmPlain = `Your CloserAI CRM is ready!\n\nLogin: ${BASE_URL}/app/login\nEmail: ${email}\nPassword: ${crmPassword}\n\nPipeline: ${(pipelineStages || []).join(' → ')}\nAI: ${aiLevel}% | Model: ${iqModel}`;

    // ── Email 2: Training Room Login ─────────────────────────────────────
    const trainHtml = emailHtml('Your CloserAI Training Room 🎓', `
      <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 16px;">
        Your Training Room is where you upload scripts, review AI performance, and fine-tune your agents.
      </p>
      <div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:10px;padding:16px;margin-bottom:20px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="color:#64748b;font-size:12px;padding:6px 0;">Login URL</td><td style="color:#86efac;font-size:14px;text-align:right;"><a href="${BASE_URL}/training/login" style="color:#86efac;">${BASE_URL}/training/login</a></td></tr>
          <tr><td style="color:#64748b;font-size:12px;padding:6px 0;">Email</td><td style="color:#fff;font-size:14px;text-align:right;">${email}</td></tr>
          <tr><td style="color:#64748b;font-size:12px;padding:6px 0;">Temp Password</td><td style="color:#fff;font-size:14px;font-family:monospace;text-align:right;">${trainingPassword}</td></tr>
        </table>
      </div>
      <p style="color:#94a3b8;font-size:13px;line-height:1.7;margin:0 0 16px;">
        ${(assets || []).length > 0 ? `We've received your ${assets.length} training asset(s) and they're being processed.` : 'Upload your sales scripts and call recordings to train your AI agents.'}
      </p>
      <a href="${BASE_URL}/training/login" style="display:inline-block;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-size:15px;font-weight:700;">
        Open Training Room →
      </a>
    `);
    const trainPlain = `Your CloserAI Training Room\n\nLogin: ${BASE_URL}/training/login\nEmail: ${email}\nPassword: ${trainingPassword}\n\nUpload scripts and recordings to train your AI.`;

    // Send both to user + admin
    const sent1 = sendEmail(email || ADMIN_EMAIL, 'Your CloserAI CRM is ready! 🎉', crmPlain, crmHtml);
    const sent2 = sendEmail(email || ADMIN_EMAIL, 'Your CloserAI Training Room 🎓', trainPlain, trainHtml);
    // CC admin
    if (email && email !== ADMIN_EMAIL) {
      sendEmail(ADMIN_EMAIL, `[New Account] CRM — ${businessName}`, crmPlain, crmHtml);
      sendEmail(ADMIN_EMAIL, `[New Account] Training — ${businessName}`, trainPlain, trainHtml);
    }

    const account = {
      id: accountId, businessName, industry, state, phone, email,
      aiLevel, botCount, iqLevel, iqModel,
      pipelineStages: pipelineStages || [],
      assetCount: (assets || []).length,
      crmPassword, trainingPassword,
      provisionedAt: new Date().toISOString(),
      status: 'provisioned',
    };
    sessions[`account_${accountId}`] = account;

    logger.info(`Account provisioned: ${accountId} for ${businessName} — emails: CRM=${sent1}, Training=${sent2}`);

    res.json({
      ok: true,
      sessionId: accountId,
      crmUrl: `${BASE_URL}/app/login`,
      trainingUrl: `${BASE_URL}/training/login`,
      emailsSent: { crm: sent1, training: sent2 },
    });
  } catch (err: any) {
    logger.error(`Provision error: ${err.message}`);
    res.status(500).json({ error: 'Provisioning failed', detail: err.message });
  }
});
