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

export const createWebhookBodySchema = z
  .object({
    url: z.string().url('Invalid webhook URL'),
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
