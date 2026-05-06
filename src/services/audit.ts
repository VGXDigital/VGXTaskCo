// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

/**
 * Security audit logger. Never throws.
 */
export async function recordAuditEvent(params: {
  eventType: string;
  actorId?: string;
  request?: { ip: string; headers: Record<string, string | string[] | undefined> };
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    let ip: string | undefined;
    let userAgent: string | undefined;

    if (params.request) {
      // Prefer x-forwarded-for first hop, fall back to request.ip
      const forwarded = params.request.headers['x-forwarded-for'];
      if (forwarded) {
        const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
        ip = raw?.split(',')[0]?.trim();
      }
      if (!ip) {
        ip = params.request.ip;
      }

      const ua = params.request.headers['user-agent'];
      userAgent = Array.isArray(ua) ? ua[0] : ua;
    }

    await prisma.auditEvent.create({
      data: {
        eventType: params.eventType,
        actorId: params.actorId ?? null,
        ip: ip ?? null,
        userAgent: userAgent ?? null,
        metadata: params.metadata !== undefined
          ? (params.metadata as Prisma.InputJsonObject)
          : Prisma.JsonNull,
      },
    });
  } catch (err) {
    console.error('[audit] Failed to record audit event:', err);
  }
}
