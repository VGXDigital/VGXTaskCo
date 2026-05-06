# VGXTaskCo — Claude Context

## Project

VGXTaskCo is a task management application and the reference implementation for the "AI-Powered Development with Claude" masterclass delivered by VGX Global Consulting. Backend at repo root, frontend in `web/` — each has its own `package.json`. Not a pnpm workspace; run `pnpm install` separately in each.

## Stack

**Backend**: TypeScript + Node + Fastify + Prisma + PostgreSQL + Zod + Vitest. ESLint (`recommended-type-checked`) + Prettier. pnpm.

**Frontend** (`web/`): React + Vite + Tailwind + TanStack Query. Radix UI, framer-motion, sonner toasts, react-hook-form + zod resolver, lucide-react, date-fns. No axios — wrap fetch. pnpm.

## Folder Structure

```
src/
  routes/       one file per resource (auth.ts, projects.ts, tasks.ts …)
  services/     business logic — added Phase 9
  schemas/      Zod schemas, one per resource
  lib/          env.ts, prisma.ts, jwt.ts, hash.ts
  middleware/   Fastify hooks (auth.ts …)
tests/          mirrors src/ structure
prisma/         schema.prisma, migrations/
scripts/        build-runner.mjs, hooks/
```

## Naming

camelCase for variables and functions. PascalCase for types and classes. kebab-case for filenames.

## Response Envelope

Every success response: `{ data: ... }`. Every error response: `{ error: "human-readable string" }`. No exceptions.

## Validation

Every request body, query parameter, and route param validated with Zod. Schemas live in `src/schemas/`. Always `.strict()` on body schemas.

## Auth

JWT via `jose`, bcrypt for passwords (cost 12). SSO (Google Workspace + Microsoft 365) added in Phase 8 as the primary path; JWT is the fallback. `JWT_SECRET` from env, minimum 32 chars.

## Ownership Rule

Every query returning user-owned data is scoped by `ownerId` or transitively via project ownership. `canAccessProject(userId, projectId)` in `src/services/access.ts` is the chokepoint (Phase 9). Every protected endpoint calls it. Never query `findMany()` without a `where` clause.

Every endpoint touching project-scoped data MUST call canAccessProject (or assertProjectAccess via the service layer). Never inline a WHERE ownerId check in a service function — route it through src/services/access.ts.

## Never Do

- Store plain-text passwords
- Return `passwordHash` in any response
- Log JWT tokens or request bodies in production
- Use `console.log` in production code — use Fastify logger (`app.log`)
- Hardcode secrets or commit `.env`
- Use raw SQL when Prisma can handle it
- Trust `ownerId` or user identity from request body — always use `request.user.id`

## Documented Trade-offs

JWT stored in localStorage (XSS risk, accepted for v1 internal use). SSO callback returns JWT in URL fragment (leaks to browser history, same TTL as local auth, accepted for v1).

## Out of Scope

Recurring tasks, native email (n8n handles email), mobile, websockets, file attachments, time tracking.

## Testing

Vitest. Test files in `tests/`. Integration tests use Fastify `inject`, not a real HTTP listener. Use `app.inject({ method, url, payload })`. Test emails should use the `@test.local` domain.

## Commit Style

Lowercase, action-first, JIRA ticket ID required. Example: `VGXT-12: add register endpoint`.

## Timezone

Server local time = VPS time = UTC. All due-date queries use UTC boundaries.

## Search

PostgreSQL ILIKE for now. Move to `tsvector` + GIN index when rows exceed 100k or latency exceeds 200ms.

## Webhook Delivery

Fire-and-forget via `Promise.allSettled`, 5-second timeout per endpoint, no retries in v1.

## API Token Hashing

HMAC-SHA256 + server-side pepper (`API_TOKEN_PEPPER` env var). Not bcrypt — bcrypt is too slow for every API call.

## Tag Convention

Tags follow `key:value` format (e.g. `client:ICA`, `phase:audit`) but this is not enforced in the database schema.

## Cross-User Access

Always return 404, not 403, for resources the caller doesn't own. No existence leakage.

---

Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.
