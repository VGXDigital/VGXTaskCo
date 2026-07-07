// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import type { preHandlerHookHandler } from 'fastify';
import { timingSafeEqual, createHmac } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { env } from '../lib/env.js';
import { verifyJwt } from '../lib/jwt.js';

declare module 'fastify' {
  interface FastifyRequest {
    apiTokenScope?: string;
  }
}

/**
 * Fastify preHandler that accepts either a vgx-taskco API token (vgxt_...) or a JWT.
 *
 * API token path:
 *   - Extract prefix (first 8 chars after "vgxt_")
 *   - Look up active, non-expired token by prefix
 *   - HMAC-SHA256 the full token value and timing-safe compare against stored hash
 *   - Attach request.user and request.apiTokenScope
 *   - Update lastUsedAt fire-and-forget
 *
 * JWT path:
 *   - Falls through to the existing verifyJwt logic
 */
export const requireAuthOrApiToken: preHandlerHookHandler = async (request, reply) => {
  const authHeader = request.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing or malformed Authorization header' });
  }

  const tokenValue = authHeader.slice(7);

  if (tokenValue.startsWith('vgxt_')) {
    // API token path
    const prefix = tokenValue.slice(5, 13); // chars 5-12 of the full token (first 8 after "vgxt_")

    const apiToken = await prisma.apiToken.findFirst({
      where: {
        prefix,
        revokedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    if (!apiToken) {
      return reply.status(401).send({ error: 'Invalid or expired token' });
    }

    // Timing-safe comparison
    const candidateHash = createHmac('sha256', env.API_TOKEN_PEPPER)
      .update(tokenValue)
      .digest('hex');

    const storedBuf = Buffer.from(apiToken.tokenHash, 'hex');
    const candidateBuf = Buffer.from(candidateHash, 'hex');

    if (
      storedBuf.length !== candidateBuf.length ||
      !timingSafeEqual(storedBuf, candidateBuf)
    ) {
      return reply.status(401).send({ error: 'Invalid or expired token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: apiToken.ownerId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return reply.status(401).send({ error: 'Invalid or expired token' });
    }

    request.user = user;
    request.apiTokenScope = apiToken.scope;

    // Update lastUsedAt fire-and-forget
    void prisma.apiToken.update({
      where: { id: apiToken.id },
      data: { lastUsedAt: new Date() },
    });

    return;
  }

  // JWT path — re-use existing verify logic
  let userId: string;
  try {
    const payload = await verifyJwt(tokenValue);
    userId = payload.userId;
  } catch {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }

  request.user = user;
};
