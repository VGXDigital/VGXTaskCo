// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { requireAuthOrApiToken } from '../middleware/api-token.js';
import { searchQuerySchema } from '../schemas/search.js';

const searchRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /search
   * Full-text search across projects and tasks scoped to the caller.
   */
  app.get('/search', { preHandler: [requireAuthOrApiToken] }, async (request, reply) => {
    const parsed = searchQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Invalid query parameter';
      return reply.status(400).send({ error: message });
    }

    const { q } = parsed.data;
    const userId = request.user.id;

    const [projects, tasks] = await Promise.all([
      prisma.project.findMany({
        where: {
          ownerId: userId,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 10,
        orderBy: { updatedAt: 'desc' },
      }),

      prisma.task.findMany({
        where: {
          project: { ownerId: userId },
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 10,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return reply.status(200).send({ data: { projects, tasks } });
  });
};

export default searchRoutes;
