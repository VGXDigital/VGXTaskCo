// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { hashPassword, verifyPassword } from '../lib/hash.js';
import { signJwt } from '../lib/jwt.js';
import { registerBodySchema, loginBodySchema, ssoExchangeBodySchema } from '../schemas/auth.js';
import { getSupabaseAdmin } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { recordAuditEvent } from '../services/audit.js';
import { seedDefaultViews } from '../services/user.js';

const authRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /auth/register
   * Creates a new local user account and returns a JWT.
   */
  app.post('/register', async (request, reply) => {
    const parsed = registerBodySchema.safeParse(request.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Validation error';
      return reply.status(400).send({ error: message });
    }

    const { email, password, name } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({ error: 'Email already in use' });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: { email, passwordHash, name, provider: 'local' },
      select: { id: true, email: true, name: true },
    });

    const token = await signJwt({ userId: user.id });

    // Seed default saved views fire-and-forget
    void seedDefaultViews(user.id);

    // Audit: user registration
    void recordAuditEvent({
      eventType: 'auth.register',
      actorId: user.id,
      request: {
        ip: request.ip,
        headers: request.headers as Record<string, string | string[] | undefined>,
      },
      metadata: { email },
    });

    return reply.status(201).send({ data: { token, user } });
  });

  /**
   * POST /auth/login
   * Authenticates with email + password, returns a JWT.
   * Same error message for wrong email or wrong password — no existence leakage.
   */
  app.post('/login', async (request, reply) => {
    const parsed = loginBodySchema.safeParse(request.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Validation error';
      return reply.status(400).send({ error: message });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });

    const passwordValid =
      user?.passwordHash ? await verifyPassword(password, user.passwordHash) : false;

    if (!user || !passwordValid) {
      // Audit: login failure (no actorId to avoid user enumeration)
      void recordAuditEvent({
        eventType: 'auth.login.failure',
        request: {
          ip: request.ip,
          headers: request.headers as Record<string, string | string[] | undefined>,
        },
        metadata: { email },
      });
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    // Update last login timestamp (fire-and-forget, non-blocking)
    void prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await signJwt({ userId: user.id });

    // Audit: login success
    void recordAuditEvent({
      eventType: 'auth.login.success',
      actorId: user.id,
      request: {
        ip: request.ip,
        headers: request.headers as Record<string, string | string[] | undefined>,
      },
    });

    return reply.status(200).send({
      data: {
        token,
        user: { id: user.id, email: user.email, name: user.name },
      },
    });
  });

  /**
   * POST /auth/sso/exchange
   * Exchanges a Supabase OAuth access token for our own JWT.
   * Supports Google and GitHub providers. No prior authentication required.
   */
  app.post('/sso/exchange', async (request, reply) => {
    const parsed = ssoExchangeBodySchema.safeParse(request.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Validation error';
      return reply.status(400).send({ error: message });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return reply.status(503).send({ error: 'SSO not configured' });
    }

    const { data: supabaseData, error: supabaseError } = await supabase.auth.getUser(
      parsed.data.accessToken,
    );
    if (supabaseError || !supabaseData.user) {
      return reply.status(401).send({ error: 'Invalid SSO token' });
    }

    const supabaseUser = supabaseData.user;
    const email = supabaseUser.email;
    if (!email) {
      return reply.status(401).send({ error: 'Invalid SSO token' });
    }

    const name: string =
      (supabaseUser.user_metadata['full_name'] as string | undefined) ??
      (supabaseUser.user_metadata['name'] as string | undefined) ??
      email.split('@')[0] ??
      email;

    const provider: string = supabaseUser.app_metadata['provider'] as string ?? '';

    // providerUserId is the raw provider account ID (e.g. GitHub numeric ID)
    const providerUserId: string =
      (supabaseUser.user_metadata['sub'] as string | undefined) ??
      (supabaseUser.identities?.[0]?.id) ??
      supabaseUser.id;

    // Determine which provider-specific column to use
    type ProviderField = 'googleId' | 'githubId';
    let providerField: ProviderField;
    if (provider === 'google') {
      providerField = 'googleId';
    } else if (provider === 'github') {
      providerField = 'githubId';
    } else {
      return reply.status(401).send({ error: 'Unsupported provider' });
    }

    const selectFields = { id: true, email: true, name: true } as const;

    // Look up existing user — try provider ID first, then email.
    // Prisma's findUnique where requires a typed unique key, so branch explicitly.
    const existingUser =
      providerField === 'googleId'
        ? await prisma.user.findUnique({ where: { googleId: providerUserId }, select: selectFields })
        : await prisma.user.findUnique({ where: { githubId: providerUserId }, select: selectFields });

    const existingByEmail = existingUser
      ? null
      : await prisma.user.findUnique({
          where: { email },
          select: selectFields,
        });

    let dbUser: { id: string; email: string; name: string };
    let statusCode = 200;

    if (existingUser) {
      // Returning SSO user — update last login
      void prisma.user.update({
        where: { id: existingUser.id },
        data: { lastLoginAt: new Date() },
      });
      dbUser = existingUser;
    } else if (existingByEmail) {
      // Email matched a different auth path — link the provider ID
      const updated = await prisma.user.update({
        where: { id: existingByEmail.id },
        data:
          providerField === 'googleId'
            ? { googleId: providerUserId, lastLoginAt: new Date() }
            : { githubId: providerUserId, lastLoginAt: new Date() },
        select: selectFields,
      });
      dbUser = updated;
    } else {
      // New user — create with provider details
      const created = await prisma.user.create({
        data:
          providerField === 'googleId'
            ? { email, name, passwordHash: null, googleId: providerUserId, provider, lastLoginAt: new Date() }
            : { email, name, passwordHash: null, githubId: providerUserId, provider, lastLoginAt: new Date() },
        select: selectFields,
      });
      dbUser = created;
      statusCode = 201;

      void seedDefaultViews(dbUser.id);
      void recordAuditEvent({
        eventType: 'auth.register',
        actorId: dbUser.id,
        request: {
          ip: request.ip,
          headers: request.headers as Record<string, string | string[] | undefined>,
        },
        metadata: { provider },
      });
    }

    const token = await signJwt({ userId: dbUser.id });

    void recordAuditEvent({
      eventType: 'auth.login.success',
      actorId: dbUser.id,
      request: {
        ip: request.ip,
        headers: request.headers as Record<string, string | string[] | undefined>,
      },
      metadata: { provider },
    });

    return reply.status(statusCode).send({ data: { token, user: dbUser } });
  });

  /**
   * GET /auth/me
   * Returns the currently authenticated user's profile.
   */
  app.get('/me', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id, email, name } = request.user;
    return reply.status(200).send({ data: { id, email, name } });
  });
};

export default authRoutes;
