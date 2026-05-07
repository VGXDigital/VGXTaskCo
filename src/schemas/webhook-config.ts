// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { z } from 'zod';

export const ALLOWED_WEBHOOK_EVENTS = [
  'task.created',
  'task.updated',
  'task.status.changed',
  'task.completed',
  'task.archived',
  'task.unarchived',
  'task.deleted',
  'test',
] as const;

/**
 * Validates that a webhook URL is a public HTTPS endpoint.
 * Blocks localhost, loopback, link-local, and RFC1918 private ranges
 * to prevent SSRF attacks against internal infrastructure.
 * In non-production environments, local URLs are allowed for testing.
 */
const publicHttpsUrl = z.string().url().refine((url) => {
  if (process.env.NODE_ENV !== 'production') return true;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const h = parsed.hostname;
    if (['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(h)) return false;
    if (/^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false;
    if (h === '169.254.169.254') return false;
    return true;
  } catch {
    return false;
  }
}, 'Webhook URL must be a public HTTPS endpoint');

export const createWebhookBodySchema = z
  .object({
    url: publicHttpsUrl,
    events: z.array(z.enum(ALLOWED_WEBHOOK_EVENTS)).min(1, 'At least one event required'),
  })
  .strict();

export const updateWebhookBodySchema = z
  .object({
    active: z.boolean().optional(),
    events: z.array(z.enum(ALLOWED_WEBHOOK_EVENTS)).min(1, 'At least one event required').optional(),
  })
  .strict()
  .refine((d) => d.active !== undefined || d.events !== undefined, { message: 'Empty update' });

export type CreateWebhookBody = z.infer<typeof createWebhookBodySchema>;
export type UpdateWebhookBody = z.infer<typeof updateWebhookBodySchema>;
