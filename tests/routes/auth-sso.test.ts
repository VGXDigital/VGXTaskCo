// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import 'dotenv/config';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../setup.js';
import * as supabaseLib from '../../src/lib/supabase.js';

// We spy on getSupabaseAdmin (already loaded by setupFiles via auth.ts) rather
// than using vi.mock, because the setupFile has already resolved the live binding
// in auth.ts before vi.mock could intercept it.
function uniqueEmail() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`;
}

describe('POST /auth/sso/exchange', () => {
  let app: FastifyInstance;
  let mockGetUser: ReturnType<typeof vi.fn>;
  let supabaseSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    mockGetUser = vi.fn();
    supabaseSpy = vi.spyOn(supabaseLib, 'getSupabaseAdmin').mockReturnValue({
      auth: { getUser: mockGetUser },
    } as unknown as ReturnType<typeof supabaseLib.getSupabaseAdmin>);
    app = await buildTestApp();
  });

  afterEach(() => {
    supabaseSpy.mockRestore();
  });

  it('returns 400 on missing accessToken', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/sso/exchange',
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 on empty accessToken', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/sso/exchange',
      payload: { accessToken: '' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 "Invalid SSO token" when supabase returns no user', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'invalid' },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/auth/sso/exchange',
      payload: { accessToken: 'bad-token' },
    });
    expect(res.statusCode).toBe(401);
    const body = res.json<{ error: string }>();
    expect(body.error).toBe('Invalid SSO token');
  });

  it('returns 201 + JWT + creates user in DB on first Google SSO login', async () => {
    const ssoEmail = uniqueEmail();
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'g-supabase-uid-001',
          email: ssoEmail,
          user_metadata: { full_name: 'SSO User', sub: 'google-sub-001' },
          app_metadata: { provider: 'google' },
          identities: [],
        },
      },
      error: null,
    });

    const res = await app.inject({
      method: 'POST',
      url: '/auth/sso/exchange',
      payload: { accessToken: 'valid-google-token' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json<{ data: { token: string; user: { email: string; name: string } } }>();
    expect(body.data.token).toBeTruthy();
    expect(body.data.user.email).toBe(ssoEmail);
    expect(body.data.user.name).toBe('SSO User');
  });

  it('returns 200 (not 201) on second login with same Google account', async () => {
    const ssoEmail = uniqueEmail();

    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'g-supabase-uid-002',
          email: ssoEmail,
          user_metadata: { full_name: 'Returning User', sub: 'google-sub-002' },
          app_metadata: { provider: 'google' },
          identities: [],
        },
      },
      error: null,
    });

    // First call — creates user (201)
    await app.inject({
      method: 'POST',
      url: '/auth/sso/exchange',
      payload: { accessToken: 'valid-google-token-returning' },
    });

    // Second call with same mock — returns existing user (200)
    const res2 = await app.inject({
      method: 'POST',
      url: '/auth/sso/exchange',
      payload: { accessToken: 'valid-google-token-returning' },
    });
    expect(res2.statusCode).toBe(200);
    const body = res2.json<{ data: { token: string } }>();
    expect(body.data.token).toBeTruthy();
  });

  it('returns 401 "Unsupported provider" for an unsupported OAuth provider', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'tw-supabase-uid-001',
          email: uniqueEmail(),
          user_metadata: { full_name: 'Twitter User', sub: 'twitter-sub-001' },
          app_metadata: { provider: 'twitter' },
          identities: [],
        },
      },
      error: null,
    });

    const res = await app.inject({
      method: 'POST',
      url: '/auth/sso/exchange',
      payload: { accessToken: 'valid-twitter-token' },
    });
    expect(res.statusCode).toBe(401);
    const body = res.json<{ error: string }>();
    expect(body.error).toBe('Unsupported provider');
  });
});
