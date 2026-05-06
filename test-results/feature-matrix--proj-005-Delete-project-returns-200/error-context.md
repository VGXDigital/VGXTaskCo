# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: feature-matrix.spec.ts >> [proj-005] Delete project returns 200
- Location: tests/e2e/feature-matrix.spec.ts:256:7

# Error details

```
Error: [proj-005] Expected 200

expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 400
```

# Test source

```ts
  418 |       const noAuthRes = await fetch(`${BASE_URL}/auth/me`);
  419 |       expect(noAuthRes.status, `[${entry.id}] No token should return 401`).toBe(401);
  420 |       break;
  421 |     }
  422 | 
  423 |     case 'auth-004': {
  424 |       // Use a clearly expired JWT (signed in the past)
  425 |       // We can't easily forge a signed JWT here without the secret,
  426 |       // so we use a malformed token and assert 401.
  427 |       const res = await fetch(`${BASE_URL}/auth/me`, {
  428 |         headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ4IiwiZXhwIjoxfQ.invalid' },
  429 |       });
  430 |       expect(res.status, `[${entry.id}] Expired/invalid JWT should return 401`).toBe(401);
  431 |       break;
  432 |     }
  433 | 
  434 |     case 'auth-009': {
  435 |       // SSO exchange when Supabase not configured — this is environment-dependent.
  436 |       // We always send a request and expect either 503 (not configured) or 401 (invalid token).
  437 |       const res = await fetch(`${BASE_URL}/auth/sso/exchange`, {
  438 |         method: 'POST',
  439 |         headers: { 'Content-Type': 'application/json' },
  440 |         body: JSON.stringify({ accessToken: 'fake-token', provider: 'google' }),
  441 |       });
  442 |       expect([401, 503], `[${entry.id}] SSO without config: expected 401 or 503`).toContain(res.status);
  443 |       break;
  444 |     }
  445 | 
  446 |     case 'auth-011': {
  447 |       const res = await fetch(`${BASE_URL}/auth/register`, {
  448 |         method: 'POST',
  449 |         headers: { 'Content-Type': 'application/json' },
  450 |         body: JSON.stringify({ email: `${prefix}@test.test`, password: 'short', name: 'X' }),
  451 |       });
  452 |       expect(res.status, `[${entry.id}] Short password should return 400`).toBe(400);
  453 |       break;
  454 |     }
  455 | 
  456 |     case 'auth-012': {
  457 |       const email = auth.email; // already registered
  458 |       const res = await fetch(`${BASE_URL}/auth/register`, {
  459 |         method: 'POST',
  460 |         headers: { 'Content-Type': 'application/json' },
  461 |         body: JSON.stringify({ email, password: 'ValidPass!!2026', name: 'Dup' }),
  462 |       });
  463 |       expect(res.status, `[${entry.id}] Duplicate email should return 409`).toBe(409);
  464 |       break;
  465 |     }
  466 | 
  467 |     // ── Projects ────────────────────────────────────────────────────────────────
  468 | 
  469 |     case 'proj-001': {
  470 |       const res = await apiFetch('/projects', {
  471 |         method: 'POST',
  472 |         body: JSON.stringify({ name: `${prefix}-proj`, description: 'Test' }),
  473 |       });
  474 |       expect(res.status, `[${entry.id}] Expected 201`).toBe(201);
  475 |       const body = (await res.json()) as AnyJson;
  476 |       expect(body.data?.id).toBeTruthy();
  477 |       expect(body.data?.ownerId).toBe(auth.userId);
  478 |       break;
  479 |     }
  480 | 
  481 |     case 'proj-002': {
  482 |       const other = await createTestUser(`${prefix}-other`);
  483 |       await createProject(`${prefix}-other-proj`, other.token);
  484 |       const res = await apiFetch('/projects');
  485 |       expect(res.status, `[${entry.id}] Expected 200`).toBe(200);
  486 |       const body = (await res.json()) as AnyJson;
  487 |       const projects = body.data as AnyJson[];
  488 |       for (const p of projects) {
  489 |         expect(p.ownerId, `[${entry.id}] Project from other user must not appear`).toBe(auth.userId);
  490 |       }
  491 |       break;
  492 |     }
  493 | 
  494 |     case 'proj-003': {
  495 |       const proj = await createProject(`${prefix}-proj`);
  496 |       const res = await apiFetch(`/projects/${proj.id}`);
  497 |       expect(res.status, `[${entry.id}] Expected 200`).toBe(200);
  498 |       const body = (await res.json()) as AnyJson;
  499 |       expect(body.data?.id).toBe(proj.id);
  500 |       break;
  501 |     }
  502 | 
  503 |     case 'proj-004': {
  504 |       const proj = await createProject(`${prefix}-proj`);
  505 |       const res = await apiFetch(`/projects/${proj.id}`, {
  506 |         method: 'PATCH',
  507 |         body: JSON.stringify({ name: `${prefix}-updated` }),
  508 |       });
  509 |       expect(res.status, `[${entry.id}] Expected 200`).toBe(200);
  510 |       const body = (await res.json()) as AnyJson;
  511 |       expect(body.data?.name).toBe(`${prefix}-updated`);
  512 |       break;
  513 |     }
  514 | 
  515 |     case 'proj-005': {
  516 |       const proj = await createProject(`${prefix}-proj`);
  517 |       const res = await apiFetch(`/projects/${proj.id}`, { method: 'DELETE' });
> 518 |       expect(res.status, `[${entry.id}] Expected 200`).toBe(200);
      |                                                        ^ Error: [proj-005] Expected 200
  519 |       const body = (await res.json()) as AnyJson;
  520 |       expect(body.data?.deleted).toBe(true);
  521 |       break;
  522 |     }
  523 | 
  524 |     case 'proj-006': {
  525 |       const other = await createTestUser(`${prefix}-b`);
  526 |       const otherProj = await createProject(`${prefix}-b-proj`, other.token);
  527 |       const res = await apiFetch(`/projects/${otherProj.id}`);
  528 |       expect(res.status, `[${entry.id}] Cross-user GET must return 404`).toBe(404);
  529 |       break;
  530 |     }
  531 | 
  532 |     case 'proj-007': {
  533 |       const other = await createTestUser(`${prefix}-b`);
  534 |       const otherProj = await createProject(`${prefix}-b-proj`, other.token);
  535 |       const res = await apiFetch(`/projects/${otherProj.id}`, {
  536 |         method: 'PATCH',
  537 |         body: JSON.stringify({ name: 'Hacked' }),
  538 |       });
  539 |       expect(res.status, `[${entry.id}] Cross-user PATCH must return 404`).toBe(404);
  540 |       break;
  541 |     }
  542 | 
  543 |     case 'proj-008': {
  544 |       const other = await createTestUser(`${prefix}-b`);
  545 |       const otherProj = await createProject(`${prefix}-b-proj`, other.token);
  546 |       const res = await apiFetch(`/projects/${otherProj.id}`, { method: 'DELETE' });
  547 |       expect(res.status, `[${entry.id}] Cross-user DELETE must return 404`).toBe(404);
  548 |       break;
  549 |     }
  550 | 
  551 |     case 'proj-010': {
  552 |       const res = await apiFetch('/projects', {
  553 |         method: 'POST',
  554 |         body: JSON.stringify({ name: `${prefix}-no-color` }),
  555 |       });
  556 |       expect(res.status).toBe(201);
  557 |       const body = (await res.json()) as AnyJson;
  558 |       expect(body.data?.color, `[${entry.id}] Default color should be set`).toBeTruthy();
  559 |       break;
  560 |     }
  561 | 
  562 |     case 'proj-011': {
  563 |       const res = await apiFetch('/projects', {
  564 |         method: 'POST',
  565 |         body: JSON.stringify({ name: `${prefix}-proj`, ownerId: 'attacker-id' }),
  566 |       });
  567 |       expect(res.status).toBe(201);
  568 |       const body = (await res.json()) as AnyJson;
  569 |       expect(body.data?.ownerId, `[${entry.id}] ownerId must be caller's id, not from body`).toBe(auth.userId);
  570 |       break;
  571 |     }
  572 | 
  573 |     // ── Tasks ────────────────────────────────────────────────────────────────────
  574 | 
  575 |     case 'task-001': {
  576 |       const proj = await createProject(`${prefix}-proj`);
  577 |       const res = await apiFetch(`/projects/${proj.id}/tasks`, {
  578 |         method: 'POST',
  579 |         body: JSON.stringify({ title: `${prefix}-task` }),
  580 |       });
  581 |       expect(res.status, `[${entry.id}] Expected 201`).toBe(201);
  582 |       const body = (await res.json()) as AnyJson;
  583 |       expect(body.data?.id).toBeTruthy();
  584 |       expect(body.data?.projectId).toBe(proj.id);
  585 |       break;
  586 |     }
  587 | 
  588 |     case 'task-002': {
  589 |       const proj = await createProject(`${prefix}-proj`);
  590 |       await createTask(proj.id, `${prefix}-task-1`);
  591 |       await createTask(proj.id, `${prefix}-task-2`);
  592 |       const res = await apiFetch(`/projects/${proj.id}/tasks`);
  593 |       expect(res.status, `[${entry.id}] Expected 200`).toBe(200);
  594 |       const body = (await res.json()) as AnyJson;
  595 |       expect(Array.isArray(body.data)).toBe(true);
  596 |       expect((body.data as AnyJson[]).length).toBeGreaterThanOrEqual(2);
  597 |       break;
  598 |     }
  599 | 
  600 |     case 'task-003': {
  601 |       const proj = await createProject(`${prefix}-proj`);
  602 |       await createTask(proj.id, `${prefix}-todo`, { status: 'TODO' });
  603 |       await createTask(proj.id, `${prefix}-done`, { status: 'DONE' });
  604 |       const res = await apiFetch(`/projects/${proj.id}/tasks?status=TODO`);
  605 |       expect(res.status).toBe(200);
  606 |       const body = (await res.json()) as AnyJson;
  607 |       for (const t of body.data as AnyJson[]) {
  608 |         expect(t.status, `[${entry.id}] Only TODO tasks should be returned`).toBe('TODO');
  609 |       }
  610 |       break;
  611 |     }
  612 | 
  613 |     case 'task-004': {
  614 |       const proj = await createProject(`${prefix}-proj`);
  615 |       await createTask(proj.id, `${prefix}-high`, { priority: 'HIGH' });
  616 |       await createTask(proj.id, `${prefix}-low`, { priority: 'LOW' });
  617 |       const res = await apiFetch(`/projects/${proj.id}/tasks?priority=HIGH`);
  618 |       expect(res.status).toBe(200);
```