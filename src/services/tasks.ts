// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

/**
 * src/services/tasks.ts
 *
 * Business logic layer for tasks. Routes call these functions and map results
 * to HTTP responses — no direct Prisma access in routes.
 */

import type { Task } from '@prisma/client';
import { TaskStatus, type Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { recordActivity } from './activity.js';
import { recordAuditEvent } from './audit.js';
import { dispatchWebhook } from './webhooks.js';
import { assertProjectAccess } from './access.js';
import type { RequestContext } from '../lib/types.js';

export type { RequestContext };

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: import('@prisma/client').Priority;
  dueDate?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: import('@prisma/client').Priority;
  dueDate?: string | null;
  archivedAt?: string | null;
}

export interface TaskFilter {
  status?: TaskStatus;
  priority?: import('@prisma/client').Priority;
  dueWithin?: 'today' | 'thisWeek' | 'overdue' | 'doneInLast7Days';
  search?: string;
  includeArchived?: boolean;
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

function utcDayBounds(offsetDays = 0): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays, 0, 0, 0, 0),
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays, 23, 59, 59, 999),
  );
  return { start, end };
}

async function resolveTaskOwnership(ids: string[], userId: string) {
  const tasks = await prisma.task.findMany({
    where: { id: { in: ids } },
    select: { id: true, projectId: true, status: true, project: { select: { ownerId: true } } },
  });

  const foundIds = new Set(tasks.map((t) => t.id));
  const missingIds = ids.filter((id) => !foundIds.has(id));
  const unauthorizedIds = [
    ...missingIds,
    ...tasks.filter((t) => t.project.ownerId !== userId).map((t) => t.id),
  ];

  return { tasks, unauthorizedIds };
}

// ── Service functions ─────────────────────────────────────────────────────────

/**
 * Lists tasks for a project. Returns null if the project is not owned by userId.
 */
export async function listTasks(
  userId: string,
  projectId: string,
  filter: TaskFilter,
): Promise<Task[] | null> {
  const project = await assertProjectAccess(userId, projectId);
  if (!project) return null;

  const { status, priority, dueWithin, search, includeArchived } = filter;

  const where: Prisma.TaskWhereInput = { projectId };

  if (!includeArchived) {
    where.archivedAt = null;
  }

  if (status) where.status = status;
  if (priority) where.priority = priority;

  if (dueWithin) {
    const today = utcDayBounds(0);
    const now = new Date();
    switch (dueWithin) {
      case 'today':
        where.dueDate = { gte: today.start, lte: today.end };
        break;
      case 'thisWeek':
        where.dueDate = { gte: today.start, lte: utcDayBounds(7).end };
        break;
      case 'overdue':
        where.dueDate = { lt: today.start };
        where.status = { not: TaskStatus.DONE };
        break;
      case 'doneInLast7Days': {
        const sevenAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        where.status = TaskStatus.DONE;
        where.updatedAt = { gte: sevenAgo };
        break;
      }
    }
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  return prisma.task.findMany({
    where,
    orderBy: [
      { dueDate: { sort: 'asc', nulls: 'last' } },
      { createdAt: 'desc' },
    ],
  });
}

/**
 * Lists tasks across multiple projects in a single query.
 * Validates that the caller owns all specified projects before querying.
 * Returns null if any project is not owned by userId.
 */
export async function listTasksForProjects(
  userId: string,
  projectIds: string[],
  filter: TaskFilter,
): Promise<Task[] | null> {
  // Verify ownership of all requested projects in one query
  const ownedProjects = await prisma.project.findMany({
    where: { id: { in: projectIds }, ownerId: userId },
    select: { id: true },
  });

  if (ownedProjects.length !== projectIds.length) return null;

  const { status, priority, dueWithin, search, includeArchived } = filter;

  const where: Prisma.TaskWhereInput = { projectId: { in: projectIds } };

  if (!includeArchived) {
    where.archivedAt = null;
  }

  if (status) where.status = status;
  if (priority) where.priority = priority;

  if (dueWithin) {
    const today = utcDayBounds(0);
    const now = new Date();
    switch (dueWithin) {
      case 'today':
        where.dueDate = { gte: today.start, lte: today.end };
        break;
      case 'thisWeek':
        where.dueDate = { gte: today.start, lte: utcDayBounds(7).end };
        break;
      case 'overdue':
        where.dueDate = { lt: today.start };
        where.status = { not: TaskStatus.DONE };
        break;
      case 'doneInLast7Days': {
        const sevenAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        where.status = TaskStatus.DONE;
        where.updatedAt = { gte: sevenAgo };
        break;
      }
    }
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  return prisma.task.findMany({
    where,
    orderBy: [
      { dueDate: { sort: 'asc', nulls: 'last' } },
      { createdAt: 'desc' },
    ],
  });
}

/**
 * Creates a task under a project. Returns null if the project is not owned by userId.
 */
export async function createTask(
  userId: string,
  projectId: string,
  input: CreateTaskInput,
  request?: RequestContext,
): Promise<Task | null> {
  const project = await assertProjectAccess(userId, projectId, request);
  if (!project) return null;

  const { title, description, status, priority, dueDate } = input;

  const task = await prisma.task.create({
    data: {
      title,
      description,
      status,
      priority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      projectId,
    },
  });

  void recordActivity({
    actorId: userId,
    action: 'task.created',
    subjectType: 'task',
    subjectId: task.id,
    projectId,
    metadata: { title: task.title },
  });

  void dispatchWebhook('task.created', task, userId);

  return task;
}

/**
 * Returns a single task, or null if not found / not owned by userId.
 */
export async function getTask(userId: string, taskId: string): Promise<Task | null> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });

  if (!task || task.project.ownerId !== userId) return null;
  return task;
}

/**
 * Partially updates a task. Returns null if not found / not owned.
 */
export async function updateTask(
  userId: string,
  taskId: string,
  input: UpdateTaskInput,
  request?: RequestContext,
): Promise<Task | null> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });

  if (!task || task.project.ownerId !== userId) return null;

  const { title, description, status, priority, dueDate, archivedAt } = input;
  const statusChanged = status !== undefined && status !== task.status;
  const wasArchived = archivedAt !== undefined && archivedAt !== null && task.archivedAt === null;
  const wasUnarchived = archivedAt === null && task.archivedAt !== null;

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status }),
      ...(priority !== undefined && { priority }),
      ...(dueDate !== undefined && { dueDate: dueDate === null ? null : new Date(dueDate) }),
      ...(archivedAt !== undefined && { archivedAt: archivedAt === null ? null : new Date(archivedAt) }),
    },
  });

  const changes = input as Record<string, unknown>;

  void recordActivity({
    actorId: userId,
    action: 'task.updated',
    subjectType: 'task',
    subjectId: updated.id,
    projectId: task.projectId,
    metadata: changes,
  });

  void dispatchWebhook('task.updated', updated, userId);

  if (statusChanged) {
    void recordActivity({
      actorId: userId,
      action: 'task.status.changed',
      subjectType: 'task',
      subjectId: updated.id,
      projectId: task.projectId,
      metadata: { from: task.status, to: status },
    });
    void dispatchWebhook('task.status.changed', { task: updated, from: task.status, to: status }, userId);
    if (status === TaskStatus.DONE) {
      void dispatchWebhook('task.completed', updated, userId);
    }
  }

  if (wasArchived) {
    void dispatchWebhook('task.archived', updated, userId);
  }

  if (wasUnarchived) {
    void dispatchWebhook('task.unarchived', updated, userId);
  }

  void recordAuditEvent({
    eventType: 'task.updated',
    actorId: userId,
    request,
    metadata: { taskId: updated.id, changes },
  });

  return updated;
}

/**
 * Hard-deletes a task. Returns { id } on success, null if not found / not owned.
 */
export async function deleteTask(
  userId: string,
  taskId: string,
  request?: RequestContext,
): Promise<{ id: string } | null> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });

  if (!task || task.project.ownerId !== userId) return null;

  const deleted = await prisma.task.delete({ where: { id: taskId } });

  void recordActivity({
    actorId: userId,
    action: 'task.deleted',
    subjectType: 'task',
    subjectId: deleted.id,
    projectId: task.projectId,
    metadata: { title: task.title },
  });

  void dispatchWebhook('task.deleted', { id: deleted.id }, userId);

  void recordAuditEvent({
    eventType: 'task.deleted',
    actorId: userId,
    request,
    metadata: { taskId: deleted.id },
  });

  return { id: deleted.id };
}

// ── Bulk operations ─────────────────────────────────────────────────────────────

/**
 * Sets status on multiple tasks. Returns { updatedCount } or { unauthorizedIds }.
 */
export async function bulkSetStatus(
  userId: string,
  ids: string[],
  status: TaskStatus,
): Promise<{ updatedCount: number } | { unauthorizedIds: string[] }> {
  const { tasks, unauthorizedIds } = await resolveTaskOwnership(ids, userId);

  if (unauthorizedIds.length > 0) return { unauthorizedIds };

  await prisma.task.updateMany({ where: { id: { in: ids } }, data: { status } });

  for (const task of tasks) {
    if (task.status !== status) {
      void recordActivity({
        actorId: userId,
        action: 'task.status.changed',
        subjectType: 'task',
        subjectId: task.id,
        projectId: task.projectId,
        metadata: { from: task.status, to: status },
      });
      void dispatchWebhook('task.status.changed', { taskId: task.id, from: task.status, to: status }, userId);
      if (status === TaskStatus.DONE) {
        void dispatchWebhook('task.completed', { id: task.id }, userId);
      }
    }
  }

  return { updatedCount: ids.length };
}

/**
 * Moves multiple tasks to a destination project. Returns { updatedCount } or { unauthorizedIds }.
 */
export async function bulkMove(
  userId: string,
  ids: string[],
  projectId: string,
): Promise<{ updatedCount: number } | { unauthorizedIds: string[] }> {
  const destProject = await assertProjectAccess(userId, projectId);
  if (!destProject) return { unauthorizedIds: [] };

  const { tasks, unauthorizedIds } = await resolveTaskOwnership(ids, userId);

  if (unauthorizedIds.length > 0) return { unauthorizedIds };

  await prisma.task.updateMany({ where: { id: { in: ids } }, data: { projectId } });

  for (const task of tasks) {
    void recordActivity({
      actorId: userId,
      action: 'task.moved',
      subjectType: 'task',
      subjectId: task.id,
      projectId,
      metadata: { fromProjectId: task.projectId, toProjectId: projectId },
    });
  }

  return { updatedCount: ids.length };
}

/**
 * Archives multiple tasks. Returns { updatedCount } or { unauthorizedIds }.
 */
export async function bulkArchive(
  userId: string,
  ids: string[],
): Promise<{ updatedCount: number } | { unauthorizedIds: string[] }> {
  const { tasks, unauthorizedIds } = await resolveTaskOwnership(ids, userId);

  if (unauthorizedIds.length > 0) return { unauthorizedIds };

  const now = new Date();
  await prisma.task.updateMany({ where: { id: { in: ids } }, data: { archivedAt: now } });

  for (const task of tasks) {
    void dispatchWebhook('task.archived', { id: task.id }, userId);
  }

  return { updatedCount: ids.length };
}

/**
 * Unarchives multiple tasks. Returns { updatedCount } or { unauthorizedIds }.
 */
export async function bulkUnarchive(
  userId: string,
  ids: string[],
): Promise<{ updatedCount: number } | { unauthorizedIds: string[] }> {
  const { tasks, unauthorizedIds } = await resolveTaskOwnership(ids, userId);

  if (unauthorizedIds.length > 0) return { unauthorizedIds };

  await prisma.task.updateMany({ where: { id: { in: ids } }, data: { archivedAt: null } });

  for (const task of tasks) {
    void dispatchWebhook('task.unarchived', { id: task.id }, userId);
  }

  return { updatedCount: ids.length };
}

/**
 * Hard-deletes multiple tasks. Returns { deletedCount } or { unauthorizedIds }.
 */
export async function bulkDelete(
  userId: string,
  ids: string[],
): Promise<{ deletedCount: number } | { unauthorizedIds: string[] }> {
  const { tasks, unauthorizedIds } = await resolveTaskOwnership(ids, userId);

  if (unauthorizedIds.length > 0) return { unauthorizedIds };

  await prisma.$transaction([prisma.task.deleteMany({ where: { id: { in: ids } } })]);

  for (const task of tasks) {
    void dispatchWebhook('task.deleted', { id: task.id }, userId);
    void recordActivity({
      actorId: userId,
      action: 'task.deleted',
      subjectType: 'task',
      subjectId: task.id,
      projectId: task.projectId,
    });
  }

  return { deletedCount: ids.length };
}
