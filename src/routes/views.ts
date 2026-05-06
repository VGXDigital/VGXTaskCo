// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { createViewBodySchema, updateViewBodySchema } from '../schemas/view.js';

const cuidParam = z.string().cuid('Invalid id');

const viewRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /views
   * List all saved views for the authenticated user.
   */
  app.get('/views', { preHandler: [requireAuth] }, async (request, reply) => {
    const views = await prisma.savedView.findMany({
      where: { ownerId: request.user.id },
      orderBy: { createdAt: 'asc' },
    });

    return reply.status(200).send({ data: views });
  });

  /**
   * GET /projects/:projectId/views
   * List project-scope saved views. Ownership check on project.
   */
  app.get('/projects/:projectId/views', { preHandler: [requireAuth] }, async (request, reply) => {
    const projectIdParsed = cuidParam.safeParse(
      (request.params as { projectId: string }).projectId,
    );
    if (!projectIdParsed.success) {
      return reply.status(400).send({ error: 'Invalid project id' });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectIdParsed.data, ownerId: request.user.id },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const views = await prisma.savedView.findMany({
      where: {
        ownerId: request.user.id,
        scope: 'project',
        projectId: projectIdParsed.data,
      },
      orderBy: { createdAt: 'asc' },
    });

    return reply.status(200).send({ data: views });
  });

  /**
   * POST /views
   * Create a new saved view.
   */
  app.post('/views', { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = createViewBodySchema.safeParse(request.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Validation error';
      return reply.status(400).send({ error: message });
    }

    const { name, scope, projectId, filter } = parsed.data;

    // If scope=project, verify project ownership
    if (scope === 'project') {
      if (!projectId) {
        return reply.status(400).send({ error: 'projectId is required for project-scope views' });
      }
      const project = await prisma.project.findFirst({
        where: { id: projectId, ownerId: request.user.id },
      });
      if (!project) {
        return reply.status(404).send({ error: 'Project not found' });
      }
    }

    try {
      const view = await prisma.savedView.create({
        data: {
          name,
          ownerId: request.user.id,
          scope,
          projectId: projectId ?? null,
          filter,
        },
      });

      return reply.status(201).send({ data: view });
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        return reply.status(409).send({ error: 'A view with this name already exists' });
      }
      throw err;
    }
  });

  /**
   * PATCH /views/:id
   * Update a saved view. Ownership-gated.
   */
  app.patch('/views/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const idParsed = cuidParam.safeParse((request.params as { id: string }).id);
    if (!idParsed.success) {
      return reply.status(400).send({ error: 'Invalid view id' });
    }

    const parsed = updateViewBodySchema.safeParse(request.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Validation error';
      return reply.status(400).send({ error: message });
    }

    const view = await prisma.savedView.findFirst({
      where: { id: idParsed.data, ownerId: request.user.id },
    });

    if (!view) {
      return reply.status(404).send({ error: 'View not found' });
    }

    const updated = await prisma.savedView.update({
      where: { id: idParsed.data },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.filter !== undefined && { filter: parsed.data.filter }),
      },
    });

    return reply.status(200).send({ data: updated });
  });

  /**
   * DELETE /views/:id
   * Delete a saved view. Ownership-gated.
   */
  app.delete('/views/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const idParsed = cuidParam.safeParse((request.params as { id: string }).id);
    if (!idParsed.success) {
      return reply.status(400).send({ error: 'Invalid view id' });
    }

    const view = await prisma.savedView.findFirst({
      where: { id: idParsed.data, ownerId: request.user.id },
    });

    if (!view) {
      return reply.status(404).send({ error: 'View not found' });
    }

    await prisma.savedView.delete({ where: { id: idParsed.data } });

    return reply.status(200).send({ data: { deleted: true } });
  });
};

export default viewRoutes;
