// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { z } from 'zod';
import { TaskStatus, Priority } from '@prisma/client';

/**
 * Query schema for GET /projects/:projectId/export/tasks.csv
 */
export const exportProjectTasksQuerySchema = z
  .object({
    status: z.nativeEnum(TaskStatus).optional(),
    priority: z.nativeEnum(Priority).optional(),
    includeArchived: z.enum(['true', 'false']).optional(),
  })
  .strict();

/**
 * Query schema for GET /export/tasks.csv
 */
export const exportAllTasksQuerySchema = z
  .object({
    projectIds: z.string().optional(),
    status: z.nativeEnum(TaskStatus).optional(),
    priority: z.nativeEnum(Priority).optional(),
    from: z.string().datetime({ message: 'from must be an ISO 8601 datetime string' }).optional(),
    to: z.string().datetime({ message: 'to must be an ISO 8601 datetime string' }).optional(),
  })
  .strict();

export type ExportProjectTasksQuery = z.infer<typeof exportProjectTasksQuerySchema>;
export type ExportAllTasksQuery = z.infer<typeof exportAllTasksQuerySchema>;
