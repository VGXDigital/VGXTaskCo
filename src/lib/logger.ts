// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

/**
 * src/lib/logger.ts
 *
 * Shared pino logger for service-layer code that runs outside of a Fastify
 * request context (fire-and-forget helpers, background workers).
 * Fastify's own app.log should be preferred inside route handlers.
 */

import pino from 'pino';

export const logger = pino({
  level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
});
