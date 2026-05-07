// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuthOrApiToken } from '../middleware/api-token.js';
import { rowToCSV, TASK_CSV_HEADERS } from '../services/csv.js';
import { TaskStatus, Priority } from '@prisma/client';
import {
  exportProjectTasksQuerySchema,
  exportAllTasksQuerySchema,
} from '../schemas/export.js';

const cuidParam = z.string().cuid('Invalid id');

// sanitise filename
function sanitizeFilename(name: string): string {
  return name.replace(/[^\w.-]/g, '-');
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const exportRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /projects/:projectId/export/tasks.csv
   * Export tasks for a single project as CSV.
   */
  app.get(
    '/projects/:projectId/export/tasks.csv',
    { preHandler: [requireAuthOrApiToken] },
    async (request, reply) => {
      const projectIdParsed = cuidParam.safeParse(
        (request.params as { projectId: string }).projectId,
      );
      if (!projectIdParsed.success) {
        return reply.status(400).send({ error: 'Invalid project id' });
      }

      const queryParsed = exportProjectTasksQuerySchema.safeParse(request.query);
      if (!queryParsed.success) {
        const message = queryParsed.error.issues[0]?.message ?? 'Invalid query parameter';
        return reply.status(400).send({ error: message });
      }

      const project = await prisma.project.findFirst({
        where: { id: projectIdParsed.data, ownerId: request.user.id },
      });

      if (!project) {
        return reply.status(404).send({ error: 'Project not found' });
      }

      const { status, priority, includeArchived } = queryParsed.data;

      const where = {
        projectId: projectIdParsed.data,
        ...(status && Object.values(TaskStatus).includes(status as TaskStatus)
          ? { status: status as TaskStatus }
          : {}),
        ...(priority && Object.values(Priority).includes(priority as Priority)
          ? { priority: priority as Priority }
          : {}),
        ...(includeArchived !== 'true' ? { archivedAt: null } : {}),
      };

      const tasks = await prisma.task.findMany({
        where,
        orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
      });

      const safeName = sanitizeFilename(project.name);
      const filename = `vgxtaskco-tasks-${safeName}-${todayIso()}.csv`;

      reply.raw.setHeader('Content-Type', 'text/csv; charset=utf-8');
      reply.raw.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      reply.raw.write(rowToCSV(TASK_CSV_HEADERS));

      for (const task of tasks) {
        reply.raw.write(
          rowToCSV([
            task.id,
            project.name,
            task.title,
            task.description ?? '',
            task.status,
            task.priority,
            task.dueDate ? task.dueDate.toISOString() : '',
            task.createdAt.toISOString(),
            task.updatedAt.toISOString(),
          ]),
        );
      }

      reply.raw.end();
      return reply;
    },
  );

  /**
   * GET /export/tasks.csv
   * Cross-project task export.
   */
  app.get('/export/tasks.csv', { preHandler: [requireAuthOrApiToken] }, async (request, reply) => {
    const queryParsed = exportAllTasksQuerySchema.safeParse(request.query);
    if (!queryParsed.success) {
      const message = queryParsed.error.issues[0]?.message ?? 'Invalid query parameter';
      return reply.status(400).send({ error: message });
    }

    const { projectIds: rawProjectIds, status, priority, from, to } = queryParsed.data;

    // Resolve project ids: use provided list or all owned projects
    let projectIds: string[];
    if (rawProjectIds) {
      const requested = rawProjectIds.split(',').filter(Boolean);
      const owned = await prisma.project.findMany({
        where: { id: { in: requested }, ownerId: request.user.id },
        select: { id: true },
      });
      projectIds = owned.map((p) => p.id);
    } else {
      const allOwned = await prisma.project.findMany({
        where: { ownerId: request.user.id },
        select: { id: true },
      });
      projectIds = allOwned.map((p) => p.id);
    }

    if (projectIds.length === 0) {
      reply.raw.setHeader('Content-Type', 'text/csv; charset=utf-8');
      reply.raw.setHeader('Content-Disposition', `attachment; filename="vgxtaskco-tasks-${todayIso()}.csv"`);
      reply.raw.write(rowToCSV(TASK_CSV_HEADERS));
      reply.raw.end();
      return reply;
    }

    const dueDateFilter: Record<string, Date> = {};
    if (from) dueDateFilter['gte'] = new Date(from);
    if (to) dueDateFilter['lte'] = new Date(to);

    const where = {
      projectId: { in: projectIds },
      ...(status && Object.values(TaskStatus).includes(status as TaskStatus)
        ? { status: status as TaskStatus }
        : {}),
      ...(priority && Object.values(Priority).includes(priority as Priority)
        ? { priority: priority as Priority }
        : {}),
      ...(Object.keys(dueDateFilter).length > 0 ? { dueDate: dueDateFilter } : {}),
    };

    const tasks = await prisma.task.findMany({
      where,
      include: { project: { select: { name: true } } },
      orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
    });

    reply.raw.setHeader('Content-Type', 'text/csv; charset=utf-8');
    reply.raw.setHeader(
      'Content-Disposition',
      `attachment; filename="vgxtaskco-tasks-${todayIso()}.csv"`,
    );
    reply.raw.write(rowToCSV(TASK_CSV_HEADERS));

    for (const task of tasks) {
      reply.raw.write(
        rowToCSV([
          task.id,
          task.project.name,
          task.title,
          task.description ?? '',
          task.status,
          task.priority,
          task.dueDate ? task.dueDate.toISOString() : '',
          task.createdAt.toISOString(),
          task.updatedAt.toISOString(),
        ]),
      );
    }

    reply.raw.end();
    return reply;
  });
};

export default exportRoutes;
