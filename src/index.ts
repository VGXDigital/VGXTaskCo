// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import { env } from './lib/env.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import tags from './routes/tags.js';
import comments from './routes/comments.js';
import activity from './routes/activity.js';
import views from './routes/views.js';
import apiTokens from './routes/api-tokens.js';
import webhooks from './routes/webhooks.js';
import exportRoutes from './routes/export.js';
import reminders from './routes/reminders.js';
import search from './routes/search.js';

const app = Fastify({
  logger: {
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    // Never log request bodies — may contain passwords or tokens
    serializers: {
      req(request) {
        return {
          method: request.method,
          url: request.url,
          hostname: request.hostname,
        };
      },
    },
  },
  trustProxy: env.NODE_ENV === 'production',
});

// ── Security headers ───────────────────────────────────────────────────────────
await app.register(helmet);

// ── CORS ───────────────────────────────────────────────────────────────────────
await app.register(cors, {
  origin: env.ALLOWED_FRONTEND_ORIGINS
    ? env.ALLOWED_FRONTEND_ORIGINS.split(',').map((s) => s.trim())
    : false,
  credentials: true,
});

// ── HTTP utilities (httpErrors, etc.) ─────────────────────────────────────────
await app.register(sensible);

// ── Routes ─────────────────────────────────────────────────────────────────────
await app.register(authRoutes, { prefix: '/auth' });
await app.register(projectRoutes, { prefix: '/projects' });
await app.register(taskRoutes); // task routes already carry full paths
await app.register(tags);
await app.register(comments);
await app.register(activity);
await app.register(views);
await app.register(apiTokens);
await app.register(webhooks);
await app.register(exportRoutes);
await app.register(reminders);
await app.register(search);

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/', async (_request, _reply) => {
  return { data: { status: 'ok', service: 'vgx-taskco', version: '0.1.0' } };
});

// ── Boot ───────────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

await start();

export { app };
