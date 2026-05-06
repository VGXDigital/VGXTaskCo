// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { describe, it, expect, beforeAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../setup.js';

function uniqueEmail() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`;
}

/**
 * Register a user and return { token, userId }.
 */
async function registerUser(
  app: FastifyInstance,
  email: string,
): Promise<{ token: string; userId: string }> {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email, password: 'supersecret1234', name: 'Test User' },
  });
  const body = res.json<{ data: { token: string; user: { id: string } } }>();
  return { token: body.data.token, userId: body.data.user.id };
}

// ── POST /projects ─────────────────────────────────────────────────────────────

describe('POST /projects', () => {
  let app: FastifyInstance;
  let token: string;

  beforeAll(async () => {
    app = await buildTestApp();
    const user = await registerUser(app, uniqueEmail());
    token = user.token;
  });

  it('returns 201 with project on valid body with auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'My Project', color: '#ff0000' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json<{ data: { id: string; name: string; color: string } }>();
    expect(body.data.id).toBeTruthy();
    expect(body.data.name).toBe('My Project');
    expect(body.data.color).toBe('#ff0000');
  });

  it('returns 201 with default color #3b82f6 when color omitted', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'No Color Project' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json<{ data: { color: string } }>();
    expect(body.data.color).toBe('#3b82f6');
  });

  it('ignores ownerId in body — strict schema rejects unknown fields or ownerId cannot override auth', async () => {
    const email2 = uniqueEmail();
    const user2 = await registerUser(app, email2);

    const res = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Ownership Test', ownerId: user2.userId },
    });

    // The schema is strict — extra fields (ownerId) cause a 400 validation error
    // OR if the route strips them, the project still belongs to the authenticated user
    if (res.statusCode === 201) {
      // If creation succeeded, project must appear in authenticated user's list
      const listRes = await app.inject({
        method: 'GET',
        url: '/projects',
        headers: { authorization: `Bearer ${token}` },
      });
      const listBody = listRes.json<{ data: { name: string }[] }>();
      const names = listBody.data.map((p) => p.name);
      expect(names).toContain('Ownership Test');
    } else {
      // Strict schema correctly rejects unknown field ownerId
      expect(res.statusCode).toBe(400);
    }
  });

  it('returns 400 on missing name', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { authorization: `Bearer ${token}` },
      payload: { color: '#ff0000' },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json<{ error: string }>();
    expect(typeof body.error).toBe('string');
  });

  it('returns 400 on name longer than 100 chars', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'a'.repeat(101) },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 on invalid color hex', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Bad Color', color: 'notacolor' },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json<{ error: string }>();
    expect(body.error).toMatch(/hex/i);
  });

  it('returns 401 without Bearer token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/projects',
      payload: { name: 'No Token' },
    });
    expect(res.statusCode).toBe(401);
  });
});

// ── GET /projects ──────────────────────────────────────────────────────────────

describe('GET /projects', () => {
  let app: FastifyInstance;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    app = await buildTestApp();
    const userA = await registerUser(app, uniqueEmail());
    tokenA = userA.token;
    const userB = await registerUser(app, uniqueEmail());
    tokenB = userB.token;
  });

  it('returns 200 with empty array when user has no projects', async () => {
    // Create a brand new user with no projects
    const freshUser = await registerUser(app, uniqueEmail());
    const res = await app.inject({
      method: 'GET',
      url: '/projects',
      headers: { authorization: `Bearer ${freshUser.token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: unknown[] }>();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(0);
  });

  it('returns only the current user\'s projects — User A and User B see only their own', async () => {
    // User A creates 2 projects
    await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { name: 'User A Project 1' },
    });
    await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { name: 'User A Project 2' },
    });

    // User B creates 1 project
    await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { name: 'User B Project 1' },
    });

    const resA = await app.inject({
      method: 'GET',
      url: '/projects',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    const resB = await app.inject({
      method: 'GET',
      url: '/projects',
      headers: { authorization: `Bearer ${tokenB}` },
    });

    expect(resA.statusCode).toBe(200);
    expect(resB.statusCode).toBe(200);

    const namesA = resA.json<{ data: { name: string }[] }>().data.map((p) => p.name);
    const namesB = resB.json<{ data: { name: string }[] }>().data.map((p) => p.name);

    // A sees their own projects
    expect(namesA).toContain('User A Project 1');
    expect(namesA).toContain('User A Project 2');
    // A does not see B's project
    expect(namesA).not.toContain('User B Project 1');

    // B sees their own project
    expect(namesB).toContain('User B Project 1');
    // B does not see A's projects
    expect(namesB).not.toContain('User A Project 1');
    expect(namesB).not.toContain('User A Project 2');
  });

  it('returns 401 without Bearer token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/projects',
    });
    expect(res.statusCode).toBe(401);
  });
});

// ── GET /projects/:id ──────────────────────────────────────────────────────────

describe('GET /projects/:id', () => {
  let app: FastifyInstance;
  let tokenA: string;
  let tokenB: string;
  let projectId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    const userA = await registerUser(app, uniqueEmail());
    tokenA = userA.token;
    const userB = await registerUser(app, uniqueEmail());
    tokenB = userB.token;

    // User A creates a project
    const createRes = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { name: 'Project For Get' },
    });
    const body = createRes.json<{ data: { id: string } }>();
    projectId = body.data.id;

    // Add a task so _count.tasks > 0
    await app.inject({
      method: 'POST',
      url: `/projects/${projectId}/tasks`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { title: 'A task' },
    });
  });

  it('returns 200 with project including _count.tasks field', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/projects/${projectId}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: { id: string; name: string; _count: { tasks: number } } }>();
    expect(body.data.id).toBe(projectId);
    expect(body.data._count).toBeDefined();
    expect(typeof body.data._count.tasks).toBe('number');
    expect(body.data._count.tasks).toBeGreaterThanOrEqual(1);
  });

  it('returns 404 when project does not exist', async () => {
    const fakeCuid = 'clzzzzzzzzzzzzzzzzzzzzzzz';
    const res = await app.inject({
      method: 'GET',
      url: `/projects/${fakeCuid}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(res.statusCode).toBe(404);
    const body = res.json<{ error: string }>();
    expect(body.error).toBe('Project not found');
  });

  it('returns 404 when project belongs to another user (same message — no existence leak)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/projects/${projectId}`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(res.statusCode).toBe(404);
    const body = res.json<{ error: string }>();
    expect(body.error).toBe('Project not found');
  });

  it('returns 400 on invalid CUID format for :id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/projects/not-a-valid-cuid!!!',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json<{ error: string }>();
    expect(body.error).toBe('Invalid project id');
  });

  it('returns 401 without Bearer token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/projects/${projectId}`,
    });
    expect(res.statusCode).toBe(401);
  });
});

// ── PATCH /projects/:id ────────────────────────────────────────────────────────

describe('PATCH /projects/:id', () => {
  let app: FastifyInstance;
  let tokenA: string;
  let tokenB: string;
  let projectId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    const userA = await registerUser(app, uniqueEmail());
    tokenA = userA.token;
    const userB = await registerUser(app, uniqueEmail());
    tokenB = userB.token;

    const createRes = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { name: 'Patchable Project', color: '#aabbcc' },
    });
    const body = createRes.json<{ data: { id: string } }>();
    projectId = body.data.id;
  });

  it('returns 200 with updated fields', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/projects/${projectId}`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { name: 'Updated Name', color: '#112233' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: { name: string; color: string } }>();
    expect(body.data.name).toBe('Updated Name');
    expect(body.data.color).toBe('#112233');
  });

  it('returns 200 on partial update — only name, color unchanged', async () => {
    // Set a known color first
    await app.inject({
      method: 'PATCH',
      url: `/projects/${projectId}`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { color: '#abcdef' },
    });

    const res = await app.inject({
      method: 'PATCH',
      url: `/projects/${projectId}`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { name: 'Only Name Changed' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: { name: string; color: string } }>();
    expect(body.data.name).toBe('Only Name Changed');
    expect(body.data.color).toBe('#abcdef');
  });

  it('returns 400 on empty body', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/projects/${projectId}`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    const body = res.json<{ error: string }>();
    expect(typeof body.error).toBe('string');
  });

  it('returns 400 on invalid color', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/projects/${projectId}`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { color: 'not-hex' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 on another user\'s project', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/projects/${projectId}`,
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { name: 'Stolen Name' },
    });
    expect(res.statusCode).toBe(404);
    const body = res.json<{ error: string }>();
    expect(body.error).toBe('Project not found');
  });

  it('returns 401 without Bearer token', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/projects/${projectId}`,
      payload: { name: 'No Auth' },
    });
    expect(res.statusCode).toBe(401);
  });
});

// ── DELETE /projects/:id ───────────────────────────────────────────────────────

describe('DELETE /projects/:id', () => {
  let app: FastifyInstance;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    app = await buildTestApp();
    const userA = await registerUser(app, uniqueEmail());
    tokenA = userA.token;
    const userB = await registerUser(app, uniqueEmail());
    tokenB = userB.token;
  });

  it('returns 200 { deleted: true } on own project', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { name: 'Delete Me' },
    });
    const { data: { id } } = createRes.json<{ data: { id: string } }>();

    const res = await app.inject({
      method: 'DELETE',
      url: `/projects/${id}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: { deleted: boolean } }>();
    expect(body.data.deleted).toBe(true);
  });

  it('subsequent GET returns 404 after delete', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { name: 'Gone Project' },
    });
    const { data: { id } } = createRes.json<{ data: { id: string } }>();

    await app.inject({
      method: 'DELETE',
      url: `/projects/${id}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });

    const getRes = await app.inject({
      method: 'GET',
      url: `/projects/${id}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(getRes.statusCode).toBe(404);
  });

  it('returns 404 on another user\'s project', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { name: 'Cannot Delete' },
    });
    const { data: { id } } = createRes.json<{ data: { id: string } }>();

    const res = await app.inject({
      method: 'DELETE',
      url: `/projects/${id}`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(res.statusCode).toBe(404);
    const body = res.json<{ error: string }>();
    expect(body.error).toBe('Project not found');
  });

  it('returns 401 without Bearer token', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { name: 'Auth Guard Project' },
    });
    const { data: { id } } = createRes.json<{ data: { id: string } }>();

    const res = await app.inject({
      method: 'DELETE',
      url: `/projects/${id}`,
    });
    expect(res.statusCode).toBe(401);
  });
});
