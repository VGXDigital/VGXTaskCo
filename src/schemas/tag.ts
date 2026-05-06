// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { z } from 'zod';

export const createTagBodySchema = z
  .object({
    value: z.string().min(1, 'Tag value is required').max(100, 'Tag value must be 100 characters or fewer'),
  })
  .strict();

export const attachTagsBodySchema = z
  .object({
    tagIds: z.array(z.string().cuid('Invalid tag id')).min(1, 'At least one tag id required').max(50, 'Maximum 50 tags'),
  })
  .strict();

export type CreateTagBody = z.infer<typeof createTagBodySchema>;
export type AttachTagsBody = z.infer<typeof attachTagsBodySchema>;
