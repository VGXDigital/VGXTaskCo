# VGXTaskCo

A Fastify 5 + TypeScript + Prisma 7 task management backend API with JWT authentication, project and task CRUD, and PostgreSQL via the pg driver adapter.

## Version

**0.1.0**

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Fastify 5.x with `@fastify/helmet`, `@fastify/cors`, `@fastify/sensible`
- **ORM**: Prisma 7.x with `@prisma/adapter-pg` (pg driver adapter)
- **Auth**: JWT via `jose`, bcrypt password hashing
- **Validation**: Zod 4.x
- **Language**: TypeScript 6.x (strict mode)

## Prerequisites

- Node.js >= 20.19 or >= 22.12
- pnpm
- PostgreSQL instance accessible via `DATABASE_URL`

## Environment Variables

Copy `.env.example` to `.env` and set:

```
DATABASE_URL=postgresql://user:password@localhost:5432/vgxtaskco
JWT_SECRET=<minimum 32 characters>
API_TOKEN_PEPPER=<minimum 32 characters>
PORT=4000                          # optional, default 4000
NODE_ENV=development               # development | production | test
ALLOWED_FRONTEND_ORIGINS=http://localhost:5173  # required in production
```

## Build & Run

```bash
# Install dependencies
pnpm install

# Generate Prisma client (required after install or schema changes)
pnpm exec prisma generate

# Run database migrations
pnpm exec prisma migrate deploy

# Development (tsx watch)
pnpm dev

# Type-check only (no emit)
pnpm typecheck

# Build to dist/
pnpm build

# Start production build
pnpm start
```

## API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/register | — | Create account, returns JWT |
| POST | /auth/login | — | Authenticate, returns JWT |
| GET | /auth/me | JWT | Current user profile |
| POST | /projects | JWT | Create project |
| GET | /projects | JWT | List owned projects |
| GET | /projects/:id | JWT | Get project with task count |
| PATCH | /projects/:id | JWT | Update project |
| DELETE | /projects/:id | JWT | Delete project (cascades tasks) |
| POST | /projects/:projectId/tasks | JWT | Create task |
| GET | /projects/:projectId/tasks | JWT | List tasks (filterable) |
| PATCH | /tasks/:id | JWT | Update task |
| DELETE | /tasks/:id | JWT | Delete task |

## Changelog

### 0.1.0

- Initial project scaffold
- Fastify 5 server with helmet, CORS, sensible
- JWT auth middleware with Prisma user lookup
- Projects and tasks CRUD with ownership scoping
- Zod 4 request validation
- Prisma 7 with pg adapter (PostgreSQL)
- Environment validation via Zod at startup
