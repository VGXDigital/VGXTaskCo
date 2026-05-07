// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { z } from 'zod';

export const searchQuerySchema = z
  .object({
    q: z.string().min(2, 'Search query must be at least 2 characters').max(200, 'Search query must be 200 characters or fewer'),
  })
  .strict();

export type SearchQuery = z.infer<typeof searchQuerySchema>;
