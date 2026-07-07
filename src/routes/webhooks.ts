// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { requireAuthOrApiToken } from '../middleware/api-token.js';
import { createWebhookBodySchema, updateWebhookBodySchema } from '../schemas/webhook-config.js';
import { dispatchWebhook } from '../services/webhooks.js';

const cuidParam = z.string().cuid('Invalid id');

const webhookRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /webhooks
   * Create a new webhook endpoint. Secret returned ONCE.
   */
  app.post('/webhooks', { preHandler: [requireAuthOrApiToken] }, async (request, reply) => {
    const parsed = createWebhookBodySchema.safeParse(request.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Validation error';
      return reply.status(400).send({ error: message });
    }

    const secret = randomBytes(32).toString('hex');

    const webhook = await prisma.webhookEndpoint.create({
      data: {
        ownerId: request.user.id,
        url: parsed.data.url,
        events: parsed.data.events as string[],
        secret,
      },
    });

    return reply.status(201).send({
      data: {
        id: webhook.id,
        ownerId: webhook.ownerId,
        url: webhook.url,
        events: webhook.events,
        active: webhook.active,
        createdAt: webhook.createdAt,
        secret, // shown ONCE
      },
    });
  });

  /**
   * GET /webhooks
   * List all webhook endpoints for the authenticated user. Secret never returned.
   */
  app.get('/webhooks', { preHandler: [requireAuthOrApiToken] }, async (request, reply) => {
    const webhooks = await prisma.webhookEndpoint.findMany({
      where: { ownerId: request.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        ownerId: true,
        url: true,
        events: true,
        active: true,
        createdAt: true,
      },
    });

    return reply.status(200).send({ data: webhooks });
  });

  /**
   * PATCH /webhooks/:id
   * Update a webhook endpoint. Ownership-gated.
   */
  app.patch('/webhooks/:id', { preHandler: [requireAuthOrApiToken] }, async (request, reply) => {
    const idParsed = cuidParam.safeParse((request.params as { id: string }).id);
    if (!idParsed.success) {
      return reply.status(400).send({ error: 'Invalid webhook id' });
    }

    const parsed = updateWebhookBodySchema.safeParse(request.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Validation error';
      return reply.status(400).send({ error: message });
    }

    const webhook = await prisma.webhookEndpoint.findFirst({
      where: { id: idParsed.data, ownerId: request.user.id },
    });

    if (!webhook) {
      return reply.status(404).send({ error: 'Webhook not found' });
    }

    const updated = await prisma.webhookEndpoint.update({
      where: { id: idParsed.data },
      data: {
        ...(parsed.data.active !== undefined && { active: parsed.data.active }),
        ...(parsed.data.events !== undefined && { events: parsed.data.events as string[] }),
      },
      select: {
        id: true,
        ownerId: true,
        url: true,
        events: true,
        active: true,
        createdAt: true,
      },
    });

    return reply.status(200).send({ data: updated });
  });

  /**
   * POST /webhooks/:id/rotate-secret
   * Rotate the secret for a webhook endpoint. New secret returned ONCE.
   */
  app.post('/webhooks/:id/rotate-secret', { preHandler: [requireAuthOrApiToken] }, async (request, reply) => {
    const idParsed = cuidParam.safeParse((request.params as { id: string }).id);
    if (!idParsed.success) {
      return reply.status(400).send({ error: 'Invalid webhook id' });
    }

    const webhook = await prisma.webhookEndpoint.findFirst({
      where: { id: idParsed.data, ownerId: request.user.id },
    });

    if (!webhook) {
      return reply.status(404).send({ error: 'Webhook not found' });
    }

    const newSecret = randomBytes(32).toString('hex');

    const updated = await prisma.webhookEndpoint.update({
      where: { id: idParsed.data },
      data: { secret: newSecret },
    });

    return reply.status(200).send({
      data: {
        id: updated.id,
        ownerId: updated.ownerId,
        url: updated.url,
        events: updated.events,
        active: updated.active,
        createdAt: updated.createdAt,
        secret: newSecret,
      },
    });
  });

  /**
   * POST /webhooks/:id/test
   * Dispatch a test event to the webhook endpoint.
   */
  app.post('/webhooks/:id/test', { preHandler: [requireAuthOrApiToken] }, async (request, reply) => {
    const idParsed = cuidParam.safeParse((request.params as { id: string }).id);
    if (!idParsed.success) {
      return reply.status(400).send({ error: 'Invalid webhook id' });
    }

    const webhook = await prisma.webhookEndpoint.findFirst({
      where: { id: idParsed.data, ownerId: request.user.id },
    });

    if (!webhook) {
      return reply.status(404).send({ error: 'Webhook not found' });
    }

    void dispatchWebhook('test', { message: 'vgx-taskco webhook test' }, request.user.id);

    return reply.status(200).send({ data: { dispatched: true } });
  });

  /**
   * DELETE /webhooks/:id
   * Delete a webhook endpoint. Ownership-gated.
   */
  app.delete('/webhooks/:id', { preHandler: [requireAuthOrApiToken] }, async (request, reply) => {
    const idParsed = cuidParam.safeParse((request.params as { id: string }).id);
    if (!idParsed.success) {
      return reply.status(400).send({ error: 'Invalid webhook id' });
    }

    const webhook = await prisma.webhookEndpoint.findFirst({
      where: { id: idParsed.data, ownerId: request.user.id },
    });

    if (!webhook) {
      return reply.status(404).send({ error: 'Webhook not found' });
    }

    await prisma.webhookEndpoint.delete({ where: { id: idParsed.data } });

    return reply.status(200).send({ data: { deleted: true } });
  });
};

export default webhookRoutes;
