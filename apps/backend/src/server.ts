import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';

import { prisma } from './lib/db';
import { authRouter } from './routes/auth';
import { conversationsRouter } from './routes/conversations';
import { mergeRouter } from './routes/merge';
import { auditRouter } from './routes/audit';
import { templatesRouter } from './routes/templates';
import { settingsRouter } from './routes/settings';
import { messagesRouter } from './routes/messages';
import { injectRouter } from './routes/inject';
import { verifyRouter } from './routes/verify';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const port = Number(process.env.PORT) || 4000;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Security and parsing
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow no-origin requests (e.g. server-to-server, curl) in dev
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} not allowed`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/merge', mergeRouter);
app.use('/api/audit', auditRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/inject', injectRouter);
app.use(verifyRouter);

// Error handler must be last
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(port, () => {
  console.log(`ThreadMerge backend listening on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
});
