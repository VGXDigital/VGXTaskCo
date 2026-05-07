// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import type { FastifyPluginAsync } from 'fastify';
import type { preHandlerHookHandler } from 'fastify';
import { TaskStatus } from '@prisma/client';
import { timingSafeEqual, createHmac } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { env } from '../lib/env.js';

/**
 * Validates the x-internal-key header against the configured INTERNAL_API_KEY.
 */
function isValidInternalKey(key: string | undefined): boolean {
  return typeof key === 'string' && key === env.INTERNAL_API_KEY;
}

/**
 * preHandler that accepts only service-scope API tokens (vgxt_... with scope='service').
 * Returns 401 for missing/invalid tokens and 403 for non-service scope.
 */
const requireServiceToken: preHandlerHookHandler = async (request, reply) => {
  const authHeader = request.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing or malformed Authorization header' });
  }

  const tokenValue = authHeader.slice(7);

  if (!tokenValue.startsWith('vgxt_')) {
    // JWTs and non-API tokens are not service tokens
    return reply.status(403).send({ error: 'Service-scope token required' });
  }

  const prefix = tokenValue.slice(5, 13);

  const apiToken = await prisma.apiToken.findFirst({
    where: {
      prefix,
      revokedAt: null,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
  });

  if (!apiToken) {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }

  const candidateHash = createHmac('sha256', env.API_TOKEN_PEPPER)
    .update(tokenValue)
    .digest('hex');

  const storedBuf = Buffer.from(apiToken.tokenHash, 'hex');
  const candidateBuf = Buffer.from(candidateHash, 'hex');

  if (
    storedBuf.length !== candidateBuf.length ||
    !timingSafeEqual(storedBuf, candidateBuf)
  ) {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }

  if (apiToken.scope !== 'service') {
    return reply.status(403).send({ error: 'Service-scope token required' });
  }

  const user = await prisma.user.findUnique({
    where: { id: apiToken.ownerId },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }

  request.user = user;
  request.apiTokenScope = apiToken.scope;

  void prisma.apiToken.update({
    where: { id: apiToken.id },
    data: { lastUsedAt: new Date() },
  });
};

const reminderRoutes: FastifyPluginAsync = async (app) => {
  // ── Legacy internal routes (x-internal-key auth) ─────────────────────────────

  /**
   * GET /internal/reminders/due-today
   * Legacy endpoint — requires x-internal-key header matching INTERNAL_API_KEY.
   */
  app.get(
    '/internal/reminders/due-today',
    async (request, reply) => {
      if (!isValidInternalKey(request.headers['x-internal-key'] as string | undefined)) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const now = new Date();
      const startOfToday = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
      );
      const endOfToday = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
      );

      const tasks = await prisma.task.findMany({
        where: {
          dueDate: { gte: startOfToday, lte: endOfToday },
          status: { not: TaskStatus.DONE },
          archivedAt: null,
        },
        include: {
          project: {
            include: {
              owner: { select: { email: true, name: true } },
            },
          },
        },
      });

      const result = tasks.map((task) => ({
        task,
        owner: {
          email: task.project.owner.email,
          name: task.project.owner.name,
        },
      }));

      return reply.status(200).send({ data: result });
    },
  );

  /**
   * GET /internal/reminders/overdue
   * Legacy endpoint — requires x-internal-key header matching INTERNAL_API_KEY.
   */
  app.get(
    '/internal/reminders/overdue',
    async (request, reply) => {
      if (!isValidInternalKey(request.headers['x-internal-key'] as string | undefined)) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const now = new Date();
      const startOfToday = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
      );

      const tasks = await prisma.task.findMany({
        where: {
          dueDate: { lt: startOfToday },
          status: { not: TaskStatus.DONE },
          archivedAt: null,
        },
        include: {
          project: {
            include: {
              owner: { select: { email: true, name: true } },
            },
          },
        },
      });

      const result = tasks.map((task) => ({
        task,
        owner: {
          email: task.project.owner.email,
          name: task.project.owner.name,
        },
      }));

      return reply.status(200).send({ data: result });
    },
  );

  // ── Service-token routes (Bearer API token, scope=service) ────────────────────

  /**
   * GET /reminders/due-today
   * All tasks due today across all users, grouped by owner email.
   * Requires a service-scope Bearer API token.
   */
  app.get(
    '/reminders/due-today',
    { preHandler: [requireServiceToken] },
    async (_request, reply) => {
      const now = new Date();
      const startOfToday = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
      );
      const endOfToday = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
      );

      const tasks = await prisma.task.findMany({
        where: {
          dueDate: { gte: startOfToday, lte: endOfToday },
          status: { not: TaskStatus.DONE },
          archivedAt: null,
        },
        include: {
          project: {
            include: {
              owner: { select: { email: true, name: true } },
            },
          },
        },
      });

      const grouped: Record<string, typeof tasks> = {};
      for (const task of tasks) {
        const email = task.project.owner.email;
        if (!grouped[email]) grouped[email] = [];
        grouped[email].push(task);
      }

      return reply.status(200).send({ data: { grouped } });
    },
  );

  /**
   * GET /reminders/overdue
   * All tasks past their due date and not done, grouped by owner email.
   * Requires a service-scope Bearer API token.
   */
  app.get(
    '/reminders/overdue',
    { preHandler: [requireServiceToken] },
    async (_request, reply) => {
      const now = new Date();
      const startOfToday = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
      );

      const tasks = await prisma.task.findMany({
        where: {
          dueDate: { lt: startOfToday },
          status: { not: TaskStatus.DONE },
          archivedAt: null,
        },
        include: {
          project: {
            include: {
              owner: { select: { email: true, name: true } },
            },
          },
        },
      });

      const grouped: Record<string, typeof tasks> = {};
      for (const task of tasks) {
        const email = task.project.owner.email;
        if (!grouped[email]) grouped[email] = [];
        grouped[email].push(task);
      }

      return reply.status(200).send({ data: { grouped } });
    },
  );
};

export default reminderRoutes;
