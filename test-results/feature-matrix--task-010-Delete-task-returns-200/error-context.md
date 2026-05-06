# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: feature-matrix.spec.ts >> [task-010] Delete task returns 200
- Location: tests/e2e/feature-matrix.spec.ts:256:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 400
```

# Test source

```ts
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
  668 |         body: JSON.stringify({ archivedAt: new Date().toISOString() }),
  669 |       });
  670 |       const res = await apiFetch(`/projects/${proj.id}/tasks?includeArchived=true`);
  671 |       expect(res.status).toBe(200);
  672 |       const body = (await res.json()) as AnyJson;
  673 |       const found = (body.data as AnyJson[]).find((t) => t.id === task.id);
  674 |       expect(found, `[${entry.id}] includeArchived=true should include archived task`).toBeTruthy();
  675 |       break;
  676 |     }
  677 | 
  678 |     case 'task-009': {
  679 |       const proj = await createProject(`${prefix}-proj`);
  680 |       const task = await createTask(proj.id, `${prefix}-orig`);
  681 |       const res = await apiFetch(`/tasks/${task.id}`, {
  682 |         method: 'PATCH',
  683 |         body: JSON.stringify({ title: `${prefix}-updated` }),
  684 |       });
  685 |       expect(res.status).toBe(200);
  686 |       const body = (await res.json()) as AnyJson;
  687 |       expect(body.data?.title).toBe(`${prefix}-updated`);
  688 |       break;
  689 |     }
  690 | 
  691 |     case 'task-010': {
  692 |       const proj = await createProject(`${prefix}-proj`);
  693 |       const task = await createTask(proj.id, `${prefix}-to-delete`);
  694 |       const res = await apiFetch(`/tasks/${task.id}`, { method: 'DELETE' });
> 695 |       expect(res.status).toBe(200);
      |                          ^ Error: expect(received).toBe(expected) // Object.is equality
  696 |       const body = (await res.json()) as AnyJson;
  697 |       expect(body.data?.deleted).toBe(true);
  698 |       break;
  699 |     }
  700 | 
  701 |     case 'task-011': {
  702 |       const other = await createTestUser(`${prefix}-b`);
  703 |       const otherProj = await createProject(`${prefix}-b-proj`, other.token);
  704 |       const otherTask = await createTask(otherProj.id, `${prefix}-other-task`, {}, other.token);
  705 |       const res = await apiFetch(`/tasks/${otherTask.id}`, {
  706 |         method: 'PATCH',
  707 |         body: JSON.stringify({ title: 'Hacked' }),
  708 |       });
  709 |       expect(res.status, `[${entry.id}] Cross-project task PATCH must return 404`).toBe(404);
  710 |       break;
  711 |     }
  712 | 
  713 |     case 'task-012': {
  714 |       const proj = await createProject(`${prefix}-proj`);
  715 |       const res = await apiFetch(`/projects/${proj.id}/tasks`, {
  716 |         method: 'POST',
  717 |         body: JSON.stringify({ title: `${prefix}-bad`, status: 'INVALID_STATUS' }),
  718 |       });
  719 |       expect(res.status, `[${entry.id}] Invalid status should return 400`).toBe(400);
  720 |       break;
  721 |     }
  722 | 
  723 |     case 'task-013': {
  724 |       const proj = await createProject(`${prefix}-proj`);
  725 |       const today = new Date().toISOString();
  726 |       const task = await createTask(proj.id, `${prefix}-task`, { dueDate: today });
  727 |       const res = await apiFetch(`/tasks/${task.id}`, {
  728 |         method: 'PATCH',
  729 |         body: JSON.stringify({ dueDate: null }),
  730 |       });
  731 |       expect(res.status).toBe(200);
  732 |       const body = (await res.json()) as AnyJson;
  733 |       expect(body.data?.dueDate, `[${entry.id}] dueDate should be null after clearing`).toBeNull();
  734 |       break;
  735 |     }
  736 | 
  737 |     case 'task-014': {
  738 |       const proj = await createProject(`${prefix}-proj`);
  739 |       const task = await createTask(proj.id, `${prefix}-task`);
  740 |       const archiveDate = new Date().toISOString();
  741 |       const archRes = await apiFetch(`/tasks/${task.id}`, {
  742 |         method: 'PATCH',
  743 |         body: JSON.stringify({ archivedAt: archiveDate }),
  744 |       });
  745 |       expect(archRes.status).toBe(200);
  746 |       const archBody = (await archRes.json()) as AnyJson;
  747 |       expect(archBody.data?.archivedAt, `[${entry.id}] archivedAt should be set`).toBeTruthy();
  748 | 
  749 |       const unarchRes = await apiFetch(`/tasks/${task.id}`, {
  750 |         method: 'PATCH',
  751 |         body: JSON.stringify({ archivedAt: null }),
  752 |       });
  753 |       expect(unarchRes.status).toBe(200);
  754 |       const unarchBody = (await unarchRes.json()) as AnyJson;
  755 |       expect(unarchBody.data?.archivedAt, `[${entry.id}] archivedAt should be null after unarchive`).toBeNull();
  756 |       break;
  757 |     }
  758 | 
  759 |     // ── Bulk ops ─────────────────────────────────────────────────────────────────
  760 | 
  761 |     case 'bulk-001': {
  762 |       const proj = await createProject(`${prefix}-proj`);
  763 |       const t1 = await createTask(proj.id, `${prefix}-t1`);
  764 |       const t2 = await createTask(proj.id, `${prefix}-t2`);
  765 |       const res = await apiFetch('/tasks/bulk/status', {
  766 |         method: 'POST',
  767 |         body: JSON.stringify({ ids: [t1.id, t2.id], status: 'DONE' }),
  768 |       });
  769 |       expect(res.status, `[${entry.id}] Bulk status expected 200`).toBe(200);
  770 |       const body = (await res.json()) as AnyJson;
  771 |       expect(body.data?.updated, `[${entry.id}] Updated count should be 2`).toBe(2);
  772 |       break;
  773 |     }
  774 | 
  775 |     case 'bulk-002': {
  776 |       const other = await createTestUser(`${prefix}-b`);
  777 |       const proj = await createProject(`${prefix}-proj`);
  778 |       const otherProj = await createProject(`${prefix}-b-proj`, other.token);
  779 |       const myTask = await createTask(proj.id, `${prefix}-mine`);
  780 |       const otherTask = await createTask(otherProj.id, `${prefix}-theirs`, {}, other.token);
  781 |       const res = await apiFetch('/tasks/bulk/status', {
  782 |         method: 'POST',
  783 |         body: JSON.stringify({ ids: [myTask.id, otherTask.id], status: 'DONE' }),
  784 |       });
  785 |       expect(res.status, `[${entry.id}] Mixed ownership bulk status should return 403`).toBe(403);
  786 |       const body = (await res.json()) as AnyJson;
  787 |       expect(body.unauthorizedIds, `[${entry.id}] unauthorizedIds should be populated`).toBeTruthy();
  788 |       break;
  789 |     }
  790 | 
  791 |     case 'bulk-003': {
  792 |       const proj1 = await createProject(`${prefix}-proj1`);
  793 |       const proj2 = await createProject(`${prefix}-proj2`);
  794 |       const t1 = await createTask(proj1.id, `${prefix}-t1`);
  795 |       const t2 = await createTask(proj1.id, `${prefix}-t2`);
```