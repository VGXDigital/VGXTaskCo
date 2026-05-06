// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { z } from 'zod';

export const createApiTokenBodySchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or fewer'),
    expiresInDays: z.number().int().min(1).max(365).optional(),
    scope: z.enum(['user', 'service']).default('user'),
  })
  .strict();

export type CreateApiTokenBody = z.infer<typeof createApiTokenBodySchema>;
