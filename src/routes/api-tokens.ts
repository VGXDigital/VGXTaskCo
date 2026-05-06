// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { randomBytes, createHmac } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { env } from '../lib/env.js';
import { createApiTokenBodySchema } from '../schemas/api-token.js';

const cuidParam = z.string().cuid('Invalid id');

const apiTokenRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /api-tokens
   * Create a new API token. The raw token is returned ONCE — it cannot be recovered.
   */
  app.post('/api-tokens', { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = createApiTokenBodySchema.safeParse(request.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Validation error';
      return reply.status(400).send({ error: message });
    }

    const { name, expiresInDays, scope } = parsed.data;

    // Generate raw token: "vgxt_" + 32 random bytes base64url
    const rawToken = 'vgxt_' + randomBytes(32).toString('base64url');
    const prefix = rawToken.slice(5, 13); // first 8 chars after "vgxt_"

    // Hash with HMAC-SHA256 using pepper
    const tokenHash = createHmac('sha256', env.API_TOKEN_PEPPER)
      .update(rawToken)
      .digest('hex');

    let expiresAt: Date | null = null;
    if (expiresInDays) {
      expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    }

    const apiToken = await prisma.apiToken.create({
      data: {
        name,
        tokenHash,
        prefix,
        ownerId: request.user.id,
        scope,
        expiresAt,
      },
    });

    return reply.status(201).send({
      data: {
        id: apiToken.id,
        name: apiToken.name,
        prefix: apiToken.prefix,
        token: rawToken, // shown ONCE
        expiresAt: apiToken.expiresAt,
      },
    });
  });

  /**
   * GET /api-tokens
   * List all API tokens for the authenticated user. Token hash is never returned.
   */
  app.get('/api-tokens', { preHandler: [requireAuth] }, async (request, reply) => {
    const tokens = await prisma.apiToken.findMany({
      where: { ownerId: request.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        prefix: true,
        scope: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
      },
    });

    return reply.status(200).send({ data: tokens });
  });

  /**
   * DELETE /api-tokens/:id
   * Soft-revoke an API token by setting revokedAt.
   */
  app.delete('/api-tokens/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const idParsed = cuidParam.safeParse((request.params as { id: string }).id);
    if (!idParsed.success) {
      return reply.status(400).send({ error: 'Invalid token id' });
    }

    const token = await prisma.apiToken.findFirst({
      where: { id: idParsed.data, ownerId: request.user.id },
    });

    if (!token) {
      return reply.status(404).send({ error: 'Token not found' });
    }

    await prisma.apiToken.update({
      where: { id: idParsed.data },
      data: { revokedAt: new Date() },
    });

    return reply.status(200).send({ data: { revoked: true } });
  });
};

export default apiTokenRoutes;
