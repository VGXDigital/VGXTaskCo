// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import type { FastifyPluginAsync } from 'fastify';
import { TaskStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { env } from '../lib/env.js';

/**
 * Validates the x-internal-key header against the configured INTERNAL_API_KEY.
 * Returns true if the key is present and matches; false otherwise.
 */
function isValidInternalKey(key: string | undefined): boolean {
  return typeof key === 'string' && key === env.INTERNAL_API_KEY;
}

const reminderRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /internal/reminders/due-today
   * All tasks due today across all users.
   * Requires x-internal-key header matching INTERNAL_API_KEY env var.
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
   * All tasks past their due date and not done.
   * Requires x-internal-key header matching INTERNAL_API_KEY env var.
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
};

export default reminderRoutes;
