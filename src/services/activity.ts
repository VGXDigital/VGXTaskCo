// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

/**
 * Append-only activity logger. Never throws — failures are logged only.
 */
export async function recordActivity(params: {
  actorId: string;
  action: string;
  subjectType: string;
  subjectId: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.activity.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        subjectType: params.subjectType,
        subjectId: params.subjectId,
        projectId: params.projectId,
        metadata: params.metadata !== undefined
          ? (params.metadata as Prisma.InputJsonObject)
          : Prisma.JsonNull,
      },
    });
  } catch (err) {
    console.error('[activity] Failed to record activity:', err);
  }
}
