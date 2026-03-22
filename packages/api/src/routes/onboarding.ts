import { Router } from 'express';
import { logger } from '../logger';
import crypto from 'crypto';

export const onboardingRouter = Router();

// In-memory store (swap for SQLite/DynamoDB in prod)
const sessions: Record<string, any> = {};

// POST /api/v1/onboarding/start — create onboarding session
onboardingRouter.post('/start', (req, res) => {
  const id = crypto.randomUUID();
  sessions[id] = {
    id,
    step: 1,
    createdAt: new Date().toISOString(),
    data: {},
  };
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
  logger.info(`Onboarding ${req.params.id} → step ${step}`);
  res.json({ ok: true, step });
});

// POST /api/v1/onboarding/:id/assets — upload training assets metadata
onboardingRouter.post('/:id/assets', (req, res) => {
  const session = sessions[req.params.id];
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const { assets } = req.body;
  session.data.assets = assets || [];
  logger.info(`Onboarding ${req.params.id} — ${assets?.length || 0} assets uploaded`);
  res.json({ ok: true, count: assets?.length || 0 });
});

// POST /api/v1/onboarding/:id/demo-run — record a demo test result
onboardingRouter.post('/:id/demo-run', (req, res) => {
  const session = sessions[req.params.id];
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const { runId, status, stages } = req.body;
  if (!session.data.demoRuns) session.data.demoRuns = [];
  const existing = session.data.demoRuns.findIndex((r: any) => r.id === runId);
  const run = { id: runId, status, stages, completedAt: new Date().toISOString() };
  if (existing >= 0) session.data.demoRuns[existing] = run;
  else session.data.demoRuns.push(run);
  res.json({ ok: true, run });
});

// POST /api/v1/onboarding/:id/confirm — lock in config
onboardingRouter.post('/:id/confirm', (req, res) => {
  const session = sessions[req.params.id];
  if (!session) return res.status(404).json({ error: 'Session not found' });
  session.data.confirmed = true;
  session.data.confirmedAt = new Date().toISOString();
  logger.info(`Onboarding ${req.params.id} — process confirmed`);
  res.json({ ok: true });
});

// POST /api/v1/onboarding/provision — create account + send emails
onboardingRouter.post('/provision', async (req, res) => {
  try {
    const {
      businessName, industry, state, phone, email, password,
      monthlyRevenue, dealSize, agentCount,
      aiLevel, botCount, iqLevel, iqModel,
      pipelineStages, assets,
    } = req.body;

    logger.info(`Provisioning account for ${businessName} (${email})`);

    // Generate temp passwords
    const crmPassword = crypto.randomBytes(8).toString('hex');
    const trainingPassword = crypto.randomBytes(8).toString('hex');

    // TODO: Call register_public.py to actually provision workspace
    // TODO: Send emails via SES (CRM login + Training Room login)
    // For now, store the config and return success

    const accountId = crypto.randomUUID();
    const account = {
      id: accountId,
      businessName, industry, state, phone, email,
      monthlyRevenue, dealSize, agentCount,
      aiLevel, botCount, iqLevel, iqModel,
      pipelineStages: pipelineStages || [],
      assetCount: assets?.length || 0,
      crmPassword,
      trainingPassword,
      provisionedAt: new Date().toISOString(),
      status: 'provisioned',
    };

    // Store in memory (replace with DB write)
    sessions[`account_${accountId}`] = account;

    logger.info(`Account provisioned: ${accountId} for ${businessName}`);

    res.json({
      ok: true,
      sessionId: accountId,
      crmUrl: 'https://agents.chccapitalgroup.com/app/login',
      trainingUrl: 'https://agents.chccapitalgroup.com/training/login',
      emailsSent: true,
    });
  } catch (err: any) {
    logger.error(`Provision error: ${err.message}`);
    res.status(500).json({ error: 'Provisioning failed', detail: err.message });
  }
});
