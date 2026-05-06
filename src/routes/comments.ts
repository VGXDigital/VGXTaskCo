// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { createCommentBodySchema, updateCommentBodySchema } from '../schemas/comment.js';

const cuidParam = z.string().cuid('Invalid id');

/**
 * Loads a task and returns it only if the given userId owns the parent project.
 * Returns null if not found or not owned.
 */
async function getTaskWithOwnership(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });

  if (!task || task.project.ownerId !== userId) return null;
  return task;
}

const commentRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /tasks/:taskId/comments
   * List all comments on a task, ordered oldest-first.
   */
  app.get('/tasks/:taskId/comments', { preHandler: [requireAuth] }, async (request, reply) => {
    const taskIdParsed = cuidParam.safeParse((request.params as { taskId: string }).taskId);
    if (!taskIdParsed.success) {
      return reply.status(400).send({ error: 'Invalid task id' });
    }

    const task = await getTaskWithOwnership(taskIdParsed.data, request.user.id);
    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    const comments = await prisma.comment.findMany({
      where: { taskId: taskIdParsed.data },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, email: true, name: true } },
      },
    });

    return reply.status(200).send({ data: comments });
  });

  /**
   * POST /tasks/:taskId/comments
   * Add a comment to a task.
   */
  app.post('/tasks/:taskId/comments', { preHandler: [requireAuth] }, async (request, reply) => {
    const taskIdParsed = cuidParam.safeParse((request.params as { taskId: string }).taskId);
    if (!taskIdParsed.success) {
      return reply.status(400).send({ error: 'Invalid task id' });
    }

    const parsed = createCommentBodySchema.safeParse(request.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Validation error';
      return reply.status(400).send({ error: message });
    }

    const task = await getTaskWithOwnership(taskIdParsed.data, request.user.id);
    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    const comment = await prisma.comment.create({
      data: {
        body: parsed.data.body,
        taskId: taskIdParsed.data,
        authorId: request.user.id,
      },
    });

    return reply.status(201).send({ data: comment });
  });

  /**
   * PATCH /comments/:id
   * Edit a comment. Only the author may edit.
   */
  app.patch('/comments/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const idParsed = cuidParam.safeParse((request.params as { id: string }).id);
    if (!idParsed.success) {
      return reply.status(400).send({ error: 'Invalid comment id' });
    }

    const parsed = updateCommentBodySchema.safeParse(request.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Validation error';
      return reply.status(400).send({ error: message });
    }

    const comment = await prisma.comment.findUnique({
      where: { id: idParsed.data },
      include: { task: { include: { project: true } } },
    });

    if (!comment || comment.authorId !== request.user.id) {
      return reply.status(404).send({ error: 'Comment not found' });
    }

    const updated = await prisma.comment.update({
      where: { id: idParsed.data },
      data: { body: parsed.data.body },
    });

    return reply.status(200).send({ data: updated });
  });

  /**
   * DELETE /comments/:id
   * Delete a comment. Allowed if the caller is the author OR the project owner.
   */
  app.delete('/comments/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const idParsed = cuidParam.safeParse((request.params as { id: string }).id);
    if (!idParsed.success) {
      return reply.status(400).send({ error: 'Invalid comment id' });
    }

    const comment = await prisma.comment.findUnique({
      where: { id: idParsed.data },
      include: { task: { include: { project: true } } },
    });

    const userId = request.user.id;
    const isAuthor = comment?.authorId === userId;
    const isProjectOwner = comment?.task.project.ownerId === userId;

    if (!comment || (!isAuthor && !isProjectOwner)) {
      return reply.status(404).send({ error: 'Comment not found' });
    }

    await prisma.comment.delete({ where: { id: idParsed.data } });

    return reply.status(200).send({ data: { deleted: true } });
  });
};

export default commentRoutes;
