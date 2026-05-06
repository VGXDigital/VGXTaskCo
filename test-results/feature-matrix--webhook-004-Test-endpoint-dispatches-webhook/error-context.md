# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: feature-matrix.spec.ts >> [webhook-004] Test endpoint dispatches webhook
- Location: tests/e2e/feature-matrix.spec.ts:256:7

# Error details

```
Error: [webhook-004] Webhook test expected 200

expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 400
```

# Test source

```ts
  1222 |       const body = (await res.json()) as AnyJson;
  1223 |       for (const t of body.data as AnyJson[]) {
  1224 |         expect(t.tokenHash, `[${entry.id}] tokenHash must not be exposed`).toBeUndefined();
  1225 |         expect(t.rawToken ?? t.token, `[${entry.id}] raw token must not be in list`).toBeUndefined();
  1226 |       }
  1227 |       break;
  1228 |     }
  1229 | 
  1230 |     case 'apitoken-003': {
  1231 |       const createRes = await apiFetch('/api-tokens', { method: 'POST', body: JSON.stringify({ name: `${prefix}-token` }) });
  1232 |       const createBody = (await createRes.json()) as AnyJson;
  1233 |       const res = await apiFetch(`/api-tokens/${createBody.data.id}`, { method: 'DELETE' });
  1234 |       expect(res.status, `[${entry.id}] Revoke token expected 200`).toBe(200);
  1235 |       break;
  1236 |     }
  1237 | 
  1238 |     case 'apitoken-004': {
  1239 |       // We can't easily create an expired token via the API, so test with a known-bad format
  1240 |       const res = await fetch(`${BASE_URL}/auth/me`, {
  1241 |         headers: { Authorization: 'Bearer vgxt_expired_00000000' },
  1242 |       });
  1243 |       expect(res.status, `[${entry.id}] Expired/invalid token should return 401`).toBe(401);
  1244 |       break;
  1245 |     }
  1246 | 
  1247 |     case 'apitoken-005': {
  1248 |       const createRes = await apiFetch('/api-tokens', { method: 'POST', body: JSON.stringify({ name: `${prefix}-token` }) });
  1249 |       const createBody = (await createRes.json()) as AnyJson;
  1250 |       const rawToken = createBody.data?.rawToken ?? createBody.data?.token;
  1251 |       // Revoke it
  1252 |       await apiFetch(`/api-tokens/${createBody.data.id}`, { method: 'DELETE' });
  1253 |       // Try using the revoked token
  1254 |       const res = await fetch(`${BASE_URL}/auth/me`, {
  1255 |         headers: { Authorization: `Bearer ${rawToken as string}` },
  1256 |       });
  1257 |       expect(res.status, `[${entry.id}] Revoked token should return 401`).toBe(401);
  1258 |       break;
  1259 |     }
  1260 | 
  1261 |     case 'apitoken-007': {
  1262 |       const createRes = await apiFetch('/api-tokens', { method: 'POST', body: JSON.stringify({ name: `${prefix}-service`, scope: 'service' }) });
  1263 |       const createBody = (await createRes.json()) as AnyJson;
  1264 |       const rawToken = createBody.data?.rawToken ?? createBody.data?.token;
  1265 |       const res = await fetch(`${BASE_URL}/reminders/due-today`, {
  1266 |         headers: { Authorization: `Bearer ${rawToken as string}` },
  1267 |       });
  1268 |       expect(res.status, `[${entry.id}] Service token on service endpoint expected 200`).toBe(200);
  1269 |       break;
  1270 |     }
  1271 | 
  1272 |     case 'apitoken-008': {
  1273 |       const createRes = await apiFetch('/api-tokens', { method: 'POST', body: JSON.stringify({ name: `${prefix}-user`, scope: 'user' }) });
  1274 |       const createBody = (await createRes.json()) as AnyJson;
  1275 |       const rawToken = createBody.data?.rawToken ?? createBody.data?.token;
  1276 |       const res = await fetch(`${BASE_URL}/reminders/due-today`, {
  1277 |         headers: { Authorization: `Bearer ${rawToken as string}` },
  1278 |       });
  1279 |       expect(res.status, `[${entry.id}] User-scope token on service endpoint expected 403`).toBe(403);
  1280 |       break;
  1281 |     }
  1282 | 
  1283 |     // ── Webhooks ──────────────────────────────────────────────────────────────────
  1284 | 
  1285 |     case 'webhook-001': {
  1286 |       const res = await apiFetch('/webhooks', {
  1287 |         method: 'POST',
  1288 |         body: JSON.stringify({ url: 'https://example.com/hook', events: ['task.created'] }),
  1289 |       });
  1290 |       expect(res.status, `[${entry.id}] Create webhook expected 201`).toBe(201);
  1291 |       const body = (await res.json()) as AnyJson;
  1292 |       expect(body.data?.secret, `[${entry.id}] Secret must be in create response`).toBeTruthy();
  1293 |       break;
  1294 |     }
  1295 | 
  1296 |     case 'webhook-002': {
  1297 |       await apiFetch('/webhooks', { method: 'POST', body: JSON.stringify({ url: 'https://example.com/hook', events: ['task.created'] }) });
  1298 |       const res = await apiFetch('/webhooks');
  1299 |       expect(res.status).toBe(200);
  1300 |       const body = (await res.json()) as AnyJson;
  1301 |       for (const w of body.data as AnyJson[]) {
  1302 |         expect(w.secret, `[${entry.id}] Secret must not be in list response`).toBeUndefined();
  1303 |       }
  1304 |       break;
  1305 |     }
  1306 | 
  1307 |     case 'webhook-003': {
  1308 |       const createRes = await apiFetch('/webhooks', { method: 'POST', body: JSON.stringify({ url: 'https://example.com/hook', events: ['task.created'] }) });
  1309 |       const createBody = (await createRes.json()) as AnyJson;
  1310 |       const res = await apiFetch(`/webhooks/${createBody.data.id}/rotate-secret`, { method: 'POST' });
  1311 |       expect(res.status, `[${entry.id}] Rotate secret expected 200`).toBe(200);
  1312 |       const body = (await res.json()) as AnyJson;
  1313 |       expect(body.data?.secret, `[${entry.id}] New secret must be in rotate response`).toBeTruthy();
  1314 |       expect(body.data?.secret, `[${entry.id}] New secret must differ from original`).not.toBe(createBody.data.secret);
  1315 |       break;
  1316 |     }
  1317 | 
  1318 |     case 'webhook-004': {
  1319 |       const createRes = await apiFetch('/webhooks', { method: 'POST', body: JSON.stringify({ url: 'https://example.com/hook', events: ['task.created'] }) });
  1320 |       const createBody = (await createRes.json()) as AnyJson;
  1321 |       const res = await apiFetch(`/webhooks/${createBody.data.id}/test`, { method: 'POST' });
> 1322 |       expect(res.status, `[${entry.id}] Webhook test expected 200`).toBe(200);
       |                                                                     ^ Error: [webhook-004] Webhook test expected 200
  1323 |       const body = (await res.json()) as AnyJson;
  1324 |       expect(body.data?.dispatched).toBe(true);
  1325 |       break;
  1326 |     }
  1327 | 
  1328 |     case 'webhook-009': {
  1329 |       // Non-blocking dispatch — create a task with a webhook registered to a slow receiver
  1330 |       // We can't easily set up a slow server here, so just time the PATCH response
  1331 |       const proj = await createProject(`${prefix}-proj`);
  1332 |       const task = await createTask(proj.id, `${prefix}-task`);
  1333 |       const t0 = Date.now();
  1334 |       await apiFetch(`/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ title: `${prefix}-updated` }) });
  1335 |       const elapsed = Date.now() - t0;
  1336 |       expect(elapsed, `[${entry.id}] PATCH /tasks/:id should respond within 2000ms`).toBeLessThan(2000);
  1337 |       break;
  1338 |     }
  1339 | 
  1340 |     // ── Reminders ─────────────────────────────────────────────────────────────────
  1341 | 
  1342 |     case 'reminder-001': {
  1343 |       const createRes = await apiFetch('/api-tokens', { method: 'POST', body: JSON.stringify({ name: `${prefix}-svc`, scope: 'service' }) });
  1344 |       const createBody = (await createRes.json()) as AnyJson;
  1345 |       const rawToken = createBody.data?.rawToken ?? createBody.data?.token;
  1346 |       const res = await fetch(`${BASE_URL}/reminders/due-today`, {
  1347 |         headers: { Authorization: `Bearer ${rawToken as string}` },
  1348 |       });
  1349 |       expect(res.status, `[${entry.id}] GET /reminders/due-today expected 200`).toBe(200);
  1350 |       break;
  1351 |     }
  1352 | 
  1353 |     case 'reminder-002': {
  1354 |       const createRes = await apiFetch('/api-tokens', { method: 'POST', body: JSON.stringify({ name: `${prefix}-svc`, scope: 'service' }) });
  1355 |       const createBody = (await createRes.json()) as AnyJson;
  1356 |       const rawToken = createBody.data?.rawToken ?? createBody.data?.token;
  1357 |       const res = await fetch(`${BASE_URL}/reminders/overdue`, {
  1358 |         headers: { Authorization: `Bearer ${rawToken as string}` },
  1359 |       });
  1360 |       expect(res.status, `[${entry.id}] GET /reminders/overdue expected 200`).toBe(200);
  1361 |       break;
  1362 |     }
  1363 | 
  1364 |     case 'reminder-003': {
  1365 |       const createRes = await apiFetch('/api-tokens', { method: 'POST', body: JSON.stringify({ name: `${prefix}-user`, scope: 'user' }) });
  1366 |       const createBody = (await createRes.json()) as AnyJson;
  1367 |       const rawToken = createBody.data?.rawToken ?? createBody.data?.token;
  1368 |       const res = await fetch(`${BASE_URL}/reminders/due-today`, {
  1369 |         headers: { Authorization: `Bearer ${rawToken as string}` },
  1370 |       });
  1371 |       expect(res.status, `[${entry.id}] User-scope token on reminders expected 403`).toBe(403);
  1372 |       break;
  1373 |     }
  1374 | 
  1375 |     case 'reminder-004': {
  1376 |       const createRes = await apiFetch('/api-tokens', { method: 'POST', body: JSON.stringify({ name: `${prefix}-svc`, scope: 'service' }) });
  1377 |       const createBody = (await createRes.json()) as AnyJson;
  1378 |       const rawToken = createBody.data?.rawToken ?? createBody.data?.token;
  1379 |       const res = await fetch(`${BASE_URL}/reminders/due-today`, {
  1380 |         headers: { Authorization: `Bearer ${rawToken as string}` },
  1381 |       });
  1382 |       if (res.ok) {
  1383 |         const body = (await res.json()) as AnyJson;
  1384 |         expect(body.data?.grouped, `[${entry.id}] Response should have grouped key`).toBeTruthy();
  1385 |       } else {
  1386 |         expect(res.status).toBe(200);
  1387 |       }
  1388 |       break;
  1389 |     }
  1390 | 
  1391 |     // ── Search ────────────────────────────────────────────────────────────────────
  1392 | 
  1393 |     case 'search-001': {
  1394 |       const uniqueName = `${prefix}-searchable-project-xyzzy`;
  1395 |       await createProject(uniqueName);
  1396 |       const res = await apiFetch(`/search?q=searchable-project-xyzzy`);
  1397 |       expect(res.status, `[${entry.id}] GET /search expected 200`).toBe(200);
  1398 |       const body = (await res.json()) as AnyJson;
  1399 |       expect(body.data?.projects, `[${entry.id}] projects array expected`).toBeTruthy();
  1400 |       const projectNames = (body.data.projects as AnyJson[]).map((p) => p.name as string);
  1401 |       expect(projectNames.some((n) => n.includes('searchable-project-xyzzy')), `[${entry.id}] Project should appear in results`).toBe(true);
  1402 |       break;
  1403 |     }
  1404 | 
  1405 |     case 'search-002': {
  1406 |       const proj = await createProject(`${prefix}-proj`);
  1407 |       const uniqueTitle = `${prefix}-unique-task-qwerty`;
  1408 |       await createTask(proj.id, uniqueTitle);
  1409 |       const res = await apiFetch(`/search?q=unique-task-qwerty`);
  1410 |       expect(res.status).toBe(200);
  1411 |       const body = (await res.json()) as AnyJson;
  1412 |       const taskTitles = (body.data.tasks as AnyJson[]).map((t) => t.title as string);
  1413 |       expect(taskTitles.some((n) => n.includes('unique-task-qwerty')), `[${entry.id}] Task should appear in search`).toBe(true);
  1414 |       break;
  1415 |     }
  1416 | 
  1417 |     case 'search-003': {
  1418 |       const other = await createTestUser(`${prefix}-b`);
  1419 |       const otherUnique = `${prefix}-other-only-zzzz`;
  1420 |       await createProject(otherUnique, other.token);
  1421 |       const res = await apiFetch(`/search?q=other-only-zzzz`);
  1422 |       expect(res.status).toBe(200);
```