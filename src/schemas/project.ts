// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { z } from 'zod';

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const createProjectBodySchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or fewer'),
    description: z
      .string()
      .max(2000, 'Description must be 2000 characters or fewer')
      .optional(),
    color: z
      .string()
      .regex(HEX_COLOR_RE, 'Color must be a valid hex color (e.g. #3b82f6)')
      .optional(),
  })
  .strict();

export const updateProjectBodySchema = z
  .object({
    name: z
      .string()
      .min(1, 'Name is required')
      .max(100, 'Name must be 100 characters or fewer')
      .optional(),
    description: z
      .string()
      .max(2000, 'Description must be 2000 characters or fewer')
      .optional(),
    color: z
      .string()
      .regex(HEX_COLOR_RE, 'Color must be a valid hex color (e.g. #3b82f6)')
      .optional(),
  })
  .strict()
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    { message: 'Empty update: at least one field must be provided' },
  );

export type CreateProjectBody = z.infer<typeof createProjectBodySchema>;
export type UpdateProjectBody = z.infer<typeof updateProjectBodySchema>;
