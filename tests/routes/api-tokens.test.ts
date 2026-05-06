// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import 'dotenv/config';
import { describe, it, expect, beforeAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../setup.js';

function uniqueEmail() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`;
}

async function registerAndLogin(app: FastifyInstance) {
  const email = uniqueEmail();
  const res = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email, password: 'supersecret1234', name: 'API Token User' },
  });
  const body = res.json<{ data: { token: string } }>();
  return { token: body.data.token, email };
}

describe('POST /api-tokens', () => {
  let app: FastifyInstance;
  let jwtToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
    const user = await registerAndLogin(app);
    jwtToken = user.token;
  });

  it('returns 201 with id, name, prefix, and token on valid body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api-tokens',
      headers: { authorization: `Bearer ${jwtToken}` },
      payload: { name: 'My CI token' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json<{ data: { id: string; name: string; prefix: string; token: string } }>();
    expect(body.data.id).toBeTruthy();
    expect(body.data.name).toBe('My CI token');
    expect(body.data.token).toBeTruthy();
    expect(body.data.token.startsWith('vgxt_')).toBe(true);
    expect(body.data.prefix).toBeTruthy();
    // prefix is the first 8 chars after "vgxt_"
    expect(body.data.prefix).toBe(body.data.token.slice(5, 13));
  });

  it('returns 400 on missing name', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api-tokens',
      headers: { authorization: `Bearer ${jwtToken}` },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 on name longer than 100 characters', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api-tokens',
      headers: { authorization: `Bearer ${jwtToken}` },
      payload: { name: 'a'.repeat(101) },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api-tokens', () => {
  let app: FastifyInstance;
  let jwtToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
    const user = await registerAndLogin(app);
    jwtToken = user.token;

    // Create two tokens — one will be revoked
    const res1 = await app.inject({
      method: 'POST',
      url: '/api-tokens',
      headers: { authorization: `Bearer ${jwtToken}` },
      payload: { name: 'token-to-list' },
    });
    const tokenId = res1.json<{ data: { id: string } }>().data.id;

    // Revoke it
    await app.inject({
      method: 'DELETE',
      url: `/api-tokens/${tokenId}`,
      headers: { authorization: `Bearer ${jwtToken}` },
    });
  });

  it('returns 200 listing tokens and does not include token field', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api-tokens',
      headers: { authorization: `Bearer ${jwtToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: Record<string, unknown>[] }>();
    expect(Array.isArray(body.data)).toBe(true);

    for (const t of body.data) {
      // token (raw value) must never appear in list
      expect(t['token']).toBeUndefined();
      // tokenHash must never appear in list
      expect(t['tokenHash']).toBeUndefined();
      // prefix is present
      expect(t['prefix']).toBeTruthy();
    }
  });

  it('revoked tokens are still listed (soft-delete audit trail)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api-tokens',
      headers: { authorization: `Bearer ${jwtToken}` },
    });
    const body = res.json<{ data: { revokedAt: string | null }[] }>();
    const hasRevoked = body.data.some((t) => t.revokedAt !== null);
    expect(hasRevoked).toBe(true);
  });
});

describe('DELETE /api-tokens/:id (revoke)', () => {
  let app: FastifyInstance;
  let jwtToken: string;
  let tokenId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    const user = await registerAndLogin(app);
    jwtToken = user.token;

    const res = await app.inject({
      method: 'POST',
      url: '/api-tokens',
      headers: { authorization: `Bearer ${jwtToken}` },
      payload: { name: 'token-to-revoke' },
    });
    tokenId = res.json<{ data: { id: string } }>().data.id;
  });

  it('returns 200 { revoked: true } on revoke', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api-tokens/${tokenId}`,
      headers: { authorization: `Bearer ${jwtToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: { revoked: boolean } }>();
    expect(body.data.revoked).toBe(true);
  });

  it('subsequent GET shows revokedAt set on the revoked token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api-tokens',
      headers: { authorization: `Bearer ${jwtToken}` },
    });
    const body = res.json<{ data: { id: string; revokedAt: string | null }[] }>();
    const found = body.data.find((t) => t.id === tokenId);
    expect(found).toBeDefined();
    expect(found?.revokedAt).not.toBeNull();
  });
});

describe('Authentication with API token', () => {
  let app: FastifyInstance;
  let jwtToken: string;
  let rawApiToken: string;
  let apiTokenId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    const user = await registerAndLogin(app);
    jwtToken = user.token;

    const res = await app.inject({
      method: 'POST',
      url: '/api-tokens',
      headers: { authorization: `Bearer ${jwtToken}` },
      payload: { name: 'auth-test-token' },
    });
    const body = res.json<{ data: { id: string; token: string } }>();
    rawApiToken = body.data.token;
    apiTokenId = body.data.id;
  });

  it('GET /search returns 200 with a valid API token as Bearer', async () => {
    // /search uses requireAuthOrApiToken — accepts both JWT and vgxt_ tokens
    const res = await app.inject({
      method: 'GET',
      url: '/search?q=test',
      headers: { authorization: `Bearer ${rawApiToken}` },
    });
    expect(res.statusCode).toBe(200);
  });

  it('GET /search returns 401 after the token is revoked', async () => {
    // Revoke the token
    await app.inject({
      method: 'DELETE',
      url: `/api-tokens/${apiTokenId}`,
      headers: { authorization: `Bearer ${jwtToken}` },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/search?q=test',
      headers: { authorization: `Bearer ${rawApiToken}` },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('Service scope', () => {
  let app: FastifyInstance;
  let jwtToken: string;
  let serviceToken: string;
  let userToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
    const user = await registerAndLogin(app);
    jwtToken = user.token;

    const serviceRes = await app.inject({
      method: 'POST',
      url: '/api-tokens',
      headers: { authorization: `Bearer ${jwtToken}` },
      payload: { name: 'service-scoped-token', scope: 'service' },
    });
    serviceToken = serviceRes.json<{ data: { token: string } }>().data.token;

    const userRes = await app.inject({
      method: 'POST',
      url: '/api-tokens',
      headers: { authorization: `Bearer ${jwtToken}` },
      payload: { name: 'user-scoped-token', scope: 'user' },
    });
    userToken = userRes.json<{ data: { token: string } }>().data.token;
  });

  it('valid x-internal-key can access GET /internal/reminders/due-today', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/internal/reminders/due-today',
      headers: { 'x-internal-key': 'dev-internal-key' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('service-scoped API token gets 403 on GET /internal/reminders/due-today', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/internal/reminders/due-today',
      headers: { authorization: `Bearer ${serviceToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('user-scoped API token gets 403 on GET /internal/reminders/due-today', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/internal/reminders/due-today',
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('JWT user gets 403 on GET /internal/reminders/due-today', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/internal/reminders/due-today',
      headers: { authorization: `Bearer ${jwtToken}` },
    });
    expect(res.statusCode).toBe(403);
  });
});
