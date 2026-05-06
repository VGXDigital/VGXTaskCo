# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: feature-matrix.spec.ts >> [proj-011] ownerId from body is ignored
- Location: tests/e2e/feature-matrix.spec.ts:256:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 201
Received: 400
```

# Test source

```ts
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
> 567 |       expect(res.status).toBe(201);
      |                          ^ Error: expect(received).toBe(expected) // Object.is equality
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
  619 |       const body = (await res.json()) as AnyJson;
  620 |       for (const t of body.data as AnyJson[]) {
  621 |         expect(t.priority, `[${entry.id}] Only HIGH priority`).toBe('HIGH');
  622 |       }
  623 |       break;
  624 |     }
  625 | 
  626 |     case 'task-005': {
  627 |       const proj = await createProject(`${prefix}-proj`);
  628 |       const today = new Date().toISOString().split('T')[0];
  629 |       await createTask(proj.id, `${prefix}-due-today`, { dueDate: `${today}T12:00:00.000Z` });
  630 |       const res = await apiFetch(`/projects/${proj.id}/tasks?dueWithin=today`);
  631 |       expect(res.status).toBe(200);
  632 |       const body = (await res.json()) as AnyJson;
  633 |       expect((body.data as AnyJson[]).length, `[${entry.id}] Should have at least 1 due-today task`).toBeGreaterThanOrEqual(1);
  634 |       break;
  635 |     }
  636 | 
  637 |     case 'task-006': {
  638 |       const proj = await createProject(`${prefix}-proj`);
  639 |       await createTask(proj.id, `${prefix}-searchable-unique-xyz`);
  640 |       const res = await apiFetch(`/projects/${proj.id}/tasks?search=searchable-unique-xyz`);
  641 |       expect(res.status).toBe(200);
  642 |       const body = (await res.json()) as AnyJson;
  643 |       expect((body.data as AnyJson[]).length, `[${entry.id}] Search should find the task`).toBeGreaterThanOrEqual(1);
  644 |       break;
  645 |     }
  646 | 
  647 |     case 'task-007': {
  648 |       const proj = await createProject(`${prefix}-proj`);
  649 |       const task = await createTask(proj.id, `${prefix}-archived`);
  650 |       await apiFetch(`/tasks/${task.id}`, {
  651 |         method: 'PATCH',
  652 |         body: JSON.stringify({ archivedAt: new Date().toISOString() }),
  653 |       });
  654 |       const res = await apiFetch(`/projects/${proj.id}/tasks`);
  655 |       expect(res.status).toBe(200);
  656 |       const body = (await res.json()) as AnyJson;
  657 |       const tasks = body.data as AnyJson[];
  658 |       const found = tasks.find((t) => t.id === task.id);
  659 |       expect(found, `[${entry.id}] Archived task must not appear by default`).toBeUndefined();
  660 |       break;
  661 |     }
  662 | 
  663 |     case 'task-008': {
  664 |       const proj = await createProject(`${prefix}-proj`);
  665 |       const task = await createTask(proj.id, `${prefix}-archived`);
  666 |       await apiFetch(`/tasks/${task.id}`, {
  667 |         method: 'PATCH',
```