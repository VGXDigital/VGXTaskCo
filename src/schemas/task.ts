// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { z } from 'zod';
import { TaskStatus, Priority } from '@prisma/client';

export const createTaskBodySchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or fewer'),
    description: z
      .string()
      .max(5000, 'Description must be 5000 characters or fewer')
      .optional(),
    status: z.nativeEnum(TaskStatus).optional(),
    priority: z.nativeEnum(Priority).optional(),
    dueDate: z.string().datetime({ message: 'dueDate must be an ISO 8601 datetime string' }).optional(),
  })
  .strict();

export const updateTaskBodySchema = z
  .object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(200, 'Title must be 200 characters or fewer')
      .optional(),
    description: z
      .string()
      .max(5000, 'Description must be 5000 characters or fewer')
      .optional(),
    status: z.nativeEnum(TaskStatus).optional(),
    priority: z.nativeEnum(Priority).optional(),
    dueDate: z
      .union([
        z.string().datetime({ message: 'dueDate must be an ISO 8601 datetime string' }),
        z.null(),
      ])
      .optional(),
    archivedAt: z
      .union([
        z.string().datetime({ message: 'archivedAt must be an ISO 8601 datetime string' }),
        z.null(),
      ])
      .optional(),
  })
  .strict()
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    { message: 'Empty update: at least one field must be provided' },
  );

export const listTasksQuerySchema = z
  .object({
    status: z.nativeEnum(TaskStatus).optional(),
    priority: z.nativeEnum(Priority).optional(),
    dueWithin: z.enum(['today', 'thisWeek', 'overdue', 'doneInLast7Days']).optional(),
    tagIds: z
      .string()
      .optional()
      .transform((val) => (val ? val.split(',').map((s) => s.trim()).filter(Boolean) : undefined)),
    search: z.string().max(200, 'Search query must be 200 characters or fewer').optional(),
    includeArchived: z.coerce.boolean().optional().default(false),
  })
  .strict();

export const bulkStatusBodySchema = z
  .object({
    ids: z.array(z.string().cuid('Invalid task id')).min(1).max(500),
    status: z.nativeEnum(TaskStatus),
  })
  .strict();

export const bulkMoveBodySchema = z
  .object({
    ids: z.array(z.string().cuid('Invalid task id')).min(1).max(500),
    projectId: z.string().cuid('Invalid project id'),
  })
  .strict();

export const bulkIdsBodySchema = z
  .object({
    ids: z.array(z.string().cuid('Invalid task id')).min(1).max(500),
  })
  .strict();

export type CreateTaskBody = z.infer<typeof createTaskBodySchema>;
export type UpdateTaskBody = z.infer<typeof updateTaskBodySchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type BulkStatusBody = z.infer<typeof bulkStatusBodySchema>;
export type BulkMoveBody = z.infer<typeof bulkMoveBodySchema>;
export type BulkIdsBody = z.infer<typeof bulkIdsBodySchema>;
