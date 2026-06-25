# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# VGXTaskCo

A full-stack task management app built as the VGX Global Consulting AI-Assisted Development masterclass reference implementation. Live at [taskco.vgx.guru](https://taskco.vgx.guru).

**Read `context.md` before touching anything in this repo.** It has the hard rules, pitfalls from the first build, and everything you need to avoid re-reviewing.

## Layout

Backend at root (`src/`, `prisma/`), frontend in `web/`. Not a pnpm workspace — `pnpm install` must be run separately in each.

## Commands

```bash
# Backend
pnpm dev                      # :4000
pnpm test                     # 121 integration tests (Vitest, real Neon DB)
pnpm test:watch               # watch mode
pnpm typecheck                # tsc --noEmit
pnpm lint                     # eslint src
pnpm build                    # prisma generate + tsc

# Run a single backend test file
pnpm test tests/routes/tasks.test.ts

# Frontend (run from web/)
pnpm dev                      # :5173
pnpm test                     # 102 unit tests (Vitest + jsdom)
pnpm typecheck
```

## Architecture

### Backend (`src/`)

```
src/
  index.ts          — Fastify app bootstrap: registers plugins + all route groups
  middleware/auth.ts — requireAuth preHandler (JWT verify + DB user lookup)
  lib/              — prisma singleton, jwt helpers, zod env, hash, supabase client
  schemas/          — Zod schemas per domain (used for route validation + types)
  routes/           — one file per feature group, registered with prefix in index.ts
  services/         — business logic; routes call services, never raw Prisma
    access.ts       — THE ownership chokepoint (see Non-negotiable rules below)
```

Every route file imports `requireAuth` as a `preHandler` on protected routes. Auth middleware sets `request.user` (id, email, name).

Rate limiting is production-only (`NODE_ENV === 'production'`). Auth routes carry additional per-route limits defined inside `src/routes/auth.ts`.

### Frontend (`web/src/`)

```
web/src/
  App.tsx           — SPA router (custom state machine, no react-router), dark mode, global N shortcut
  lib/api-client.ts — fetch wrapper; unwraps { data: T } envelope, redirects on 401
  lib/auth.ts       — JWT storage helpers
  lib/query.ts      — buildTaskQueryString for filter params
  hooks/            — TanStack Query hooks per domain (useProjects, useTasks, etc.)
  pages/            — one component per route
  components/       — shared UI built on Radix UI + Tailwind v3
```

No react-router. Routing is a `Route` union type in `App.tsx` with a `navigate()` function passed down as props. The global "N" keyboard shortcut to create a task is lifted to `App.tsx` for all non-project pages; `ProjectDetailPage` manages its own shortcut so the modal pre-selects the right project.

### Data model (Prisma)

Core entities: `User → Project → Task`. Tags are user-owned (not project-scoped) and M:N with Task. `Activity` tracks all task/project mutations. `AuditEvent` tracks security events only. `SavedView` stores cross-project filter presets. `ApiToken` uses HMAC-SHA256 + pepper; `WebhookEndpoint` fires on task events with HMAC signature.

### Testing

Backend tests (`tests/routes/`, `tests/services/`) use `buildTestApp()` from `tests/setup.ts` — a Fastify instance using `app.inject()`, no real HTTP. Tests hit a real Neon DB; test users use `@test.local` email domain and are cleaned up in the `afterAll` in `setup.ts`.

Frontend tests (`web/src/**/*.test.ts`) use Vitest + jsdom, mocking `api-client` and Supabase directly.

## Non-negotiable rules

- Every endpoint touching owned data calls `canAccessProject` (or `assertProjectAccess`) from `src/services/access.ts`. Never inline a `WHERE ownerId` check in a service function.
- Response envelope: `{ data: ... }` success, `{ error: "string" }` failure. No exceptions.
- Frontend `api-client` unwraps `{ data: T }` — do not return the raw envelope from any route.
- No `console.log` in production code — use `app.log` (pino).
- `pnpm test` must pass before any phase is called done. Typecheck alone is not enough.
- `tests/setup.ts` `afterAll` must NOT call `prisma.$disconnect()` — closes the shared pool and breaks all subsequent test files.

## Stack (locked)

Backend: TypeScript + Fastify + Prisma + PostgreSQL (Neon) + Zod + Vitest
Frontend: React 19 + Vite + Tailwind v3 + TanStack Query + Radix UI
Auth: JWT (jose/bcrypt) + Supabase Auth (Google, GitHub, Azure)
Brand: primary #8337c8, pink #d94a7d, Montserrat (display) + Ubuntu (body)

## Copyright

Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.
