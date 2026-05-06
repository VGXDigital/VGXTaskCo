# VGXTaskCo

**Read `context.md` before touching anything in this repo.** It has the hard rules, pitfalls from the first build, and everything you need to avoid re-reviewing.

## Quick orientation

- Build sequence: `vgxtaskco-build.md` (12 phases, 60+ prompts)
- App lives here: backend at root (`src/`, `prisma/`), frontend in `web/`
- Not a pnpm workspace — run `pnpm install` separately in each

## Commands

```bash
pnpm dev                    # backend on :4000
pnpm test                   # 120 backend tests (Vitest, real Neon DB)
pnpm typecheck              # tsc --noEmit

cd web && pnpm dev          # frontend on :5173
cd web && pnpm test         # 22 frontend tests
cd web && pnpm typecheck

pnpm test:features          # Playwright E2E (needs both dev servers)
pnpm verify:features:autofix # autonomous fix loop (max 5 iterations)
```

## Non-negotiable rules

- Every endpoint touching owned data calls `canAccessProject` (or `assertProjectAccess`) from `src/services/access.ts`. Never inline a `WHERE ownerId` check in a service function.
- Response envelope: `{ data: ... }` success, `{ error: "string" }` failure. No exceptions.
- Frontend api-client unwraps `{ data: T }` — do not return the raw envelope.
- No `console.log` in production code — use `app.log`.
- `pnpm test` must pass before any phase is called done. Typecheck alone is not enough.
- `tests/setup.ts` `afterAll` must NOT call `prisma.$disconnect()` — closes the shared pool and breaks all subsequent test files.

## Stack (locked)

Backend: TypeScript + Fastify + Prisma + PostgreSQL (Neon) + Zod + Vitest
Frontend: React 19 + Vite + Tailwind v3 + TanStack Query + Radix UI
Auth: JWT (jose/bcrypt) + Supabase Auth (Google, GitHub, Azure)
Brand: primary #8337c8, pink #d94a7d, Montserrat (display) + Ubuntu (body)

## Copyright

Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.
