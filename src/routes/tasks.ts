// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { TaskStatus, Priority } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import {
  createTaskBodySchema,
  updateTaskBodySchema,
  listTasksQuerySchema,
  bulkStatusBodySchema,
  bulkMoveBodySchema,
  bulkIdsBodySchema,
} from '../schemas/task.js';
import {
  listTasks,
  listTasksForProjects,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  bulkSetStatus,
  bulkMove,
  bulkArchive,
  bulkUnarchive,
  bulkDelete,
} from '../services/tasks.js';

const cuidParam = z.string().cuid('Invalid id');

const crossProjectQuerySchema = z.object({
  projectIds: z
    .string({ error: 'projectIds is required' })
    .transform((s) =>
      s
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
    ),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  dueWithin: z.enum(['today', 'thisWeek', 'overdue', 'doneInLast7Days']).optional(),
  tagIds: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(',').map((s) => s.trim()).filter(Boolean) : undefined)),
  search: z.string().max(200).optional(),
  includeArchived: z.coerce.boolean().optional().default(false),
});

const taskRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /projects/:projectId/tasks
   * Creates a task under a project owned by the caller.
   */
  app.post('/projects/:projectId/tasks', { preHandler: [requireAuth] }, async (request, reply) => {
    const projectIdParsed = cuidParam.safeParse(
      (request.params as { projectId: string }).projectId,
    );
    if (!projectIdParsed.success) {
      return reply.status(400).send({ error: 'Invalid project id' });
    }

    const parsed = createTaskBodySchema.safeParse(request.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Validation error';
      return reply.status(400).send({ error: message });
    }

    const task = await createTask(request.user.id, projectIdParsed.data, parsed.data, {
      ip: request.ip,
      headers: request.headers as Record<string, string | string[] | undefined>,
    });

    if (!task) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    return reply.status(201).send({ data: task });
  });

  /**
   * GET /projects/:projectId/tasks
   * Lists tasks with optional filtering. Ownership-scoped via project.
   */
  app.get('/projects/:projectId/tasks', { preHandler: [requireAuth] }, async (request, reply) => {
    const projectIdParsed = cuidParam.safeParse(
      (request.params as { projectId: string }).projectId,
    );
    if (!projectIdParsed.success) {
      return reply.status(400).send({ error: 'Invalid project id' });
    }

    const queryParsed = listTasksQuerySchema.safeParse(request.query);
    if (!queryParsed.success) {
      const message = queryParsed.error.issues[0]?.message ?? 'Invalid query parameter';
      return reply.status(400).send({ error: message });
    }

    const tasks = await listTasks(request.user.id, projectIdParsed.data, queryParsed.data);

    if (tasks === null) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    return reply.status(200).send({ data: tasks });
  });

  /**
   * GET /tasks/:id
   * Returns a single task by id. Ownership verified via parent project.
   * Used by TaskDetailModal on the frontend.
   */
  app.get('/tasks/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const idParsed = cuidParam.safeParse((request.params as { id: string }).id);
    if (!idParsed.success) {
      return reply.status(400).send({ error: 'Invalid task id' });
    }

    const task = await getTask(request.user.id, idParsed.data);

    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    return reply.status(200).send({ data: task });
  });

  /**
   * PATCH /tasks/:id
   * Partial update. Ownership verified via parent project.
   */
  app.patch('/tasks/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const idParsed = cuidParam.safeParse((request.params as { id: string }).id);
    if (!idParsed.success) {
      return reply.status(400).send({ error: 'Invalid task id' });
    }

    const parsed = updateTaskBodySchema.safeParse(request.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Validation error';
      return reply.status(400).send({ error: message });
    }

    const updated = await updateTask(request.user.id, idParsed.data, parsed.data, {
      ip: request.ip,
      headers: request.headers as Record<string, string | string[] | undefined>,
    });

    if (!updated) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    return reply.status(200).send({ data: updated });
  });

  /**
   * DELETE /tasks/:id
   * Deletes a task. Ownership verified via parent project.
   */
  app.delete('/tasks/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const idParsed = cuidParam.safeParse((request.params as { id: string }).id);
    if (!idParsed.success) {
      return reply.status(400).send({ error: 'Invalid task id' });
    }

    const result = await deleteTask(request.user.id, idParsed.data, {
      ip: request.ip,
      headers: request.headers as Record<string, string | string[] | undefined>,
    });

    if (!result) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    return reply.status(200).send({ data: result });
  });

  // ── Cross-project endpoint ────────────────────────────────────────────────

  /**
   * GET /tasks
   * Fetches tasks across multiple projects in one request.
   * Query params: projectIds (comma-separated), status, priority, dueWithin, tagIds, search, includeArchived
   */
  app.get('/tasks', { preHandler: [requireAuth] }, async (request, reply) => {
    const queryParsed = crossProjectQuerySchema.safeParse(request.query);
    if (!queryParsed.success) {
      const message = queryParsed.error.issues[0]?.message ?? 'Invalid query parameter';
      return reply.status(400).send({ error: message });
    }

    const { projectIds, ...filter } = queryParsed.data;

    if (projectIds.length === 0) {
      return reply.status(400).send({ error: 'At least one projectId is required' });
    }

    const tasks = await listTasksForProjects(request.user.id, projectIds, filter);

    if (tasks === null) {
      return reply.status(404).send({ error: 'One or more projects not found' });
    }

    return reply.status(200).send({ data: tasks });
  });

  // ── Bulk operations ────────────────────────────────────────────────────────

  /**
   * POST /tasks/bulk/status
   * Set status on multiple tasks.
   */
  app.post('/tasks/bulk/status', { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = bulkStatusBodySchema.safeParse(request.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Validation error';
      return reply.status(400).send({ error: message });
    }

    const { ids, status } = parsed.data;
    const result = await bulkSetStatus(request.user.id, ids, status);

    if ('unauthorizedIds' in result && result.unauthorizedIds.length > 0) {
      return reply.status(403).send({ error: 'Unauthorized', unauthorizedIds: result.unauthorizedIds });
    }

    const count = 'updatedCount' in result ? result.updatedCount : ids.length;
    return reply.status(200).send({ data: { updated: count } });
  });

  /**
   * POST /tasks/bulk/move
   * Move multiple tasks to a different project.
   */
  app.post('/tasks/bulk/move', { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = bulkMoveBodySchema.safeParse(request.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Validation error';
      return reply.status(400).send({ error: message });
    }

    const { ids, projectId } = parsed.data;
    const result = await bulkMove(request.user.id, ids, projectId);

    if ('unauthorizedIds' in result) {
      if (result.unauthorizedIds.length === 0) {
        return reply.status(404).send({ error: 'Destination project not found' });
      }
      return reply.status(403).send({ error: 'Unauthorized', unauthorizedIds: result.unauthorizedIds });
    }

    return reply.status(200).send({ data: { updated: result.updatedCount } });
  });

  /**
   * POST /tasks/bulk/archive
   * Archive multiple tasks.
   */
  app.post('/tasks/bulk/archive', { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = bulkIdsBodySchema.safeParse(request.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Validation error';
      return reply.status(400).send({ error: message });
    }

    const { ids } = parsed.data;
    const result = await bulkArchive(request.user.id, ids);

    if ('unauthorizedIds' in result && result.unauthorizedIds.length > 0) {
      return reply.status(403).send({ error: 'Unauthorized', unauthorizedIds: result.unauthorizedIds });
    }

    const count = 'updatedCount' in result ? result.updatedCount : ids.length;
    return reply.status(200).send({ data: { updated: count } });
  });

  /**
   * POST /tasks/bulk/unarchive
   * Unarchive multiple tasks.
   */
  app.post('/tasks/bulk/unarchive', { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = bulkIdsBodySchema.safeParse(request.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Validation error';
      return reply.status(400).send({ error: message });
    }

    const { ids } = parsed.data;
    const result = await bulkUnarchive(request.user.id, ids);

    if ('unauthorizedIds' in result && result.unauthorizedIds.length > 0) {
      return reply.status(403).send({ error: 'Unauthorized', unauthorizedIds: result.unauthorizedIds });
    }

    const count = 'updatedCount' in result ? result.updatedCount : ids.length;
    return reply.status(200).send({ data: { updated: count } });
  });

  /**
   * POST /tasks/bulk/delete
   * Hard delete multiple tasks.
   */
  app.post('/tasks/bulk/delete', { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = bulkIdsBodySchema.safeParse(request.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Validation error';
      return reply.status(400).send({ error: message });
    }

    const { ids } = parsed.data;
    const result = await bulkDelete(request.user.id, ids);

    if ('unauthorizedIds' in result && result.unauthorizedIds.length > 0) {
      return reply.status(403).send({ error: 'Unauthorized', unauthorizedIds: result.unauthorizedIds });
    }

    const count = 'deletedCount' in result ? result.deletedCount : ids.length;
    return reply.status(200).send({ data: { deleted: count } });
  });
};

export default taskRoutes;
