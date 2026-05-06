// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

/**
 * src/services/access.ts
 *
 * The seam for future team collaboration. When a ProjectMember table is added,
 * only this file changes — no route or other service needs to know how access
 * is determined.
 */

import type { Project } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { recordAuditEvent } from '../services/audit.js';

/**
 * Returns true iff the project exists and its ownerId matches userId.
 * Returns false (never throws) on any DB error.
 */
export async function canAccessProject(userId: string, projectId: string): Promise<boolean> {
  try {
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: userId },
      select: { id: true },
    });
    return project !== null;
  } catch {
    return false;
  }
}

/**
 * Returns the Project on success.
 * On failure: logs an audit event and returns null.
 * Routes must turn null into a 404 response (no existence leakage).
 */
export async function assertProjectAccess(
  userId: string,
  projectId: string,
  request?: { ip: string; headers: Record<string, string | string[] | undefined> },
): Promise<Project | null> {
  try {
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: userId },
    });

    if (!project) {
      void recordAuditEvent({
        eventType: 'auth.access.denied',
        actorId: userId,
        request,
        metadata: { resource: 'project', resourceId: projectId, attemptedBy: userId },
      });
      return null;
    }

    return project;
  } catch {
    void recordAuditEvent({
      eventType: 'auth.access.denied',
      actorId: userId,
      request,
      metadata: { resource: 'project', resourceId: projectId, attemptedBy: userId },
    });
    return null;
  }
}
