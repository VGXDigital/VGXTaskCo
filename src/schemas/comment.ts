// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { z } from 'zod';

export const createCommentBodySchema = z
  .object({
    body: z.string().min(1, 'Comment body is required').max(5000, 'Comment body must be 5000 characters or fewer'),
  })
  .strict();

export const updateCommentBodySchema = z
  .object({
    body: z.string().min(1, 'Comment body is required').max(5000, 'Comment body must be 5000 characters or fewer'),
  })
  .strict();

export type CreateCommentBody = z.infer<typeof createCommentBodySchema>;
export type UpdateCommentBody = z.infer<typeof updateCommentBodySchema>;
