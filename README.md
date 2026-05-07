# VGXTaskCo

**Version: 0.7.2**

The reference implementation for [VGX Global Consulting's AI-Powered Development with Claude masterclass](https://vgx.guru). Built live during the course to demonstrate AI-assisted full-stack development — every commit, prompt, and architectural decision is traceable to the build sequence in `vgxtaskco-build.md`.

> This is the benchmark app, not the course handouts. If you're a cohort participant, you're building your own version — not copying this one.

---

## What it is

A task management app: projects, tasks, saved views, CSV export, n8n webhooks, API tokens, full activity and audit log, Google + GitHub SSO via Supabase Auth.

**Backend** — TypeScript + Fastify + Prisma + PostgreSQL (Neon)
**Frontend** — React + Vite + Tailwind v3 + TanStack Query
**Auth** — JWT (local) + Supabase Auth (Google, GitHub, Azure/M365)
**Deploy** — Docker + GitHub Actions → VPS or Fly.io

---

## Quickstart (local dev)

```bash
# Backend
cp .env.example .env      # fill in DATABASE_URL, JWT_SECRET, API_TOKEN_PEPPER, SUPABASE_*
pnpm install
pnpm prisma migrate deploy
pnpm dev                  # http://localhost:4000

# Frontend (separate terminal)
cd web
cp .env.example .env.local   # fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
pnpm install
pnpm dev                  # http://localhost:5173
```

## Running tests

```bash
# Backend integration tests (Vitest, hits real Neon DB)
pnpm test              # 121 tests

# Frontend unit tests (Vitest, jsdom)
cd web && pnpm test    # 102 tests

# Feature matrix E2E (Playwright — requires both dev servers running)
pnpm test:features
```

## Deploy (free tier)

See [Free Deployment Guide](prompts/FREE-DEPLOY.md) — Fly.io (backend) + Vercel (frontend).

For VGX VPS: see [VPS Setup](prompts/VPS-SETUP.md) + GitHub Actions workflow in `.github/workflows/deploy.yml`.

---

## Changelog

### 0.7.2 (2026-05-07)

- Removed tags and comments features from backend and frontend — routes, schemas, service code, CSV column, search results, and all E2E test cases
- Fixed `DELETE /tasks/:id` response shape to `{ deleted: true }` per API contract
- Fixed webhook HMAC header typo: `X-VGXT-Signature` → `X-VGX-Signature`
- Webhook URL SSRF validator now allows localhost in non-production environments (unblocks E2E webhook tests)
- Fixed `api-client` sending `Content-Type: application/json` on bodyless DELETE requests (caused 400s from Fastify body parser)
- Fixed modal centering: framer-motion `scale` animation was overwriting Tailwind `-translate-x/y-1/2` transforms; replaced with flexbox centering wrapper
- Redesigned `CreateTaskModal`: Todoist-inspired layout with large title input, AI smart field (auto-focused on open), pill toolbar for date+time/priority/status, `@mention` project picker with keyboard navigation, and project badge in footer
- Added time support to due date (date + optional time combined into ISO datetime)
- Lifted `N` keyboard shortcut to `App.tsx` — now works on dashboard and all non-project pages; project pages self-manage with project pre-selected
- Dashboard "Quick task" button delegates to App-level modal; no longer requires a first project to exist
- Fixed E2E `tc-kbd-001`: use `document.body.focus()` + `dispatchEvent` on body so keydown bubbles reliably to window listener in headless Playwright
- Cleaned test-results and playwright-report from git tracking

### 0.7.0 (2026-05-07)

- Rate limiting disabled in dev/test (`NODE_ENV !== 'production'`) — prevents E2E suite from hitting limits during multi-user tests
- Added flat `GET /activity` endpoint scoped to the authenticated user's projects — tests no longer depend on project-scoped URL
- Fixed E2E test CSV URLs: `/export/project/:id` → `/projects/:id/export/tasks.csv`, `/export/tasks` → `/export/tasks.csv`
- Fixed `proj-011` E2E test: removed `ownerId` from request body (schema is strict); verifies ownerId = caller instead
- Version bump 0.6.9 → 0.7.0

### 0.6.7 (2026-05-07)

- Response shape assertions on all backend route tests — verifies field types (string/number/array) on every 200/201 response
- Catches backend→frontend contract breaks like the `_count.tasks` bug; every route now asserts `typeof field === 'string'`, `Array.isArray(tags)`, and `_count.tasks` is a number
- Files updated: `tests/routes/projects.test.ts`, `tasks.test.ts`, `tags.test.ts`, `auth.test.ts`, `auth-sso.test.ts`, `api-tokens.test.ts`, `search.test.ts`

### 0.6.5 (2026-05-07)

- Comprehensive frontend unit tests: 80 new tests across 7 new test files
- `query.test.ts` — `buildTaskQueryString` (empty, string, array, boolean, multi-filter)
- `supabase.test.ts` — `getSSOUrl` (provider variants, URL structure, redirect_to encoding)
- `download-csv.test.ts` — `downloadCSV` (happy path, auth headers, Content-Disposition, error handling)
- `useProjects.test.ts` — fetch, create, update, delete + cache invalidation
- `useTags.test.ts` — fetch, create, delete, attachTags
- `useApiTokens.test.ts` — fetch, create (with expiresInDays), revoke + cache invalidation
- `TaskCard.test.tsx` — title, priority badge, due date, overdue styling, click handler, tag chips + overflow

### 0.6.2 (2026-05-07)

- Bulk ops (bulkSetStatus, bulkMove, bulkArchive, bulkUnarchive) now use `updateMany` instead of N individual `update` calls inside a transaction
- `resolveTaskOwnership` uses a narrow `select` instead of `include: { project: true }` — loads only what's needed
- Added composite indexes on Task: `(projectId, archivedAt)`, `(projectId, status)`, `(dueDate, status)`, `(updatedAt)`
- Added `color` field to Tag model with default `#6b7280`
- New `GET /tasks` cross-project endpoint: fetch tasks across multiple owned projects in a single request
- `listTasks` now returns tags (id, value, color) in each task result — `tagIds` filter no longer silently dropped
- New `listTasksForProjects` service function for efficient cross-project queries
- `gcTime: 10 * 60 * 1000` added to QueryClient for longer in-memory cache retention
- Security: `GET /tasks/:id` route wired up — TaskDetailModal no longer 404s
- Security: Rate limiting on auth endpoints (`@fastify/rate-limit`) — login 10/min, register 5/min, sso/exchange 10/min per IP, 300/min global default
- Security: Webhook URL validation blocks SSRF — rejects localhost, private RFC1918 ranges, link-local, and non-HTTPS
- Security: Internal reminders endpoints now protected by `INTERNAL_API_KEY` shared secret (`x-internal-key` header) — removes API token scope bypass vector
- Security: SSO `/sso/exchange` returns 409 when email matches existing account — eliminates silent account takeover via OAuth email matching
- Security: `console.error` in webhooks, audit, and activity services replaced with structured pino logger
- Refactor: `RequestContext` interface deduplicated into `src/lib/types.ts`

### 0.1.0 (2026-05-06)

- Full-stack task management: projects, tasks (CRUD + bulk ops + filtering), tags, comments
- Activity log, audit log (security events), n8n webhooks on all task events
- Saved views with cross-project filtering, CSV export (RFC 4180), global search
- Per-user API tokens (HMAC-SHA256 + pepper, service vs user scope)
- Due-date reminders via n8n cron endpoints
- Google + GitHub SSO via Supabase Auth; JWT fallback for email/password
- Service layer with `canAccessProject` as the ownership chokepoint
- 135-entry Playwright feature matrix with autocorrect loop
- Docker multi-stage builds, GitHub Actions CI/CD pipeline
- VGX brand: purple #8337c8, Montserrat/Ubuntu fonts, full dark/light mode parity

---

© 2026 VGX Global Consulting (OPC) Private Limited — [vgx.digital](https://vgx.digital)
