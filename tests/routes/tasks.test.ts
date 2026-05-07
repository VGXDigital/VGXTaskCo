// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.
// Response shape assertions added in v0.6.7 to catch backend→frontend contract breaks.
// v0.6.9: GET /tasks/:id, cross-project GET /tasks, CORS preflight for PATCH.

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

/**
 * Create a project and return its id.
 */
async function createProject(app: FastifyInstance, token: string, name: string): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/projects',
    headers: { authorization: `Bearer ${token}` },
    payload: { name },
  });
  const body = res.json<{ data: { id: string } }>();
  return body.data.id;
}

/**
 * Create a task and return its id.
 */
async function createTask(
  app: FastifyInstance,
  token: string,
  projectId: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: `/projects/${projectId}/tasks`,
    headers: { authorization: `Bearer ${token}` },
    payload,
  });
  const body = res.json<{ data: { id: string } }>();
  return body.data.id;
}

// ── POST /projects/:id/tasks ───────────────────────────────────────────────────

describe('POST /projects/:id/tasks', () => {
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
    projectId = await createProject(app, tokenA, 'Task Creation Project');
  });

  it('returns 201 with status TODO and priority MEDIUM by default', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/projects/${projectId}/tasks`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { title: 'Default Task' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json<{ data: { id: string; title: string; status: string; priority: string; projectId: string } }>();
    expect(body.data.id).toBeTruthy();
    expect(body.data.status).toBe('TODO');
    expect(body.data.priority).toBe('MEDIUM');
    // Shape assertions
    expect(typeof body.data.id).toBe('string');
    expect(typeof body.data.title).toBe('string');
    expect(typeof body.data.status).toBe('string');
    expect(typeof body.data.projectId).toBe('string');
  });

  it('returns 201 with explicit status IN_PROGRESS and priority HIGH', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/projects/${projectId}/tasks`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { title: 'Explicit Task', status: 'IN_PROGRESS', priority: 'HIGH' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json<{ data: { status: string; priority: string } }>();
    expect(body.data.status).toBe('IN_PROGRESS');
    expect(body.data.priority).toBe('HIGH');
  });

  it('returns 201 with dueDate stored correctly', async () => {
    const dueDate = '2026-12-31T00:00:00.000Z';
    const res = await app.inject({
      method: 'POST',
      url: `/projects/${projectId}/tasks`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { title: 'Due Date Task', dueDate },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json<{ data: { dueDate: string } }>();
    expect(new Date(body.data.dueDate).toISOString()).toBe(dueDate);
  });

  it('returns 400 on invalid status enum', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/projects/${projectId}/tasks`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { title: 'Bad Status', status: 'INVALID' },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json<{ error: string }>();
    expect(typeof body.error).toBe('string');
  });

  it('returns 400 on title longer than 200 chars', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/projects/${projectId}/tasks`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { title: 'a'.repeat(201) },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 on project not owned by authenticated user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/projects/${projectId}/tasks`,
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { title: 'Unauthorised Task' },
    });
    expect(res.statusCode).toBe(404);
    const body = res.json<{ error: string }>();
    expect(body.error).toBe('Project not found');
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/projects/${projectId}/tasks`,
      payload: { title: 'No Auth Task' },
    });
    expect(res.statusCode).toBe(401);
  });
});

// ── GET /projects/:id/tasks ────────────────────────────────────────────────────

describe('GET /projects/:id/tasks', () => {
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
    projectId = await createProject(app, tokenA, 'Listing Project');

    // Seed tasks for filter tests
    await createTask(app, tokenA, projectId, { title: 'TODO Low', status: 'TODO', priority: 'LOW' });
    await createTask(app, tokenA, projectId, { title: 'TODO High', status: 'TODO', priority: 'HIGH' });
    await createTask(app, tokenA, projectId, { title: 'DONE Medium', status: 'DONE', priority: 'MEDIUM' });
    await createTask(app, tokenA, projectId, {
      title: 'IN_PROGRESS High',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
    });
  });

  it('returns 200 with empty array for a new project', async () => {
    const emptyProjectId = await createProject(app, tokenA, 'Empty Project');
    const res = await app.inject({
      method: 'GET',
      url: `/projects/${emptyProjectId}/tasks`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: unknown[] }>();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(0);
  });

  it('returns 200 with all tasks (no filter)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/projects/${projectId}/tasks`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: { id: string; title: string; status: string; priority: string; projectId: string }[] }>();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(4);
    // Shape assertions on list items
    if (body.data.length > 0) {
      const task = body.data[0];
      expect(typeof task.id).toBe('string');
      expect(typeof task.title).toBe('string');
      expect(typeof task.status).toBe('string');
      expect(typeof task.priority).toBe('string');
      expect(typeof task.projectId).toBe('string');
    }
  });

  it('?status=TODO returns only TODO tasks', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/projects/${projectId}/tasks?status=TODO`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: { status: string }[] }>();
    expect(body.data.length).toBeGreaterThan(0);
    for (const task of body.data) {
      expect(task.status).toBe('TODO');
    }
  });

  it('?priority=HIGH returns only HIGH priority tasks', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/projects/${projectId}/tasks?priority=HIGH`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: { priority: string }[] }>();
    expect(body.data.length).toBeGreaterThan(0);
    for (const task of body.data) {
      expect(task.priority).toBe('HIGH');
    }
  });

  it('?status=TODO&priority=HIGH returns intersection', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/projects/${projectId}/tasks?status=TODO&priority=HIGH`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: { status: string; priority: string }[] }>();
    expect(body.data.length).toBeGreaterThan(0);
    for (const task of body.data) {
      expect(task.status).toBe('TODO');
      expect(task.priority).toBe('HIGH');
    }
  });

  it('?status=INVALID returns 400', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/projects/${projectId}/tasks?status=INVALID`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(res.statusCode).toBe(400);
  });

  it('default GET (no includeArchived param) excludes archived tasks', async () => {
    const taskId = await createTask(app, tokenA, projectId, { title: 'Will Be Archived For List' });

    const archiveRes = await app.inject({
      method: 'POST',
      url: '/tasks/bulk/archive',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { ids: [taskId] },
    });
    expect(archiveRes.statusCode).toBe(200);

    // No includeArchived param → defaults to false → archived tasks excluded
    const res = await app.inject({
      method: 'GET',
      url: `/projects/${projectId}/tasks`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: { id: string }[] }>();
    expect(body.data.find((t) => t.id === taskId)).toBeUndefined();
  });

  it('?includeArchived=true includes archived tasks', async () => {
    const taskId = await createTask(app, tokenA, projectId, { title: 'Archived Include Test' });

    await app.inject({
      method: 'POST',
      url: '/tasks/bulk/archive',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { ids: [taskId] },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/projects/${projectId}/tasks?includeArchived=true`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: { id: string; archivedAt: string | null }[] }>();
    const found = body.data.find((t) => t.id === taskId);
    expect(found).toBeDefined();
    expect(found!.archivedAt).not.toBeNull();
  });

  it('returns 404 on another user\'s project', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/projects/${projectId}/tasks`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(res.statusCode).toBe(404);
    const body = res.json<{ error: string }>();
    expect(body.error).toBe('Project not found');
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/projects/${projectId}/tasks`,
    });
    expect(res.statusCode).toBe(401);
  });
});

// ── PATCH /tasks/:id ───────────────────────────────────────────────────────────

describe('PATCH /tasks/:id', () => {
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
    projectId = await createProject(app, tokenA, 'Patch Task Project');
  });

  it('returns 200 and updates title', async () => {
    const taskId = await createTask(app, tokenA, projectId, { title: 'Original Title' });
    const res = await app.inject({
      method: 'PATCH',
      url: `/tasks/${taskId}`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { title: 'Updated Title' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: { title: string } }>();
    expect(body.data.title).toBe('Updated Title');
  });

  it('returns 200 and clears dueDate when dueDate is null', async () => {
    const taskId = await createTask(app, tokenA, projectId, {
      title: 'Has Due Date',
      dueDate: '2026-12-31T00:00:00.000Z',
    });

    const res = await app.inject({
      method: 'PATCH',
      url: `/tasks/${taskId}`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { dueDate: null },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: { dueDate: string | null } }>();
    expect(body.data.dueDate).toBeNull();
  });

  it('returns 200 and changes status to DONE', async () => {
    const taskId = await createTask(app, tokenA, projectId, { title: 'Will Be Done' });
    const res = await app.inject({
      method: 'PATCH',
      url: `/tasks/${taskId}`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { status: 'DONE' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: { status: string } }>();
    expect(body.data.status).toBe('DONE');
  });

  it('returns 400 on empty body', async () => {
    const taskId = await createTask(app, tokenA, projectId, { title: 'Empty Patch Task' });
    const res = await app.inject({
      method: 'PATCH',
      url: `/tasks/${taskId}`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    const body = res.json<{ error: string }>();
    expect(typeof body.error).toBe('string');
  });

  it('returns 400 on invalid status enum', async () => {
    const taskId = await createTask(app, tokenA, projectId, { title: 'Bad Status Patch' });
    const res = await app.inject({
      method: 'PATCH',
      url: `/tasks/${taskId}`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { status: 'NOT_A_STATUS' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 on task in another user\'s project', async () => {
    const taskId = await createTask(app, tokenA, projectId, { title: 'Protected Task' });
    const res = await app.inject({
      method: 'PATCH',
      url: `/tasks/${taskId}`,
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { title: 'Stolen Title' },
    });
    expect(res.statusCode).toBe(404);
    const body = res.json<{ error: string }>();
    expect(body.error).toBe('Task not found');
  });

  it('returns 401 without token', async () => {
    const taskId = await createTask(app, tokenA, projectId, { title: 'Unauthed Patch Task' });
    const res = await app.inject({
      method: 'PATCH',
      url: `/tasks/${taskId}`,
      payload: { title: 'No Auth' },
    });
    expect(res.statusCode).toBe(401);
  });
});

// ── DELETE /tasks/:id ──────────────────────────────────────────────────────────

describe('DELETE /tasks/:id', () => {
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
    projectId = await createProject(app, tokenA, 'Delete Task Project');
  });

  it('returns 200 with { id } on own task', async () => {
    const taskId = await createTask(app, tokenA, projectId, { title: 'Delete Me' });
    const res = await app.inject({
      method: 'DELETE',
      url: `/tasks/${taskId}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: { id: string } }>();
    expect(body.data.id).toBe(taskId);
  });

  it('subsequent GET on parent project tasks returns task gone', async () => {
    const taskId = await createTask(app, tokenA, projectId, { title: 'Gone Task' });

    await app.inject({
      method: 'DELETE',
      url: `/tasks/${taskId}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });

    const listRes = await app.inject({
      method: 'GET',
      url: `/projects/${projectId}/tasks?includeArchived=true`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    const body = listRes.json<{ data: { id: string }[] }>();
    expect(body.data.find((t) => t.id === taskId)).toBeUndefined();
  });

  it('returns 404 on another user\'s task', async () => {
    const taskId = await createTask(app, tokenA, projectId, { title: 'Cannot Delete' });
    const res = await app.inject({
      method: 'DELETE',
      url: `/tasks/${taskId}`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(res.statusCode).toBe(404);
    const body = res.json<{ error: string }>();
    expect(body.error).toBe('Task not found');
  });

  it('returns 401 without token', async () => {
    const taskId = await createTask(app, tokenA, projectId, { title: 'Unauthed Delete' });
    const res = await app.inject({
      method: 'DELETE',
      url: `/tasks/${taskId}`,
    });
    expect(res.statusCode).toBe(401);
  });
});

// ── POST /tasks/bulk/status ────────────────────────────────────────────────────

describe('POST /tasks/bulk/status', () => {
  let app: FastifyInstance;
  let tokenA: string;
  let tokenB: string;
  let projectIdA: string;
  let projectIdB: string;

  beforeAll(async () => {
    app = await buildTestApp();
    const userA = await registerUser(app, uniqueEmail());
    tokenA = userA.token;
    const userB = await registerUser(app, uniqueEmail());
    tokenB = userB.token;
    projectIdA = await createProject(app, tokenA, 'Bulk Status Project A');
    projectIdB = await createProject(app, tokenB, 'Bulk Status Project B');
  });

  it('returns 200 { updated: N } on owned tasks', async () => {
    const id1 = await createTask(app, tokenA, projectIdA, { title: 'Bulk 1' });
    const id2 = await createTask(app, tokenA, projectIdA, { title: 'Bulk 2' });

    const res = await app.inject({
      method: 'POST',
      url: '/tasks/bulk/status',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { ids: [id1, id2], status: 'DONE' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: { updated: number } }>();
    expect(body.data.updated).toBe(2);
  });

  it('returns 403 with unauthorizedIds if any task not owned — owned task status unchanged', async () => {
    const ownedId = await createTask(app, tokenA, projectIdA, { title: 'Mine' });
    const otherId = await createTask(app, tokenB, projectIdB, { title: 'Not Mine' });

    const res = await app.inject({
      method: 'POST',
      url: '/tasks/bulk/status',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { ids: [ownedId, otherId], status: 'DONE' },
    });
    expect(res.statusCode).toBe(403);
    const body = res.json<{ error: string; unauthorizedIds: string[] }>();
    expect(body.error).toBe('Unauthorized');
    expect(body.unauthorizedIds).toContain(otherId);

    // Owned task must still be TODO (no changes applied)
    const listRes = await app.inject({
      method: 'GET',
      url: `/projects/${projectIdA}/tasks`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    const listBody = listRes.json<{ data: { id: string; status: string }[] }>();
    const task = listBody.data.find((t) => t.id === ownedId);
    expect(task?.status).toBe('TODO');
  });

  it('returns 400 on empty ids array', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tasks/bulk/status',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { ids: [], status: 'DONE' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 on ids array > 500', async () => {
    // Generate 501 fake strings — they don't need to be valid CUIDs for the size check
    const fakeIds = Array.from({ length: 501 }, () => 'notacuid');
    const res = await app.inject({
      method: 'POST',
      url: '/tasks/bulk/status',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { ids: fakeIds, status: 'DONE' },
    });
    expect(res.statusCode).toBe(400);
  });
});

// ── POST /tasks/bulk/archive + /tasks/bulk/unarchive ──────────────────────────

describe('POST /tasks/bulk/archive and /tasks/bulk/unarchive', () => {
  let app: FastifyInstance;
  let tokenA: string;
  let projectId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    const userA = await registerUser(app, uniqueEmail());
    tokenA = userA.token;
    projectId = await createProject(app, tokenA, 'Archive Project');
  });

  it('archive sets archivedAt and task is excluded from default GET', async () => {
    const taskId = await createTask(app, tokenA, projectId, { title: 'Archive Me' });

    const archiveRes = await app.inject({
      method: 'POST',
      url: '/tasks/bulk/archive',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { ids: [taskId] },
    });
    expect(archiveRes.statusCode).toBe(200);
    const archiveBody = archiveRes.json<{ data: { updated: number } }>();
    expect(archiveBody.data.updated).toBe(1);

    // Default GET (includeArchived=false) must exclude it
    const listRes = await app.inject({
      method: 'GET',
      url: `/projects/${projectId}/tasks`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    const listBody = listRes.json<{ data: { id: string }[] }>();
    expect(listBody.data.find((t) => t.id === taskId)).toBeUndefined();

    // includeArchived=true finds it with archivedAt set
    const fullRes = await app.inject({
      method: 'GET',
      url: `/projects/${projectId}/tasks?includeArchived=true`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    const fullBody = fullRes.json<{ data: { id: string; archivedAt: string | null }[] }>();
    const archived = fullBody.data.find((t) => t.id === taskId);
    expect(archived).toBeDefined();
    expect(archived!.archivedAt).not.toBeNull();
  });

  it('unarchive clears archivedAt and task appears in default GET again', async () => {
    const taskId = await createTask(app, tokenA, projectId, { title: 'Unarchive Me' });

    // Archive first
    await app.inject({
      method: 'POST',
      url: '/tasks/bulk/archive',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { ids: [taskId] },
    });

    // Then unarchive
    const unarchiveRes = await app.inject({
      method: 'POST',
      url: '/tasks/bulk/unarchive',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { ids: [taskId] },
    });
    expect(unarchiveRes.statusCode).toBe(200);
    const unarchiveBody = unarchiveRes.json<{ data: { updated: number } }>();
    expect(unarchiveBody.data.updated).toBe(1);

    // Default GET now includes it with null archivedAt
    const listRes = await app.inject({
      method: 'GET',
      url: `/projects/${projectId}/tasks`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    const listBody = listRes.json<{ data: { id: string; archivedAt: string | null }[] }>();
    const found = listBody.data.find((t) => t.id === taskId);
    expect(found).toBeDefined();
    expect(found!.archivedAt).toBeNull();
  });
});

// ── POST /tasks/bulk/delete ────────────────────────────────────────────────────

describe('POST /tasks/bulk/delete', () => {
  let app: FastifyInstance;
  let tokenA: string;
  let tokenB: string;
  let projectIdA: string;
  let projectIdB: string;

  beforeAll(async () => {
    app = await buildTestApp();
    const userA = await registerUser(app, uniqueEmail());
    tokenA = userA.token;
    const userB = await registerUser(app, uniqueEmail());
    tokenB = userB.token;
    projectIdA = await createProject(app, tokenA, 'Bulk Delete Project A');
    projectIdB = await createProject(app, tokenB, 'Bulk Delete Project B');
  });

  it('returns 200 on owned tasks and tasks are gone from DB', async () => {
    const id1 = await createTask(app, tokenA, projectIdA, { title: 'Bulk Delete 1' });
    const id2 = await createTask(app, tokenA, projectIdA, { title: 'Bulk Delete 2' });

    const res = await app.inject({
      method: 'POST',
      url: '/tasks/bulk/delete',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { ids: [id1, id2] },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: { deleted: number } }>();
    expect(body.data.deleted).toBe(2);

    // Verify both tasks are gone
    const listRes = await app.inject({
      method: 'GET',
      url: `/projects/${projectIdA}/tasks?includeArchived=true`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    const listBody = listRes.json<{ data: { id: string }[] }>();
    expect(listBody.data.find((t) => t.id === id1)).toBeUndefined();
    expect(listBody.data.find((t) => t.id === id2)).toBeUndefined();
  });

  it('returns 403 with unauthorizedIds on partial ownership — all tasks still in DB', async () => {
    const ownedId = await createTask(app, tokenA, projectIdA, { title: 'Mine BD' });
    const otherId = await createTask(app, tokenB, projectIdB, { title: 'Not Mine BD' });

    const res = await app.inject({
      method: 'POST',
      url: '/tasks/bulk/delete',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { ids: [ownedId, otherId] },
    });
    expect(res.statusCode).toBe(403);
    const body = res.json<{ error: string; unauthorizedIds: string[] }>();
    expect(body.error).toBe('Unauthorized');
    expect(body.unauthorizedIds).toContain(otherId);

    // Both tasks must still exist
    const listResA = await app.inject({
      method: 'GET',
      url: `/projects/${projectIdA}/tasks?includeArchived=true`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    const listBodyA = listResA.json<{ data: { id: string }[] }>();
    expect(listBodyA.data.find((t) => t.id === ownedId)).toBeDefined();

    const listResB = await app.inject({
      method: 'GET',
      url: `/projects/${projectIdB}/tasks?includeArchived=true`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    const listBodyB = listResB.json<{ data: { id: string }[] }>();
    expect(listBodyB.data.find((t) => t.id === otherId)).toBeDefined();
  });
});

// ── GET /tasks/:id ─────────────────────────────────────────────────────────────

describe('GET /tasks/:id', () => {
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
    projectId = await createProject(app, tokenA, 'Get Single Task Project');
  });

  it('returns 200 with full task shape', async () => {
    const taskId = await createTask(app, tokenA, projectId, {
      title: 'Single Task',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
    });

    const res = await app.inject({
      method: 'GET',
      url: `/tasks/${taskId}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: { id: string; title: string; status: string; priority: string; projectId: string } }>();
    expect(typeof body.data.id).toBe('string');
    expect(body.data.id).toBe(taskId);
    expect(typeof body.data.title).toBe('string');
    expect(body.data.title).toBe('Single Task');
    expect(body.data.status).toBe('IN_PROGRESS');
    expect(body.data.priority).toBe('HIGH');
    expect(typeof body.data.projectId).toBe('string');
    expect(body.data.projectId).toBe(projectId);
  });

  it('returns 404 for non-existent task id', async () => {
    // A well-formed CUID that doesn't exist in the DB
    const fakeId = 'claaaaaaaaaaaaaaaaaaaaaaa';
    const res = await app.inject({
      method: 'GET',
      url: `/tasks/${fakeId}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(res.statusCode).toBe(404);
    const body = res.json<{ error: string }>();
    expect(typeof body.error).toBe('string');
  });

  it('returns 401 without auth token', async () => {
    const taskId = await createTask(app, tokenA, projectId, { title: 'Unauthed Get Task' });
    const res = await app.inject({
      method: 'GET',
      url: `/tasks/${taskId}`,
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 or 404 when task belongs to another user\'s project', async () => {
    const taskId = await createTask(app, tokenA, projectId, { title: 'Protected Get Task' });
    const res = await app.inject({
      method: 'GET',
      url: `/tasks/${taskId}`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    // service returns null for unauthorized access → 404
    expect(res.statusCode).toBe(404);
    const body = res.json<{ error: string }>();
    expect(typeof body.error).toBe('string');
  });
});

// ── GET /tasks?projectIds=id1,id2 (cross-project) ──────────────────────────────

describe('GET /tasks?projectIds (cross-project)', () => {
  let app: FastifyInstance;
  let tokenA: string;
  let tokenB: string;
  let projectId1: string;
  let projectId2: string;
  let projectIdB: string;

  beforeAll(async () => {
    app = await buildTestApp();
    const userA = await registerUser(app, uniqueEmail());
    tokenA = userA.token;
    const userB = await registerUser(app, uniqueEmail());
    tokenB = userB.token;
    projectId1 = await createProject(app, tokenA, 'Cross Project 1');
    projectId2 = await createProject(app, tokenA, 'Cross Project 2');
    projectIdB = await createProject(app, tokenB, 'User B Project Cross');

    await createTask(app, tokenA, projectId1, { title: 'P1 Task Alpha', status: 'TODO', priority: 'LOW' });
    await createTask(app, tokenA, projectId1, { title: 'P1 Task Beta', status: 'DONE', priority: 'HIGH' });
    await createTask(app, tokenA, projectId2, { title: 'P2 Task Gamma', status: 'TODO', priority: 'MEDIUM' });
  });

  it('returns 200 with tasks from multiple owned projects', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/tasks?projectIds=${projectId1},${projectId2}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: { id: string; projectId: string }[] }>();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(3);
    const projectIds = new Set(body.data.map((t) => t.projectId));
    expect(projectIds.has(projectId1)).toBe(true);
    expect(projectIds.has(projectId2)).toBe(true);
    // Shape assertions
    if (body.data.length > 0) {
      const task = body.data[0];
      expect(typeof task.id).toBe('string');
      expect(typeof task.projectId).toBe('string');
    }
  });

  it('filters by projectIds correctly — only returns tasks from those projects', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/tasks?projectIds=${projectId1}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: { projectId: string }[] }>();
    for (const task of body.data) {
      expect(task.projectId).toBe(projectId1);
    }
  });

  it('returns 404 if any projectId belongs to another user', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/tasks?projectIds=${projectId1},${projectIdB}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    // listTasksForProjects returns null when ownership check fails → 404
    expect(res.statusCode).toBe(404);
    const body = res.json<{ error: string }>();
    expect(typeof body.error).toBe('string');
  });

  it('returns 200 with empty array if project has no tasks matching filter', async () => {
    const emptyProject = await createProject(app, tokenA, 'Empty Cross Project');
    const res = await app.inject({
      method: 'GET',
      url: `/tasks?projectIds=${emptyProject}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: unknown[] }>();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(0);
  });

  it('returns 401 without auth token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/tasks?projectIds=${projectId1}`,
    });
    expect(res.statusCode).toBe(401);
  });
});

// ── CORS — OPTIONS preflight for PATCH /tasks/:id ──────────────────────────────

describe('CORS OPTIONS preflight for PATCH /tasks/:id', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  it('returns 204 and Access-Control-Allow-Methods includes PATCH', async () => {
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/tasks/claaaaaaaaaaaaaaaaaaaaaaa',
      headers: {
        origin: 'http://localhost:5173',
        'access-control-request-method': 'PATCH',
        'access-control-request-headers': 'authorization, content-type',
      },
    });
    expect(res.statusCode).toBe(204);
    const allowMethods = res.headers['access-control-allow-methods'];
    expect(typeof allowMethods).toBe('string');
    expect((allowMethods as string).toUpperCase()).toContain('PATCH');
  });
});
