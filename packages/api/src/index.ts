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
