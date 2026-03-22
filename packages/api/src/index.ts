import express from 'express';
import cors from 'cors';
import { config } from './config';
import { logger } from './logger';
import { contactsRouter } from './routes/contacts';
import { messagesRouter } from './routes/messages';
import { statsRouter } from './routes/stats';
import { agentsRouter } from './routes/agents';
import { registerRouter } from './routes/register';
import { brainRouter } from './routes/brain';
import { integrationsRouter } from './routes/integrations';
import { campaignsRouter } from './routes/campaigns';
import { leadsRouter } from './routes/leads';
import { dashboardRouter } from './routes/dashboard';
import { inboxRouter } from './routes/inbox';
import { emailRouter } from './routes/email';
import { pipelineRouter } from './routes/pipeline';
import { dealsRouter } from './routes/deals';
import { documentsRouter } from './routes/documents';
import { courtSearchRouter } from './routes/courtSearch';
import { reportsRouter } from './routes/reports';
import { notificationsRouter } from './routes/notifications';
import { settingsRouter } from './routes/settings';
import { paymentsRouter } from './routes/payments';
import { underwritingRouter } from './routes/underwriting';
import { phoneRouter } from './routes/phone';
import { onboardingRouter } from './routes/onboarding';

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'closerai-api', ts: new Date().toISOString() });
});

// API routes
app.use('/api/v1/contacts', contactsRouter);
app.use('/api/v1/contacts/:phone/messages', messagesRouter);
app.use('/api/v1/stats', statsRouter);
app.use('/api/v1/agents', agentsRouter);
app.use('/api/v1/register', registerRouter);
app.use('/api/v1/brain', brainRouter);
app.use('/api/v1/integrations', integrationsRouter);
app.use('/api/v1/campaigns', campaignsRouter);
app.use('/api/v1/leads', leadsRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/messages/inbox', inboxRouter);
app.use('/api/v1/email', emailRouter);
app.use('/api/v1/pipeline', pipelineRouter);
app.use('/api/v1/deals', dealsRouter);
app.use('/api/v1/documents', documentsRouter);
app.use('/api/v1/court-search', courtSearchRouter);
app.use('/api/v1/reports', reportsRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/settings', settingsRouter);
app.use('/api/v1/payments', paymentsRouter);
app.use('/api/v1/underwriting', underwritingRouter);
app.use('/api/v1/phone', phoneRouter);
app.use('/api/v1/onboarding', onboardingRouter);
app.use('/api/v1/me', registerRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const { port } = config.server;
app.listen(port, () => {
  logger.info(`CloserAI API running`, { port, env: config.server.nodeEnv });
});

export default app;
