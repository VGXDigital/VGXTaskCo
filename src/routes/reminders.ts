// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import type { FastifyPluginAsync } from 'fastify';
import { TaskStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuthOrApiToken } from '../middleware/api-token.js';

const reminderRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /internal/reminders/due-today
   * All tasks due today across all users. Service token required.
   */
  app.get(
    '/internal/reminders/due-today',
    { preHandler: [requireAuthOrApiToken] },
    async (request, reply) => {
      if (request.apiTokenScope !== 'service') {
        return reply.status(403).send({ error: 'Service token required' });
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
   * All tasks past their due date and not done. Service token required.
   */
  app.get(
    '/internal/reminders/overdue',
    { preHandler: [requireAuthOrApiToken] },
    async (request, reply) => {
      if (request.apiTokenScope !== 'service') {
        return reply.status(403).send({ error: 'Service token required' });
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
