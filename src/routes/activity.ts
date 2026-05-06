// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { listActivityQuerySchema } from '../schemas/activity.js';

const cuidParam = z.string().cuid('Invalid id');

const activityRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /activity
   * Cross-project paginated activity feed for the authenticated user.
   * Accepts optional subjectId / subjectType query filters.
   */
  app.get('/activity', { preHandler: [requireAuth] }, async (request, reply) => {
    const queryParsed = listActivityQuerySchema.safeParse(request.query);
    if (!queryParsed.success) {
      const message = queryParsed.error.issues[0]?.message ?? 'Invalid query parameter';
      return reply.status(400).send({ error: message });
    }

    const { limit, before, subjectId, subjectType } = queryParsed.data;

    // Resolve all project ids owned by this user for scoping
    const ownedProjects = await prisma.project.findMany({
      where: { ownerId: request.user.id },
      select: { id: true },
    });
    const projectIds = ownedProjects.map((p) => p.id);

    if (projectIds.length === 0) {
      return reply.status(200).send({ data: [], nextCursor: null });
    }

    let beforeDate: Date | undefined;
    if (before) {
      const pivot = await prisma.activity.findUnique({
        where: { id: before },
        select: { createdAt: true },
      });
      if (pivot) beforeDate = pivot.createdAt;
    }

    const activities = await prisma.activity.findMany({
      where: {
        projectId: { in: projectIds },
        ...(beforeDate ? { createdAt: { lt: beforeDate } } : {}),
        ...(subjectId ? { subjectId } : {}),
        ...(subjectType ? { subjectType } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        actor: { select: { id: true, email: true, name: true } },
      },
    });

    const nextCursor = activities.length === limit
      ? (activities[activities.length - 1]?.id ?? null)
      : null;

    return reply.status(200).send({ data: activities, nextCursor });
  });

  /**
   * GET /projects/:projectId/activity
   * Paginated activity feed for a project. Ownership-gated.
   */
  app.get('/projects/:projectId/activity', { preHandler: [requireAuth] }, async (request, reply) => {
    const projectIdParsed = cuidParam.safeParse(
      (request.params as { projectId: string }).projectId,
    );
    if (!projectIdParsed.success) {
      return reply.status(400).send({ error: 'Invalid project id' });
    }

    const queryParsed = listActivityQuerySchema.safeParse(request.query);
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

    const { limit, before, subjectId, subjectType } = queryParsed.data;

    // Cursor: find the createdAt of the "before" record
    let beforeDate: Date | undefined;
    if (before) {
      const pivot = await prisma.activity.findUnique({
        where: { id: before },
        select: { createdAt: true },
      });
      if (pivot) beforeDate = pivot.createdAt;
    }

    const activities = await prisma.activity.findMany({
      where: {
        projectId: projectIdParsed.data,
        ...(beforeDate ? { createdAt: { lt: beforeDate } } : {}),
        ...(subjectId ? { subjectId } : {}),
        ...(subjectType ? { subjectType } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        actor: { select: { id: true, email: true, name: true } },
      },
    });

    const nextCursor = activities.length === limit
      ? (activities[activities.length - 1]?.id ?? null)
      : null;

    return reply.status(200).send({ data: activities, nextCursor });
  });
};

export default activityRoutes;
