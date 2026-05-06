// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import type { preHandlerHookHandler } from 'fastify';
import { verifyJwt } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      id: string;
      email: string;
      name: string;
    };
  }
}

/**
 * Fastify preHandler that enforces JWT authentication.
 * Reads Authorization: Bearer <token>, verifies the JWT,
 * confirms the user still exists, and attaches request.user.
 *
 * Apply per-route via { preHandler: [requireAuth] } — not globally.
 */
export const requireAuth: preHandlerHookHandler = async (request, reply) => {
  const authHeader = request.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.slice(7);

  let userId: string;
  try {
    const payload = await verifyJwt(token);
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
