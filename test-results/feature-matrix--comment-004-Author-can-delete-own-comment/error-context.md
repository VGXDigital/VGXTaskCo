# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: feature-matrix.spec.ts >> [comment-004] Author can delete own comment
- Location: tests/e2e/feature-matrix.spec.ts:256:7

# Error details

```
Error: [comment-004] Author delete expected 200

expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 400
```

# Test source

```ts
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
  947  |       expect(res.status, `[${entry.id}] Detach tag expected 200`).toBe(200);
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
> 1026 |       expect(res.status, `[${entry.id}] Author delete expected 200`).toBe(200);
       |                                                                      ^ Error: [comment-004] Author delete expected 200
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
  1048 |       }
  1049 |       break;
  1050 |     }
  1051 | 
  1052 |     case 'comment-006': {
  1053 |       const other = await createTestUser(`${prefix}-b`);
  1054 |       const proj = await createProject(`${prefix}-proj`);
  1055 |       const task = await createTask(proj.id, `${prefix}-task`);
  1056 |       const cRes = await apiFetch(`/tasks/${task.id}/comments`, { method: 'POST', body: JSON.stringify({ body: 'Mine' }) });
  1057 |       const cBody = (await cRes.json()) as AnyJson;
  1058 |       const res = await apiFetch(`/comments/${cBody.data.id}`, {
  1059 |         method: 'PATCH',
  1060 |         token: other.token,
  1061 |         body: JSON.stringify({ body: 'Hacked' }),
  1062 |       });
  1063 |       expect(res.status, `[${entry.id}] Non-author edit must return 403`).toBe(403);
  1064 |       break;
  1065 |     }
  1066 | 
  1067 |     case 'comment-007': {
  1068 |       // Project owner tries to EDIT (not delete) a comment by another author
  1069 |       const commentAuthor = await createTestUser(`${prefix}-author`);
  1070 |       const proj = await createProject(`${prefix}-proj`);
  1071 |       const task = await createTask(proj.id, `${prefix}-task`);
  1072 |       const cRes = await apiFetch(`/tasks/${task.id}/comments`, {
  1073 |         method: 'POST',
  1074 |         token: commentAuthor.token,
  1075 |         body: JSON.stringify({ body: 'Comment by author' }),
  1076 |       });
  1077 |       if (cRes.ok) {
  1078 |         const cBody = (await cRes.json()) as AnyJson;
  1079 |         const res = await apiFetch(`/comments/${cBody.data.id}`, {
  1080 |           method: 'PATCH',
  1081 |           body: JSON.stringify({ body: 'Owner edit attempt' }),
  1082 |         });
  1083 |         expect(res.status, `[${entry.id}] Project owner editing other's comment must return 403`).toBe(403);
  1084 |       } else {
  1085 |         console.warn(`[${entry.id}] Skipping — comment author couldn't post`);
  1086 |       }
  1087 |       break;
  1088 |     }
  1089 | 
  1090 |     // ── Activity ──────────────────────────────────────────────────────────────────
  1091 | 
  1092 |     case 'activity-007': {
  1093 |       const res = await apiFetch('/activity?limit=2');
  1094 |       expect(res.status, `[${entry.id}] GET /activity expected 200`).toBe(200);
  1095 |       const body = (await res.json()) as AnyJson;
  1096 |       expect(Array.isArray(body.data)).toBe(true);
  1097 |       // nextCursor might be null if fewer than 2 entries, that's fine
  1098 |       break;
  1099 |     }
  1100 | 
  1101 |     case 'activity-008': {
  1102 |       const proj = await createProject(`${prefix}-proj`);
  1103 |       const res = await apiFetch(`/activity?subjectId=${proj.id}&subjectType=project`);
  1104 |       expect(res.status, `[${entry.id}] GET /activity with filter expected 200`).toBe(200);
  1105 |       const body = (await res.json()) as AnyJson;
  1106 |       for (const a of body.data as AnyJson[]) {
  1107 |         expect(a.subjectId, `[${entry.id}] Filter by subjectId`).toBe(proj.id);
  1108 |       }
  1109 |       break;
  1110 |     }
  1111 | 
  1112 |     // ── Saved views ───────────────────────────────────────────────────────────────
  1113 | 
  1114 |     case 'views-003': {
  1115 |       const res = await apiFetch('/views', {
  1116 |         method: 'POST',
  1117 |         body: JSON.stringify({ name: `${prefix}-view`, scope: 'user', filter: { status: 'TODO' } }),
  1118 |       });
  1119 |       expect(res.status, `[${entry.id}] Create view expected 201`).toBe(201);
  1120 |       const body = (await res.json()) as AnyJson;
  1121 |       expect(body.data?.id).toBeTruthy();
  1122 |       expect(body.data?.ownerId).toBe(auth.userId);
  1123 |       break;
  1124 |     }
  1125 | 
  1126 |     case 'views-004': {
```