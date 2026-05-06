// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import 'dotenv/config';
import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import { afterAll } from 'vitest';
import authRoutes from '../src/routes/auth.js';
import projectRoutes from '../src/routes/projects.js';
import taskRoutes from '../src/routes/tasks.js';
import tagRoutes from '../src/routes/tags.js';
import commentRoutes from '../src/routes/comments.js';
import apiTokenRoutes from '../src/routes/api-tokens.js';
import searchRoutes from '../src/routes/search.js';
import reminderRoutes from '../src/routes/reminders.js';
import { prisma } from '../src/lib/prisma.js';

/**
 * Builds a fresh Fastify instance for integration tests.
 * Uses Fastify inject — no real HTTP listener.
 * Registers all routes needed across the full test suite.
 */
export async function buildTestApp() {
  const app = Fastify({ logger: false });

  await app.register(helmet);
  await app.register(cors, { origin: true, credentials: true });
  await app.register(sensible);
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(projectRoutes, { prefix: '/projects' });
  await app.register(taskRoutes);
  await app.register(tagRoutes);
  await app.register(commentRoutes);
  await app.register(apiTokenRoutes);
  await app.register(searchRoutes);
  await app.register(reminderRoutes);

  app.get('/', async () => ({
    data: { status: 'ok', service: 'vgx-taskco', version: '0.1.0' },
  }));

  await app.ready();
  return app;
}

/**
 * Clean up test users after all tests in a suite complete.
 * Matches any email in the @test.local domain.
 */
afterAll(async () => {
  try {
    await prisma.user.deleteMany({ where: { email: { endsWith: '@test.local' } } });
  } catch {
    // ignore — test isolation is best-effort
  }
  // Do NOT call prisma.$disconnect() here — it closes the shared connection pool
  // and causes all subsequent test files to fail with 401. Vitest handles process
  // cleanup; the pool closes naturally when the process exits.
});
