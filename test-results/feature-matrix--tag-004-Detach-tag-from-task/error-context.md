# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: feature-matrix.spec.ts >> [tag-004] Detach tag from task
- Location: tests/e2e/feature-matrix.spec.ts:256:7

# Error details

```
Error: [tag-004] Detach tag expected 200

expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 400
```

# Test source

```ts
  847  |       expect(body.data?.updated, `[${entry.id}] Updated count should be 1`).toBe(1);
  848  |       break;
  849  |     }
  850  | 
  851  |     case 'bulk-007': {
  852  |       const proj = await createProject(`${prefix}-proj`);
  853  |       const t1 = await createTask(proj.id, `${prefix}-t1`);
  854  |       const t2 = await createTask(proj.id, `${prefix}-t2`);
  855  |       const res = await apiFetch('/tasks/bulk/delete', {
  856  |         method: 'POST',
  857  |         body: JSON.stringify({ ids: [t1.id, t2.id] }),
  858  |       });
  859  |       expect(res.status, `[${entry.id}] Bulk delete expected 200`).toBe(200);
  860  |       const body = (await res.json()) as AnyJson;
  861  |       expect(body.data?.deleted, `[${entry.id}] Deleted count should be 2`).toBe(2);
  862  |       break;
  863  |     }
  864  | 
  865  |     case 'bulk-008': {
  866  |       const tooManyIds = Array.from({ length: 501 }, (_, i) => `fake-id-${i}`);
  867  |       const res = await apiFetch('/tasks/bulk/status', {
  868  |         method: 'POST',
  869  |         body: JSON.stringify({ ids: tooManyIds, status: 'DONE' }),
  870  |       });
  871  |       expect(res.status, `[${entry.id}] >500 ids should return 400`).toBe(400);
  872  |       break;
  873  |     }
  874  | 
  875  |     case 'bulk-009': {
  876  |       const other = await createTestUser(`${prefix}-b`);
  877  |       const proj = await createProject(`${prefix}-proj`);
  878  |       const otherProj = await createProject(`${prefix}-b-proj`, other.token);
  879  |       const myTask = await createTask(proj.id, `${prefix}-mine`);
  880  |       const otherTask = await createTask(otherProj.id, `${prefix}-theirs`, {}, other.token);
  881  |       const res = await apiFetch('/tasks/bulk/archive', {
  882  |         method: 'POST',
  883  |         body: JSON.stringify({ ids: [myTask.id, otherTask.id] }),
  884  |       });
  885  |       expect(res.status, `[${entry.id}] Mixed ownership bulk archive should return 403`).toBe(403);
  886  |       break;
  887  |     }
  888  | 
  889  |     case 'bulk-010': {
  890  |       const other = await createTestUser(`${prefix}-b`);
  891  |       const proj = await createProject(`${prefix}-proj`);
  892  |       const otherProj = await createProject(`${prefix}-b-proj`, other.token);
  893  |       const myTask = await createTask(proj.id, `${prefix}-mine`);
  894  |       const otherTask = await createTask(otherProj.id, `${prefix}-theirs`, {}, other.token);
  895  |       const res = await apiFetch('/tasks/bulk/delete', {
  896  |         method: 'POST',
  897  |         body: JSON.stringify({ ids: [myTask.id, otherTask.id] }),
  898  |       });
  899  |       expect(res.status, `[${entry.id}] Mixed ownership bulk delete should return 403`).toBe(403);
  900  |       break;
  901  |     }
  902  | 
  903  |     // ── Tags ──────────────────────────────────────────────────────────────────────
  904  | 
  905  |     case 'tag-001': {
  906  |       const res = await apiFetch('/tags', {
  907  |         method: 'POST',
  908  |         body: JSON.stringify({ value: `${prefix}:high` }),
  909  |       });
  910  |       expect(res.status, `[${entry.id}] Create tag expected 201`).toBe(201);
  911  |       const body = (await res.json()) as AnyJson;
  912  |       expect(body.data?.id).toBeTruthy();
  913  |       expect(body.data?.value).toBe(`${prefix}:high`);
  914  |       break;
  915  |     }
  916  | 
  917  |     case 'tag-002': {
  918  |       await apiFetch('/tags', { method: 'POST', body: JSON.stringify({ value: `${prefix}:list-test` }) });
  919  |       const other = await createTestUser(`${prefix}-b`);
  920  |       await apiFetch('/tags', { method: 'POST', token: other.token, body: JSON.stringify({ value: `${prefix}:other-tag` }) });
  921  |       const res = await apiFetch('/tags');
  922  |       expect(res.status).toBe(200);
  923  |       const body = (await res.json()) as AnyJson;
  924  |       for (const t of body.data as AnyJson[]) {
  925  |         expect(t.ownerId, `[${entry.id}] Tags must belong to caller`).toBe(auth.userId);
  926  |       }
  927  |       break;
  928  |     }
  929  | 
  930  |     case 'tag-003': {
  931  |       const proj = await createProject(`${prefix}-proj`);
  932  |       const task = await createTask(proj.id, `${prefix}-task`);
  933  |       const tagRes = await apiFetch('/tags', { method: 'POST', body: JSON.stringify({ value: `${prefix}:attach` }) });
  934  |       const tagBody = (await tagRes.json()) as AnyJson;
  935  |       const res = await apiFetch(`/tasks/${task.id}/tags/${tagBody.data.id}`, { method: 'POST' });
  936  |       expect(res.status, `[${entry.id}] Attach tag expected 200`).toBe(200);
  937  |       break;
  938  |     }
  939  | 
  940  |     case 'tag-004': {
  941  |       const proj = await createProject(`${prefix}-proj`);
  942  |       const task = await createTask(proj.id, `${prefix}-task`);
  943  |       const tagRes = await apiFetch('/tags', { method: 'POST', body: JSON.stringify({ value: `${prefix}:detach` }) });
  944  |       const tagBody = (await tagRes.json()) as AnyJson;
  945  |       await apiFetch(`/tasks/${task.id}/tags/${tagBody.data.id}`, { method: 'POST' });
  946  |       const res = await apiFetch(`/tasks/${task.id}/tags/${tagBody.data.id}`, { method: 'DELETE' });
> 947  |       expect(res.status, `[${entry.id}] Detach tag expected 200`).toBe(200);
       |                                                                   ^ Error: [tag-004] Detach tag expected 200
  948  |       break;
  949  |     }
  950  | 
  951  |     case 'tag-005': {
  952  |       const other = await createTestUser(`${prefix}-b`);
  953  |       const otherTagRes = await apiFetch('/tags', { method: 'POST', token: other.token, body: JSON.stringify({ value: `${prefix}:other-cross` }) });
  954  |       const otherTagBody = (await otherTagRes.json()) as AnyJson;
  955  |       const proj = await createProject(`${prefix}-proj`);
  956  |       const task = await createTask(proj.id, `${prefix}-task`);
  957  |       const res = await apiFetch(`/tasks/${task.id}/tags/${otherTagBody.data.id}`, { method: 'POST' });
  958  |       expect([403, 404], `[${entry.id}] Cross-user tag attach must be blocked`).toContain(res.status);
  959  |       break;
  960  |     }
  961  | 
  962  |     case 'tag-006': {
  963  |       await apiFetch('/tags', { method: 'POST', body: JSON.stringify({ value: `${prefix}:unique` }) });
  964  |       const res2 = await apiFetch('/tags', { method: 'POST', body: JSON.stringify({ value: `${prefix}:unique` }) });
  965  |       expect(res2.status, `[${entry.id}] Duplicate tag value for same user should return 409`).toBe(409);
  966  |       break;
  967  |     }
  968  | 
  969  |     // ── Comments ─────────────────────────────────────────────────────────────────
  970  | 
  971  |     case 'comment-001': {
  972  |       const proj = await createProject(`${prefix}-proj`);
  973  |       const task = await createTask(proj.id, `${prefix}-task`);
  974  |       const res = await apiFetch(`/tasks/${task.id}/comments`, {
  975  |         method: 'POST',
  976  |         body: JSON.stringify({ body: 'Hello from test' }),
  977  |       });
  978  |       expect(res.status, `[${entry.id}] Create comment expected 201`).toBe(201);
  979  |       const body = (await res.json()) as AnyJson;
  980  |       expect(body.data?.id).toBeTruthy();
  981  |       expect(body.data?.authorId).toBe(auth.userId);
  982  |       break;
  983  |     }
  984  | 
  985  |     case 'comment-002': {
  986  |       const proj = await createProject(`${prefix}-proj`);
  987  |       const task = await createTask(proj.id, `${prefix}-task`);
  988  |       await apiFetch(`/tasks/${task.id}/comments`, { method: 'POST', body: JSON.stringify({ body: 'First' }) });
  989  |       await apiFetch(`/tasks/${task.id}/comments`, { method: 'POST', body: JSON.stringify({ body: 'Second' }) });
  990  |       const res = await apiFetch(`/tasks/${task.id}/comments`);
  991  |       expect(res.status).toBe(200);
  992  |       const body = (await res.json()) as AnyJson;
  993  |       const comments = body.data as AnyJson[];
  994  |       expect(comments.length).toBeGreaterThanOrEqual(2);
  995  |       // Check ascending order
  996  |       for (let i = 1; i < comments.length; i++) {
  997  |         expect(
  998  |           new Date(comments[i]!.createdAt).getTime(),
  999  |           `[${entry.id}] Comments should be ascending`,
  1000 |         ).toBeGreaterThanOrEqual(new Date(comments[i - 1]!.createdAt).getTime());
  1001 |       }
  1002 |       break;
  1003 |     }
  1004 | 
  1005 |     case 'comment-003': {
  1006 |       const proj = await createProject(`${prefix}-proj`);
  1007 |       const task = await createTask(proj.id, `${prefix}-task`);
  1008 |       const cRes = await apiFetch(`/tasks/${task.id}/comments`, { method: 'POST', body: JSON.stringify({ body: 'Original' }) });
  1009 |       const cBody = (await cRes.json()) as AnyJson;
  1010 |       const res = await apiFetch(`/comments/${cBody.data.id}`, {
  1011 |         method: 'PATCH',
  1012 |         body: JSON.stringify({ body: 'Updated' }),
  1013 |       });
  1014 |       expect(res.status, `[${entry.id}] Author edit expected 200`).toBe(200);
  1015 |       const body = (await res.json()) as AnyJson;
  1016 |       expect(body.data?.body).toBe('Updated');
  1017 |       break;
  1018 |     }
  1019 | 
  1020 |     case 'comment-004': {
  1021 |       const proj = await createProject(`${prefix}-proj`);
  1022 |       const task = await createTask(proj.id, `${prefix}-task`);
  1023 |       const cRes = await apiFetch(`/tasks/${task.id}/comments`, { method: 'POST', body: JSON.stringify({ body: 'Delete me' }) });
  1024 |       const cBody = (await cRes.json()) as AnyJson;
  1025 |       const res = await apiFetch(`/comments/${cBody.data.id}`, { method: 'DELETE' });
  1026 |       expect(res.status, `[${entry.id}] Author delete expected 200`).toBe(200);
  1027 |       break;
  1028 |     }
  1029 | 
  1030 |     case 'comment-005': {
  1031 |       // Project owner (auth user) deletes a comment by a different author
  1032 |       const commentAuthor = await createTestUser(`${prefix}-author`);
  1033 |       const proj = await createProject(`${prefix}-proj`); // owned by auth
  1034 |       const task = await createTask(proj.id, `${prefix}-task`);
  1035 |       // Grant author access to the task via their own project... not needed if API allows commenting
  1036 |       const cRes = await apiFetch(`/tasks/${task.id}/comments`, {
  1037 |         method: 'POST',
  1038 |         token: commentAuthor.token,
  1039 |         body: JSON.stringify({ body: 'Comment by other' }),
  1040 |       });
  1041 |       if (cRes.ok) {
  1042 |         const cBody = (await cRes.json()) as AnyJson;
  1043 |         const res = await apiFetch(`/comments/${cBody.data.id}`, { method: 'DELETE' });
  1044 |         expect(res.status, `[${entry.id}] Project owner should be able to delete comments`).toBe(200);
  1045 |       } else {
  1046 |         // If the API requires the user to be in the project, skip gracefully
  1047 |         console.warn(`[${entry.id}] Skipping — comment author couldn't post to cross-user task`);
```