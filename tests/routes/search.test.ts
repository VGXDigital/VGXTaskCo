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
    payload: { email, password: 'supersecret1234', name: 'Search Test User' },
  });
  const body = res.json<{ data: { token: string } }>();
  return { token: body.data.token, email };
}

describe('GET /search', () => {
  let app: FastifyInstance;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    app = await buildTestApp();
    const userA = await registerAndLogin(app);
    const userB = await registerAndLogin(app);
    tokenA = userA.token;
    tokenB = userB.token;

    // Seed: project with "audit" in name for user A
    const projectRes = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { name: 'audit project', description: 'Security audit scope' },
    });
    const projectId = projectRes.json<{ data: { id: string } }>().data.id;

    // Seed: task with "audit" in title
    const taskTitleRes = await app.inject({
      method: 'POST',
      url: `/projects/${projectId}/tasks`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { title: 'audit trail review' },
    });
    const taskTitleId = taskTitleRes.json<{ data: { id: string } }>().data.id;

    // Seed: task with "audit" in description only
    await app.inject({
      method: 'POST',
      url: `/projects/${projectId}/tasks`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { title: 'Check compliance', description: 'Run an audit on the system' },
    });

    // Seed: comment with "audit" for user A on the title task
    await app.inject({
      method: 'POST',
      url: `/tasks/${taskTitleId}/comments`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { body: 'This is an audit comment' },
    });

    // Seed: user B's "audit" project — must NOT appear in user A's search
    const projectBRes = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { name: 'audit project user B' },
    });
    const projectBId = projectBRes.json<{ data: { id: string } }>().data.id;

    await app.inject({
      method: 'POST',
      url: `/projects/${projectBId}/tasks`,
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { title: 'audit task for user B' },
    });
  });

  it('returns 200 with correct { data: { projects, tasks, comments } } structure', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/search?q=audit',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: { projects: { id: string; name: string }[]; tasks: { id: string; title: string }[]; comments: unknown[] } }>();
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data.projects)).toBe(true);
    expect(Array.isArray(body.data.tasks)).toBe(true);
    expect(Array.isArray(body.data.comments)).toBe(true);
    // Shape assertions on search result items
    if (body.data.projects.length > 0) {
      expect(typeof body.data.projects[0].id).toBe('string');
      expect(typeof body.data.projects[0].name).toBe('string');
    }
    if (body.data.tasks.length > 0) {
      expect(typeof body.data.tasks[0].id).toBe('string');
      expect(typeof body.data.tasks[0].title).toBe('string');
    }
  });

  it('returns project with "audit" in its name', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/search?q=audit',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    const body = res.json<{ data: { projects: { name: string }[] } }>();
    expect(body.data.projects.some((p) => p.name.toLowerCase().includes('audit'))).toBe(true);
  });

  it('returns task with "audit" in its title', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/search?q=audit',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    const body = res.json<{ data: { tasks: { title: string }[] } }>();
    expect(body.data.tasks.some((t) => t.title.toLowerCase().includes('audit'))).toBe(true);
  });

  it('returns task with "audit" in its description', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/search?q=audit',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    const body = res.json<{ data: { tasks: ({ title: string; description?: string })[] } }>();
    const hasDescriptionMatch = body.data.tasks.some(
      (t) => t.description?.toLowerCase().includes('audit'),
    );
    expect(hasDescriptionMatch).toBe(true);
  });

  it("does not return User B's data in User A's search results", async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/search?q=audit',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    const body = res.json<{ data: { projects: { name: string }[]; tasks: { title: string }[] } }>();
    expect(body.data.projects.some((p) => p.name.includes('user B'))).toBe(false);
    expect(body.data.tasks.some((t) => t.title.includes('user B'))).toBe(false);
  });

  it('returns 400 on missing q parameter', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/search',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 on q longer than 200 characters', async () => {
    const longQ = 'a'.repeat(201);
    const res = await app.inject({
      method: 'GET',
      url: `/search?q=${longQ}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 on empty string q=""', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/search?q=',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/search?q=audit',
    });
    expect(res.statusCode).toBe(401);
  });
});
