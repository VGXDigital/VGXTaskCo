// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { createProjectBodySchema, updateProjectBodySchema } from '../schemas/project.js';
import {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
} from '../services/projects.js';

const cuidParam = z.string().cuid('Invalid project id');

const projectRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /projects
   * Creates a new project owned by the authenticated user.
   */
  app.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = createProjectBodySchema.safeParse(request.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Validation error';
      return reply.status(400).send({ error: message });
    }

    const project = await createProject(request.user.id, parsed.data, {
      ip: request.ip,
      headers: request.headers as Record<string, string | string[] | undefined>,
    });

    return reply.status(201).send({ data: project });
  });

  /**
   * GET /projects
   * Returns all projects owned by the authenticated user.
   * CRITICAL: always scoped by ownerId — never findMany() without where.
   */
  app.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const projects = await listProjects(request.user.id);
    return reply.status(200).send({ data: projects });
  });

  /**
   * GET /projects/:id
   * Returns a single project with task count.
   * 404 if not found or not owned by the caller.
   */
  app.get('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const idParsed = cuidParam.safeParse((request.params as { id: string }).id);
    if (!idParsed.success) {
      return reply.status(400).send({ error: 'Invalid project id' });
    }

    const project = await getProject(request.user.id, idParsed.data);
    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    return reply.status(200).send({ data: project });
  });

  /**
   * PATCH /projects/:id
   * Partial update of a project. At least one field required.
   */
  app.patch('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const idParsed = cuidParam.safeParse((request.params as { id: string }).id);
    if (!idParsed.success) {
      return reply.status(400).send({ error: 'Invalid project id' });
    }

    const parsed = updateProjectBodySchema.safeParse(request.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Validation error';
      return reply.status(400).send({ error: message });
    }

    const updated = await updateProject(request.user.id, idParsed.data, parsed.data, {
      ip: request.ip,
      headers: request.headers as Record<string, string | string[] | undefined>,
    });

    if (!updated) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    return reply.status(200).send({ data: updated });
  });

  /**
   * DELETE /projects/:id
   * Deletes a project. Cascades to tasks.
   */
  app.delete('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const idParsed = cuidParam.safeParse((request.params as { id: string }).id);
    if (!idParsed.success) {
      return reply.status(400).send({ error: 'Invalid project id' });
    }

    const ok = await deleteProject(request.user.id, idParsed.data, {
      ip: request.ip,
      headers: request.headers as Record<string, string | string[] | undefined>,
    });

    if (!ok) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    return reply.status(200).send({ data: { deleted: true } });
  });
};

export default projectRoutes;
