# VGXTaskCo

**Version: 0.6.2**

The reference implementation for [VGX Global Consulting's AI-Powered Development with Claude masterclass](https://vgx.guru). Built live during the course to demonstrate AI-assisted full-stack development — every commit, prompt, and architectural decision is traceable to the build sequence in `vgxtaskco-build.md`.

> This is the benchmark app, not the course handouts. If you're a cohort participant, you're building your own version — not copying this one.

---

## What it is

A task management app: projects, tasks, tags, comments, saved views, CSV export, n8n webhooks, API tokens, full activity and audit log, Google + GitHub SSO via Supabase Auth.

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
pnpm test              # 120 tests

# Frontend unit tests (Vitest, jsdom)
cd web && pnpm test    # 22 tests

# Feature matrix E2E (Playwright — requires both dev servers running)
pnpm test:features
```

## Deploy (free tier)

See [Free Deployment Guide](prompts/FREE-DEPLOY.md) — Fly.io (backend) + Vercel (frontend).

For VGX VPS: see [VPS Setup](prompts/VPS-SETUP.md) + GitHub Actions workflow in `.github/workflows/deploy.yml`.

---

## Changelog

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
