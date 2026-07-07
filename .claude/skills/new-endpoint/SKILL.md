# Skill: new-endpoint

## Frontmatter

Apply this skill whenever adding, modifying, or removing a REST endpoint in vgx-taskco. This covers new routes, schema changes, middleware additions, and any test updates for endpoint behaviour.

## File Pattern

| Concern | Location |
|---------|----------|
| Route handler | `src/routes/<resource>.ts` |
| Zod schemas | `src/schemas/<resource>.ts` |
| Business logic | `src/services/<resource>.ts` (after Phase 9) |
| Integration tests | `tests/routes/<resource>.test.ts` |

One file per resource. Never mix resources in a single route file.

## Reference Files

Study these before writing any new endpoint:

- `src/routes/projects.ts` — canonical Fastify plugin pattern, ownership checks, CUID param validation, response envelope
- `src/schemas/project.ts` — Zod strict schemas with `.refine()` for non-trivial constraints
- `src/middleware/auth.ts` — `requireAuth` preHandler pattern and `FastifyRequest.user` type augmentation
- `tests/routes/projects.test.ts` — `app.inject` test structure, unique email helpers, assertion patterns

## Mandatory Constraints

1. **Auth**: every protected endpoint must use `{ preHandler: [requireAuth] }` (or `requireAuthOrApiToken` once added in Phase 8). No exceptions.

2. **Validation**: every request body, query string, and route param must be validated with Zod. Body schemas must use `.strict()`. Params use inline `z.string().cuid()` or a named schema.

3. **Ownership**: every endpoint touching user-owned data must verify ownership via `project.ownerId === request.user.id` or `canAccessProject(userId, projectId)` (Phase 9+). Never trust ownership from request body.

4. **Response envelope**:
   - Success: `{ data: <payload> }`
   - Error: `{ error: "human-readable string" }`
   - No other shapes. Ever.

5. **Cross-user leakage**: return `404` not `403` when a resource exists but the caller doesn't own it. Existence must never be revealed.

6. **User identity**: always take `ownerId` / `userId` from `request.user.id` (JWT-derived). Never from request body, query string, or route params.

7. **Logging**: use `app.log` or `request.log`. No `console.log` in any `src/` file.

8. **Raw SQL**: never use `$queryRaw` when Prisma's type-safe API can accomplish the same result.

## Forbidden

- Skipping Zod validation on any input
- Hardcoded secrets or env values
- Returning `passwordHash`, JWT secrets, or pepper values in responses
- `findMany()` without a `where` clause
- Logging request bodies in production paths
- An endpoint without at least three tests (success path, validation failure, ownership check)

## Done Checklist

Before marking an endpoint complete, verify all of the following:

- [ ] Zod schema in `src/schemas/<resource>.ts` with `.strict()`
- [ ] Route registered in `src/routes/<resource>.ts` with `requireAuth` preHandler
- [ ] Ownership check present (not just by id — also by `ownerId`)
- [ ] Response shape is `{ data }` on success, `{ error }` on failure
- [ ] Test: success path (correct 2xx + body shape)
- [ ] Test: validation failure (4xx with `{ error }`)
- [ ] Test: ownership check (another user's resource returns 404)
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes

---

Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.
