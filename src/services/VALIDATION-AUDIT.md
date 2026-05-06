# Validation Audit — src/routes/

Generated: Phase 9.5 — every route handler checked for Zod coverage on body, query, and params.

## Summary

One gap found and fixed: `src/routes/export.ts` query parameters were cast with raw TypeScript
type assertions instead of Zod schemas. All other routes were already fully validated.

---

## Route-by-route findings

### auth.ts

| Route | Params | Query | Body |
|---|---|---|---|
| POST /auth/register | — | — | registerBodySchema ✓ |
| POST /auth/login | — | — | loginBodySchema ✓ |
| POST /auth/sso/exchange | — | — | ssoExchangeBodySchema ✓ |
| GET /auth/me | — | — | (no body) ✓ |

**Status: PASS**

---

### projects.ts

| Route | Params | Query | Body |
|---|---|---|---|
| POST /projects/ | — | — | createProjectBodySchema ✓ |
| GET /projects/ | — | — | (none) ✓ |
| GET /projects/:id | cuidParam ✓ | — | (none) ✓ |
| PATCH /projects/:id | cuidParam ✓ | — | updateProjectBodySchema ✓ |
| DELETE /projects/:id | cuidParam ✓ | — | (none) ✓ |

**Status: PASS**

---

### tasks.ts

| Route | Params | Query | Body |
|---|---|---|---|
| POST /projects/:projectId/tasks | cuidParam ✓ | — | createTaskBodySchema ✓ |
| GET /projects/:projectId/tasks | cuidParam ✓ | listTasksQuerySchema ✓ | (none) ✓ |
| PATCH /tasks/:id | cuidParam ✓ | — | updateTaskBodySchema ✓ |
| DELETE /tasks/:id | cuidParam ✓ | — | (none) ✓ |
| POST /tasks/bulk/status | — | — | bulkStatusBodySchema ✓ |
| POST /tasks/bulk/move | — | — | bulkMoveBodySchema ✓ |
| POST /tasks/bulk/archive | — | — | bulkIdsBodySchema ✓ |
| POST /tasks/bulk/unarchive | — | — | bulkIdsBodySchema ✓ |
| POST /tasks/bulk/delete | — | — | bulkIdsBodySchema ✓ |

**Status: PASS**

---

### comments.ts

| Route | Params | Query | Body |
|---|---|---|---|
| GET /tasks/:taskId/comments | cuidParam ✓ | — | (none) ✓ |
| POST /tasks/:taskId/comments | cuidParam ✓ | — | createCommentBodySchema ✓ |
| PATCH /comments/:id | cuidParam ✓ | — | updateCommentBodySchema ✓ |
| DELETE /comments/:id | cuidParam ✓ | — | (none) ✓ |

**Status: PASS**

---

### activity.ts

| Route | Params | Query | Body |
|---|---|---|---|
| GET /projects/:projectId/activity | cuidParam ✓ | listActivityQuerySchema ✓ | (none) ✓ |

**Status: PASS**

---

### tags.ts

| Route | Params | Query | Body |
|---|---|---|---|
| GET /tags | — | — | (none) ✓ |
| POST /tags | — | — | createTagBodySchema ✓ |
| DELETE /tags/:id | cuidParam ✓ | — | (none) ✓ |
| POST /tasks/:taskId/tags | cuidParam ✓ | — | attachTagsBodySchema ✓ |

**Status: PASS**

---

### views.ts

| Route | Params | Query | Body |
|---|---|---|---|
| GET /views | — | — | (none) ✓ |
| GET /projects/:projectId/views | cuidParam ✓ | — | (none) ✓ |
| POST /views | — | — | createViewBodySchema ✓ |
| PATCH /views/:id | cuidParam ✓ | — | updateViewBodySchema ✓ |
| DELETE /views/:id | cuidParam ✓ | — | (none) ✓ |

**Status: PASS**

---

### webhooks.ts

| Route | Params | Query | Body |
|---|---|---|---|
| POST /webhooks | — | — | createWebhookBodySchema ✓ |
| GET /webhooks | — | — | (none) ✓ |
| PATCH /webhooks/:id | cuidParam ✓ | — | updateWebhookBodySchema ✓ |
| POST /webhooks/:id/rotate-secret | cuidParam ✓ | — | (none) ✓ |
| POST /webhooks/:id/test | cuidParam ✓ | — | (none) ✓ |
| DELETE /webhooks/:id | cuidParam ✓ | — | (none) ✓ |

**Status: PASS**

---

### search.ts

| Route | Params | Query | Body |
|---|---|---|---|
| GET /search | — | searchQuerySchema ✓ | (none) ✓ |

**Status: PASS**

---

### reminders.ts

| Route | Params | Query | Body |
|---|---|---|---|
| GET /internal/reminders/due-today | — | — | (none) ✓ |
| GET /internal/reminders/overdue | — | — | (none) ✓ |

No user-supplied query parameters accepted — scope check is programmatic. PASS

**Status: PASS**

---

### api-tokens.ts

| Route | Params | Query | Body |
|---|---|---|---|
| POST /api-tokens | — | — | createApiTokenBodySchema ✓ |
| GET /api-tokens | — | — | (none) ✓ |
| DELETE /api-tokens/:id | cuidParam ✓ | — | (none) ✓ |

**Status: PASS**

---

### export.ts — FINDING (FIXED)

**Before fix**: Both export endpoints cast `request.query` to a raw TypeScript type with no Zod
validation. Invalid enum values (e.g. `status=INVALID`) were silently passed to Prisma; date
strings for `from`/`to` were not validated as ISO 8601 and could produce a Prisma runtime error.

**Fix applied**: Added `exportProjectTasksQuerySchema` and `exportAllTasksQuerySchema` in
`src/schemas/export.ts`. Both handlers now `.safeParse(request.query)` and return 400 on failure.

| Route | Params | Query | Body |
|---|---|---|---|
| GET /projects/:projectId/export/tasks.csv | cuidParam ✓ | exportProjectTasksQuerySchema ✓ (FIXED) | (none) ✓ |
| GET /export/tasks.csv | — | exportAllTasksQuerySchema ✓ (FIXED) | (none) ✓ |

**Status: FIXED**

---

## Conclusion

- 11 route files audited, covering all handlers.
- 1 gap found (export.ts query params) — fixed by adding Zod schemas in src/schemas/export.ts and applying them in the route handlers.
- 0 other gaps found.
