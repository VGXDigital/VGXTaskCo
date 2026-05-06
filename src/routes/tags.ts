// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

// TODO: swap requireAuth to requireAuthOrApiToken after Phase 7.7

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { createTagBodySchema, attachTagsBodySchema } from '../schemas/tag.js';

const cuidParam = z.string().cuid('Invalid id');

const tagRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /tags
   * List all tags owned by the authenticated user.
   */
  app.get('/tags', { preHandler: [requireAuth] }, async (request, reply) => {
    const tags = await prisma.tag.findMany({
      where: { ownerId: request.user.id },
      orderBy: { value: 'asc' },
    });

    return reply.status(200).send({ data: tags });
  });

  /**
   * POST /tags
   * Create a new tag for the authenticated user.
   */
  app.post('/tags', { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = createTagBodySchema.safeParse(request.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Validation error';
      return reply.status(400).send({ error: message });
    }

    try {
      const tag = await prisma.tag.create({
        data: {
          value: parsed.data.value,
          ownerId: request.user.id,
        },
      });

      return reply.status(201).send({ data: tag });
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        return reply.status(409).send({ error: 'Tag already exists' });
      }
      throw err;
    }
  });

  /**
   * DELETE /tags/:id
   * Delete a tag owned by the authenticated user.
   */
  app.delete('/tags/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const idParsed = cuidParam.safeParse((request.params as { id: string }).id);
    if (!idParsed.success) {
      return reply.status(400).send({ error: 'Invalid tag id' });
    }

    const tag = await prisma.tag.findFirst({
      where: { id: idParsed.data, ownerId: request.user.id },
    });

    if (!tag) {
      return reply.status(404).send({ error: 'Tag not found' });
    }

    await prisma.tag.delete({ where: { id: idParsed.data } });

    return reply.status(200).send({ data: { deleted: true } });
  });

  /**
   * POST /tasks/:taskId/tags
   * Attach (replace) the full tag set on a task.
   */
  app.post('/tasks/:taskId/tags', { preHandler: [requireAuth] }, async (request, reply) => {
    const taskIdParsed = cuidParam.safeParse((request.params as { taskId: string }).taskId);
    if (!taskIdParsed.success) {
      return reply.status(400).send({ error: 'Invalid task id' });
    }

    const parsed = attachTagsBodySchema.safeParse(request.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Validation error';
      return reply.status(400).send({ error: message });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskIdParsed.data },
      include: { project: true },
    });

    if (!task || task.project.ownerId !== request.user.id) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    const { tagIds } = parsed.data;

    const tags = await prisma.tag.findMany({
      where: { id: { in: tagIds } },
    });

    if (tags.length !== tagIds.length || tags.some((t) => t.ownerId !== request.user.id)) {
      return reply.status(400).send({ error: 'One or more tags not found or not owned' });
    }

    const updated = await prisma.task.update({
      where: { id: taskIdParsed.data },
      data: {
        tags: { set: tagIds.map((id) => ({ id })) },
      },
      include: { tags: true },
    });

    return reply.status(200).send({ data: updated });
  });
};

export default tagRoutes;
