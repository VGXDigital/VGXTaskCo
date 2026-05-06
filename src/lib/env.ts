// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  ALLOWED_FRONTEND_ORIGINS: z
    .string()
    .optional()
    .transform((val, ctx) => {
      if (val) return val;
      if (process.env['NODE_ENV'] === 'production') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'ALLOWED_FRONTEND_ORIGINS is required in production',
        });
        return z.NEVER;
      }
      return 'http://localhost:5173';
    }),
  API_TOKEN_PEPPER: z
    .string()
    .min(32, 'API_TOKEN_PEPPER must be at least 32 characters'),
  // ── SSO (optional — local auth still works without these) ──────────────────
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Invalid environment variables:');
  console.error(result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = result.data;

export type Env = z.infer<typeof envSchema>;
