// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.
// Integration tests for POST /tasks/parse — validation and auth guards only.
// Actual Groq AI parsing is not tested here (requires a live API key).

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../setup.js';
import * as envLib from '../../src/lib/env.js';

function uniqueEmail() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`;
}

async function registerUser(
  app: FastifyInstance,
  email: string,
): Promise<{ token: string }> {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email, password: 'supersecret1234', name: 'Test User' },
  });
  const body = res.json<{ data: { token: string } }>();
  return { token: body.data.token };
}

// ── POST /tasks/parse ─────────────────────────────────────────────────────────

describe('POST /tasks/parse', () => {
  let app: FastifyInstance;
  let token: string;

  beforeAll(async () => {
    app = await buildTestApp();
    const user = await registerUser(app, uniqueEmail());
    token = user.token;
  });

  describe('when GROQ_API_KEY is absent', () => {
    let originalKey: string | undefined;

    beforeEach(() => {
      // Temporarily strip the key so the 503 guard fires
      originalKey = envLib.env.GROQ_API_KEY;
      (envLib.env as Record<string, unknown>).GROQ_API_KEY = undefined;
    });

    afterEach(() => {
      (envLib.env as Record<string, unknown>).GROQ_API_KEY = originalKey;
    });

    it('returns 503 when GROQ_API_KEY is not configured', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/tasks/parse',
        headers: { authorization: `Bearer ${token}` },
        payload: { text: 'Buy milk tomorrow' },
      });
      expect(res.statusCode).toBe(503);
      const body = res.json<{ error: string }>();
      expect(typeof body.error).toBe('string');
    });
  });

  it('returns 400 with empty text string', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tasks/parse',
      headers: { authorization: `Bearer ${token}` },
      payload: { text: '' },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json<{ error: string }>();
    expect(typeof body.error).toBe('string');
  });

  it('returns 400 with text longer than 500 characters', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tasks/parse',
      headers: { authorization: `Bearer ${token}` },
      payload: { text: 'a'.repeat(501) },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json<{ error: string }>();
    expect(typeof body.error).toBe('string');
  });

  it('returns 401 without auth token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tasks/parse',
      payload: { text: 'Schedule a call next Monday' },
    });
    expect(res.statusCode).toBe(401);
  });
});
