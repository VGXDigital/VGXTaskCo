// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.
// Response shape assertions added in v0.6.7 to catch backend→frontend contract breaks.

import { describe, it, expect, beforeAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../setup.js';

function uniqueEmail() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`;
}

describe('POST /auth/register', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  it('returns 201 with token and user on valid body', async () => {
    const email = uniqueEmail();
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email, password: 'supersecret1234', name: 'Test User' },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json<{ data: { token: string; user: { id: string; email: string; name: string } } }>();
    expect(body.data.token).toBeTruthy();
    expect(body.data.user.email).toBe(email);
    expect(body.data.user.name).toBe('Test User');
    expect(body.data.user.id).toBeTruthy();
    // Shape assertions
    expect(typeof body.data.token).toBe('string');
    expect(typeof body.data.user.id).toBe('string');
    expect(typeof body.data.user.email).toBe('string');
    expect(typeof body.data.user.name).toBe('string');
  });

  it('response body has no passwordHash', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: uniqueEmail(), password: 'supersecret1234', name: 'No Hash' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json<Record<string, unknown>>();
    const user = (body.data as Record<string, unknown>).user as Record<string, unknown>;
    expect(user['passwordHash']).toBeUndefined();
  });

  it('returns 400 when email is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { password: 'supersecret1234', name: 'No Email' },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json<{ error: string }>();
    expect(typeof body.error).toBe('string');
  });

  it('returns 400 when password is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: uniqueEmail(), name: 'No Password' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when name is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: uniqueEmail(), password: 'supersecret1234' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 on invalid email format', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'not-an-email', password: 'supersecret1234', name: 'Bad Email' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 on password shorter than 12 chars', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: uniqueEmail(), password: 'short', name: 'Short Pass' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 409 on duplicate email', async () => {
    const email = uniqueEmail();
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email, password: 'supersecret1234', name: 'First' },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email, password: 'supersecret1234', name: 'Second' },
    });
    expect(res.statusCode).toBe(409);
    const body = res.json<{ error: string }>();
    expect(body.error).toBe('Email already in use');
  });
});

describe('POST /auth/login', () => {
  let app: FastifyInstance;
  const email = uniqueEmail();
  const password = 'supersecret1234';

  beforeAll(async () => {
    app = await buildTestApp();
    // Register a test user to login with
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email, password, name: 'Login User' },
    });
  });

  it('returns 200 with token and user on valid credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: { token: string; user: { id: string; email: string; name: string } } }>();
    expect(body.data.token).toBeTruthy();
    expect(body.data.user.email).toBe(email);
    expect(body.data.user.name).toBe('Login User');
    // Shape assertions
    expect(typeof body.data.token).toBe('string');
    expect(typeof body.data.user.id).toBe('string');
    expect(typeof body.data.user.email).toBe('string');
    expect(typeof body.data.user.name).toBe('string');
  });

  it('returns 401 with "Invalid credentials" on wrong password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password: 'wrongpassword123' },
    });
    expect(res.statusCode).toBe(401);
    const body = res.json<{ error: string }>();
    expect(body.error).toBe('Invalid credentials');
  });

  it('returns 401 with "Invalid credentials" on unknown email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: uniqueEmail(), password: 'supersecret1234' },
    });
    expect(res.statusCode).toBe(401);
    const body = res.json<{ error: string }>();
    expect(body.error).toBe('Invalid credentials');
  });

  it('returns the same error message for wrong password and unknown email', async () => {
    const res1 = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password: 'wrongpassword123' },
    });
    const res2 = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: uniqueEmail(), password: 'supersecret1234' },
    });
    const b1 = res1.json<{ error: string }>();
    const b2 = res2.json<{ error: string }>();
    expect(b1.error).toBe(b2.error);
  });
});
