// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

/**
 * Returns a Supabase admin client for server-side token verification.
 * Returns null if SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY are not configured —
 * SSO is optional and local auth continues to work without them.
 */
export function getSupabaseAdmin() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
