// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { z } from 'zod';

export const listActivityQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    before: z.string().cuid('Invalid cursor id').optional(),
    subjectId: z.string().cuid('Invalid subject id').optional(),
    subjectType: z.enum(['task', 'project', 'comment', 'tag']).optional(),
  })
  .strict();

export type ListActivityQuery = z.infer<typeof listActivityQuerySchema>;
