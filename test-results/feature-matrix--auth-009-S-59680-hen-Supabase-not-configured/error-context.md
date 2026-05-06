# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: feature-matrix.spec.ts >> [auth-009] SSO exchange returns 503 when Supabase not configured
- Location: tests/e2e/feature-matrix.spec.ts:256:7

# Error details

```
Error: [auth-009] SSO without config: expected 401 or 503

expect(received).toContain(expected) // indexOf

Expected value: 400
Received array: [401, 503]
```

# Test source

```ts
  342 |         try {
  343 |           await runWebhookTest(entry);
  344 |         } catch (e) {
  345 |           status = 'fail';
  346 |           error = String(e);
  347 |           throw e;
  348 |         } finally {
  349 |           addReport({ id: entry.id, category: entry.category, feature: entry.feature, criticality: entry.criticality, status, error, durationMs: Date.now() - t0 });
  350 |         }
  351 |       });
  352 |       break;
  353 |     }
  354 |   }
  355 | }
  356 | 
  357 | // ═══════════════════════════════════════════════════════════════════════════════
  358 | // Executor: API tests
  359 | // ═══════════════════════════════════════════════════════════════════════════════
  360 | 
  361 | // eslint-disable-next-line @typescript-eslint/no-explicit-any
  362 | type AnyJson = Record<string, any>;
  363 | 
  364 | async function runApiTest(entry: MatrixEntry): Promise<void> {
  365 |   const prefix = `feat-${entry.id}-${Date.now()}`;
  366 |   const auth = loadAuthState();
  367 | 
  368 |   switch (entry.id) {
  369 | 
  370 |     // ── Auth ────────────────────────────────────────────────────────────────────
  371 | 
  372 |     case 'auth-001': {
  373 |       const email = `${prefix}@vgxtaskco.test`;
  374 |       const res = await fetch(`${BASE_URL}/auth/register`, {
  375 |         method: 'POST',
  376 |         headers: { 'Content-Type': 'application/json' },
  377 |         body: JSON.stringify({ email, password: 'ValidPass!!2026', name: 'Test User' }),
  378 |       });
  379 |       expect(res.status, `[${entry.id}] Expected 201 from POST /auth/register`).toBe(201);
  380 |       const body = (await res.json()) as AnyJson;
  381 |       expect(body.data?.token, `[${entry.id}] token missing`).toBeTruthy();
  382 |       expect(body.data?.user?.id, `[${entry.id}] user.id missing`).toBeTruthy();
  383 |       expect(body.data?.user?.email, `[${entry.id}] user.email missing`).toBe(email);
  384 |       expect(body.data?.user?.passwordHash, `[${entry.id}] passwordHash must not be in response`).toBeUndefined();
  385 |       break;
  386 |     }
  387 | 
  388 |     case 'auth-002': {
  389 |       const email = `${prefix}@vgxtaskco.test`;
  390 |       await fetch(`${BASE_URL}/auth/register`, {
  391 |         method: 'POST',
  392 |         headers: { 'Content-Type': 'application/json' },
  393 |         body: JSON.stringify({ email, password: 'ValidPass!!2026', name: 'Test' }),
  394 |       });
  395 |       const res = await fetch(`${BASE_URL}/auth/login`, {
  396 |         method: 'POST',
  397 |         headers: { 'Content-Type': 'application/json' },
  398 |         body: JSON.stringify({ email, password: 'ValidPass!!2026' }),
  399 |       });
  400 |       expect(res.status, `[${entry.id}] Expected 200 from login`).toBe(200);
  401 |       const body = (await res.json()) as AnyJson;
  402 |       expect(body.data?.token).toBeTruthy();
  403 |       const badRes = await fetch(`${BASE_URL}/auth/login`, {
  404 |         method: 'POST',
  405 |         headers: { 'Content-Type': 'application/json' },
  406 |         body: JSON.stringify({ email, password: 'WrongPassword!' }),
  407 |       });
  408 |       expect(badRes.status, `[${entry.id}] Wrong password should return 401`).toBe(401);
  409 |       break;
  410 |     }
  411 | 
  412 |     case 'auth-003': {
  413 |       const res = await apiFetch('/auth/me');
  414 |       expect(res.status, `[${entry.id}] Expected 200 from GET /auth/me`).toBe(200);
  415 |       const body = (await res.json()) as AnyJson;
  416 |       expect(body.data?.id).toBeTruthy();
  417 |       expect(body.data?.email).toBeTruthy();
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
> 442 |       expect([401, 503], `[${entry.id}] SSO without config: expected 401 or 503`).toContain(res.status);
      |                                                                                   ^ Error: [auth-009] SSO without config: expected 401 or 503
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
  518 |       expect(res.status, `[${entry.id}] Expected 200`).toBe(200);
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
```