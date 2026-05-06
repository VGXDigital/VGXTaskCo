// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { z } from 'zod';
import { TaskStatus, Priority } from '@prisma/client';

export const savedFilterSchema = z
  .object({
    status: z.array(z.nativeEnum(TaskStatus)).optional(),
    priority: z.array(z.nativeEnum(Priority)).optional(),
    tagIds: z.array(z.string().cuid('Invalid tag id')).optional(),
    dueWithin: z.enum(['today', 'thisWeek', 'overdue', 'doneInLast7Days']).optional(),
    search: z.string().max(200, 'Search must be 200 characters or fewer').optional(),
    includeArchived: z.boolean().optional().default(false),
  })
  .strict();

export const createViewBodySchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or fewer'),
    scope: z.enum(['user', 'project']),
    projectId: z.string().cuid('Invalid project id').optional(),
    filter: savedFilterSchema,
  })
  .strict();

export const updateViewBodySchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or fewer').optional(),
    filter: savedFilterSchema.optional(),
  })
  .strict()
  .refine((d) => d.name !== undefined || d.filter !== undefined, { message: 'Empty update' });

export type SavedFilter = z.infer<typeof savedFilterSchema>;
export type CreateViewBody = z.infer<typeof createViewBodySchema>;
export type UpdateViewBody = z.infer<typeof updateViewBodySchema>;
