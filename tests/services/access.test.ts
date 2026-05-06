// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import 'dotenv/config';
import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { canAccessProject, assertProjectAccess } from '../../src/services/access.js';

function uniqueEmail() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`;
}

async function createTestUser(name: string) {
  return prisma.user.create({
    data: {
      email: uniqueEmail(),
      passwordHash: 'dummy-hash',
      name,
      provider: 'local',
    },
    select: { id: true, email: true, name: true },
  });
}

async function createTestProject(ownerId: string, name: string) {
  return prisma.project.create({
    data: { name, ownerId },
  });
}

describe('canAccessProject', () => {
  let userAId: string;
  let userBId: string;
  let projectId: string;

  beforeAll(async () => {
    const userA = await createTestUser('Access User A');
    const userB = await createTestUser('Access User B');
    userAId = userA.id;
    userBId = userB.id;

    const project = await createTestProject(userAId, 'canAccess Test Project');
    projectId = project.id;
  });

  it('returns true for the project owner', async () => {
    const result = await canAccessProject(userAId, projectId);
    expect(result).toBe(true);
  });

  it("returns false for another user's project", async () => {
    const result = await canAccessProject(userBId, projectId);
    expect(result).toBe(false);
  });

  it('returns false for a non-existent project id', async () => {
    const fakeId = 'clzzzzzzzzzzzzzzzzzzzzzzzz';
    const result = await canAccessProject(userAId, fakeId);
    expect(result).toBe(false);
  });
});

describe('assertProjectAccess', () => {
  let userAId: string;
  let userBId: string;
  let projectId: string;

  beforeAll(async () => {
    const userA = await createTestUser('Assert User A');
    const userB = await createTestUser('Assert User B');
    userAId = userA.id;
    userBId = userB.id;

    const project = await createTestProject(userAId, 'assertProjectAccess Test Project');
    projectId = project.id;
  });

  it('returns the Project object on success', async () => {
    const result = await assertProjectAccess(userAId, projectId);
    expect(result).not.toBeNull();
    expect(result?.id).toBe(projectId);
    expect(result?.ownerId).toBe(userAId);
  });

  it("returns null when a different user tries to access the project", async () => {
    const result = await assertProjectAccess(userBId, projectId);
    expect(result).toBeNull();
  });

  it('creates an AuditEvent with eventType auth.access.denied on failure', async () => {
    const before = new Date();

    // Attempt access by a non-owner
    await assertProjectAccess(userBId, projectId, {
      ip: '127.0.0.1',
      headers: {},
    });

    // Give the fire-and-forget audit a moment to settle
    await new Promise((r) => setTimeout(r, 200));

    const event = await prisma.auditEvent.findFirst({
      where: {
        eventType: 'auth.access.denied',
        actorId: userBId,
        createdAt: { gte: before },
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(event).not.toBeNull();
    expect(event?.eventType).toBe('auth.access.denied');
    expect(event?.actorId).toBe(userBId);
  });
});
