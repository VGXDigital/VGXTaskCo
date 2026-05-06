// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

/**
 * src/services/projects.ts
 *
 * Business logic layer for projects. Routes call these functions and map the
 * results to HTTP responses — no direct Prisma access in routes.
 */

import type { Project } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { recordActivity } from './activity.js';
import { recordAuditEvent } from './audit.js';
import { assertProjectAccess } from './access.js';

export interface CreateProjectInput {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  color?: string;
}

export interface RequestContext {
  ip: string;
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Returns all projects owned by userId, newest first.
 */
export async function listProjects(userId: string): Promise<Project[]> {
  return prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Creates a new project for userId and fires activity + audit events.
 */
export async function createProject(
  userId: string,
  input: CreateProjectInput,
  request?: RequestContext,
): Promise<Project> {
  const { name, description, color } = input;

  const project = await prisma.project.create({
    data: { name, description, color, ownerId: userId },
  });

  void recordActivity({
    actorId: userId,
    action: 'project.created',
    subjectType: 'project',
    subjectId: project.id,
    projectId: project.id,
    metadata: { name: project.name },
  });

  void recordAuditEvent({
    eventType: 'project.created',
    actorId: userId,
    request,
    metadata: { projectId: project.id, name: project.name },
  });

  return project;
}

/**
 * Returns a single project with task count, or null if not found / not owned.
 */
export async function getProject(
  userId: string,
  projectId: string,
): Promise<(Project & { _count: { tasks: number } }) | null> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: userId },
    include: { _count: { select: { tasks: true } } },
  });
  return project;
}

/**
 * Partially updates a project after verifying ownership via assertProjectAccess.
 * Returns the updated project, or null if not found / not owned.
 */
export async function updateProject(
  userId: string,
  projectId: string,
  input: UpdateProjectInput,
  request?: RequestContext,
): Promise<Project | null> {
  const existing = await assertProjectAccess(userId, projectId, request);
  if (!existing) return null;

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: input,
  });

  void recordActivity({
    actorId: userId,
    action: 'project.updated',
    subjectType: 'project',
    subjectId: updated.id,
    projectId: updated.id,
    metadata: input as Record<string, unknown>,
  });

  void recordAuditEvent({
    eventType: 'project.updated',
    actorId: userId,
    request,
    metadata: { projectId: updated.id, changes: input as Record<string, unknown> },
  });

  return updated;
}

/**
 * Deletes a project after verifying ownership. Returns true on success, false if not found / not owned.
 */
export async function deleteProject(
  userId: string,
  projectId: string,
  request?: RequestContext,
): Promise<boolean> {
  const existing = await assertProjectAccess(userId, projectId, request);
  if (!existing) return false;

  await prisma.project.delete({ where: { id: projectId } });

  void recordAuditEvent({
    eventType: 'project.deleted',
    actorId: userId,
    request,
    metadata: { projectId, name: existing.name },
  });

  return true;
}
