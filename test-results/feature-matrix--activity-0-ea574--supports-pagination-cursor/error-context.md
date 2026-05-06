# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: feature-matrix.spec.ts >> [activity-007] Activity list supports pagination cursor
- Location: tests/e2e/feature-matrix.spec.ts:256:7

# Error details

```
Error: [activity-007] GET /activity expected 200

expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 404
```

# Test source

```ts
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
> 1094 |       expect(res.status, `[${entry.id}] GET /activity expected 200`).toBe(200);
       |                                                                      ^ Error: [activity-007] GET /activity expected 200
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
  1127 |       const other = await createTestUser(`${prefix}-b`);
  1128 |       await apiFetch('/views', { method: 'POST', token: other.token, body: JSON.stringify({ name: `${prefix}-other`, scope: 'user', filter: {} }) });
  1129 |       const res = await apiFetch('/views');
  1130 |       expect(res.status).toBe(200);
  1131 |       const body = (await res.json()) as AnyJson;
  1132 |       for (const v of body.data as AnyJson[]) {
  1133 |         expect(v.ownerId, `[${entry.id}] Views must belong to caller`).toBe(auth.userId);
  1134 |       }
  1135 |       break;
  1136 |     }
  1137 | 
  1138 |     case 'views-005': {
  1139 |       const viewRes = await apiFetch('/views', { method: 'POST', body: JSON.stringify({ name: `${prefix}-view`, scope: 'user', filter: {} }) });
  1140 |       const viewBody = (await viewRes.json()) as AnyJson;
  1141 |       const res = await apiFetch(`/views/${viewBody.data.id}`, {
  1142 |         method: 'PATCH',
  1143 |         body: JSON.stringify({ name: `${prefix}-updated` }),
  1144 |       });
  1145 |       expect(res.status, `[${entry.id}] Update view expected 200`).toBe(200);
  1146 |       const body = (await res.json()) as AnyJson;
  1147 |       expect(body.data?.name).toBe(`${prefix}-updated`);
  1148 |       break;
  1149 |     }
  1150 | 
  1151 |     case 'views-006': {
  1152 |       const viewRes = await apiFetch('/views', { method: 'POST', body: JSON.stringify({ name: `${prefix}-view`, scope: 'user', filter: {} }) });
  1153 |       const viewBody = (await viewRes.json()) as AnyJson;
  1154 |       const res = await apiFetch(`/views/${viewBody.data.id}`, { method: 'DELETE' });
  1155 |       expect(res.status, `[${entry.id}] Delete view expected 200`).toBe(200);
  1156 |       break;
  1157 |     }
  1158 | 
  1159 |     case 'views-007': {
  1160 |       const proj = await createProject(`${prefix}-proj`);
  1161 |       const res = await apiFetch('/views', {
  1162 |         method: 'POST',
  1163 |         body: JSON.stringify({ name: `${prefix}-proj-view`, scope: 'project', projectId: proj.id, filter: {} }),
  1164 |       });
  1165 |       expect(res.status, `[${entry.id}] Project-scoped view expected 201`).toBe(201);
  1166 |       const body = (await res.json()) as AnyJson;
  1167 |       expect(body.data?.projectId).toBe(proj.id);
  1168 |       break;
  1169 |     }
  1170 | 
  1171 |     case 'views-008': {
  1172 |       const validValues = ['today', 'thisWeek', 'overdue', 'doneInLast7Days'];
  1173 |       for (const val of validValues) {
  1174 |         const res = await apiFetch('/views', {
  1175 |           method: 'POST',
  1176 |           body: JSON.stringify({ name: `${prefix}-view-${val}`, scope: 'user', filter: { dueWithin: val } }),
  1177 |         });
  1178 |         expect(res.status, `[${entry.id}] dueWithin=${val} should be accepted`).toBe(201);
  1179 |       }
  1180 |       const badRes = await apiFetch('/views', {
  1181 |         method: 'POST',
  1182 |         body: JSON.stringify({ name: `${prefix}-bad-view`, scope: 'user', filter: { dueWithin: 'lastMonth' } }),
  1183 |       });
  1184 |       expect(badRes.status, `[${entry.id}] Invalid dueWithin should return 400`).toBe(400);
  1185 |       break;
  1186 |     }
  1187 | 
  1188 |     // ── CSV export ────────────────────────────────────────────────────────────────
  1189 | 
  1190 |     case 'csv-004': {
  1191 |       const proj = await createProject(`${prefix}-proj`);
  1192 |       const res = await apiFetch(`/export/project/${proj.id}`);
  1193 |       // Accept 200 or 404 if no tasks (still tests the header)
  1194 |       if (res.status === 200) {
```