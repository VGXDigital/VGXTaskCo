// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { createHmac } from 'node:crypto';
import { prisma } from '../lib/prisma.js';

/**
 * Fire-and-forget webhook dispatcher.
 * Finds all active WebhookEndpoint records for ownerId that subscribe to the eventType,
 * signs each request with HMAC-SHA256, and dispatches concurrently.
 */
export async function dispatchWebhook(
  eventType: string,
  payload: unknown,
  ownerId: string,
): Promise<void> {
  try {
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: {
        ownerId,
        active: true,
        events: { has: eventType },
      },
    });

    if (endpoints.length === 0) return;

    const body = JSON.stringify({
      event: eventType,
      payload,
      timestamp: new Date().toISOString(),
    });

    await Promise.allSettled(
      endpoints.map(async (endpoint) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        try {
          const sig = createHmac('sha256', endpoint.secret).update(body).digest('hex');

          await fetch(endpoint.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-VGXT-Signature': `sha256=${sig}`,
            },
            body,
            signal: controller.signal,
          });
        } catch (err) {
          console.error(`[webhooks] Failed to dispatch to ${endpoint.url}:`, err);
        } finally {
          clearTimeout(timeout);
        }
      }),
    );
  } catch (err) {
    console.error('[webhooks] dispatchWebhook error:', err);
  }
}
