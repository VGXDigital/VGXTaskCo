// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { z } from 'zod';

export const registerBodySchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(12, 'Password must be at least 12 characters'),
    name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or fewer'),
  })
  .strict();

export const loginBodySchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  })
  .strict();

export const ssoExchangeBodySchema = z
  .object({
    accessToken: z.string().min(1, 'accessToken is required'),
  })
  .strict();

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type SsoExchangeBody = z.infer<typeof ssoExchangeBodySchema>;
