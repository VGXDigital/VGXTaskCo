// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.
// Response shape assertions added in v0.6.7 to catch backend→frontend contract breaks.

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
    payload: { email, password: 'supersecret1234', name: 'Tag Test User' },
  });
  const body = res.json<{ data: { token: string; user: { id: string } } }>();
  return { token: body.data.token, userId: body.data.user.id, email };
}

describe('GET /tags', () => {
  let app: FastifyInstance;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    app = await buildTestApp();
    const userA = await registerAndLogin(app);
    const userB = await registerAndLogin(app);
    tokenA = userA.token;
    tokenB = userB.token;

    // Create a tag for user A
    await app.inject({
      method: 'POST',
      url: '/tags',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { value: 'userA-tag' },
    });
  });

  it('returns 200 empty array for a new user', async () => {
    // Register a brand-new user
    const newUser = await registerAndLogin(app);
    const res = await app.inject({
      method: 'GET',
      url: '/tags',
      headers: { authorization: `Bearer ${newUser.token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: unknown[] }>();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(0);
  });

  it("returns 200 with the user's own tags", async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tags',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: { id: string; value: string; color: string }[] }>();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.some((t) => t.value === 'userA-tag')).toBe(true);
    // Shape assertions on GET /tags list items
    if (body.data.length > 0) {
      const tag = body.data[0];
      expect(typeof tag.id).toBe('string');
      expect(typeof tag.value).toBe('string');
      expect(typeof tag.color).toBe('string');
    }
  });

  it("does not return User A's tags in User B's list", async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tags',
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: { value: string }[] }>();
    expect(body.data.some((t) => t.value === 'userA-tag')).toBe(false);
  });
});

describe('POST /tags', () => {
  let app: FastifyInstance;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    app = await buildTestApp();
    const userA = await registerAndLogin(app);
    const userB = await registerAndLogin(app);
    tokenA = userA.token;
    tokenB = userB.token;
  });

  it('returns 201 and the tag on valid body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tags',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { value: 'client:ICA' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json<{ data: { id: string; value: string; color: string } }>();
    expect(body.data.value).toBe('client:ICA');
    expect(body.data.id).toBeTruthy();
    // Shape assertions
    expect(typeof body.data.id).toBe('string');
    expect(typeof body.data.value).toBe('string');
    expect(typeof body.data.color).toBe('string');
  });

  it('returns 409 on duplicate value for the same user', async () => {
    const value = `dup-${Date.now()}`;
    await app.inject({
      method: 'POST',
      url: '/tags',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { value },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/tags',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { value },
    });
    expect(res.statusCode).toBe(409);
    const body = res.json<{ error: string }>();
    expect(typeof body.error).toBe('string');
  });

  it('allows User A and User B to have the same tag value', async () => {
    const sharedValue = `shared-${Date.now()}`;
    const resA = await app.inject({
      method: 'POST',
      url: '/tags',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { value: sharedValue },
    });
    const resB = await app.inject({
      method: 'POST',
      url: '/tags',
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { value: sharedValue },
    });
    expect(resA.statusCode).toBe(201);
    expect(resB.statusCode).toBe(201);
  });

  it('returns 400 on missing value', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tags',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tags',
      payload: { value: 'no-auth' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('DELETE /tags/:id', () => {
  let app: FastifyInstance;
  let tokenA: string;
  let tokenB: string;
  let tagAId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    const userA = await registerAndLogin(app);
    const userB = await registerAndLogin(app);
    tokenA = userA.token;
    tokenB = userB.token;

    // Create a tag for user A
    const res = await app.inject({
      method: 'POST',
      url: '/tags',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { value: `del-tag-${Date.now()}` },
    });
    tagAId = res.json<{ data: { id: string } }>().data.id;
  });

  it('returns 200 on deleting own tag', async () => {
    // Create a fresh tag to delete
    const createRes = await app.inject({
      method: 'POST',
      url: '/tags',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { value: `to-delete-${Date.now()}` },
    });
    const id = createRes.json<{ data: { id: string } }>().data.id;

    const res = await app.inject({
      method: 'DELETE',
      url: `/tags/${id}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: { deleted: boolean } }>();
    expect(body.data.deleted).toBe(true);
  });

  it("returns 404 when trying to delete another user's tag", async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/tags/${tagAId}`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 on non-existent id (valid cuid format)', async () => {
    // Use a well-formed cuid that doesn't exist
    const fakeCuid = 'clzzzzzzzzzzzzzzzzzzzzzzzz';
    const res = await app.inject({
      method: 'DELETE',
      url: `/tags/${fakeCuid}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('POST /tasks/:taskId/tags (attach)', () => {
  let app: FastifyInstance;
  let tokenA: string;
  let tokenB: string;
  let taskAId: string;
  let tagAId: string;
  let tagBId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    const userA = await registerAndLogin(app);
    const userB = await registerAndLogin(app);
    tokenA = userA.token;
    tokenB = userB.token;

    // Create a project for user A
    const projectRes = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { name: 'Attach Tags Project' },
    });
    const projectId = projectRes.json<{ data: { id: string } }>().data.id;

    // Create a task for user A
    const taskRes = await app.inject({
      method: 'POST',
      url: `/projects/${projectId}/tasks`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { title: 'Attach Tags Task' },
    });
    taskAId = taskRes.json<{ data: { id: string } }>().data.id;

    // Create a tag for user A
    const tagARes = await app.inject({
      method: 'POST',
      url: '/tags',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { value: `attach-tag-a-${Date.now()}` },
    });
    tagAId = tagARes.json<{ data: { id: string } }>().data.id;

    // Create a tag for user B
    const tagBRes = await app.inject({
      method: 'POST',
      url: '/tags',
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { value: `attach-tag-b-${Date.now()}` },
    });
    tagBId = tagBRes.json<{ data: { id: string } }>().data.id;
  });

  it('returns 200 and replaces the tag set with own tags', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/tasks/${taskAId}/tags`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { tagIds: [tagAId] },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: { tags: { id: string }[] } }>();
    expect(body.data.tags.some((t) => t.id === tagAId)).toBe(true);
  });

  it("returns 400 if a tagId belongs to another user", async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/tasks/${taskAId}/tags`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { tagIds: [tagBId] },
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 404 if the task belongs to another user's project", async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/tasks/${taskAId}/tags`,
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { tagIds: [tagBId] },
    });
    expect(res.statusCode).toBe(404);
  });
});
