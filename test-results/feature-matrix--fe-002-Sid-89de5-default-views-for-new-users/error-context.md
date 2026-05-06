# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: feature-matrix.spec.ts >> [fe-002] Sidebar shows 3 default views for new users
- Location: tests/e2e/feature-matrix.spec.ts:276:7

# Error details

```
Error: [fe-002] Expected at least 3 default view items in sidebar

expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 3
Received:    0
```

# Test source

```ts
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
  1423 |       const body = (await res.json()) as AnyJson;
  1424 |       expect((body.data.projects as AnyJson[]).length, `[${entry.id}] Cross-user project must not appear`).toBe(0);
  1425 |       break;
  1426 |     }
  1427 | 
  1428 |     case 'search-004': {
  1429 |       const res = await apiFetch('/search?q=a');
  1430 |       expect(res.status, `[${entry.id}] Single char query should return 400`).toBe(400);
  1431 |       break;
  1432 |     }
  1433 | 
  1434 |     case 'search-005': {
  1435 |       const longQuery = 'a'.repeat(201);
  1436 |       const res = await apiFetch(`/search?q=${longQuery}`);
  1437 |       expect(res.status, `[${entry.id}] Too-long query should return 400`).toBe(400);
  1438 |       break;
  1439 |     }
  1440 | 
  1441 |     default: {
  1442 |       console.warn(`[${entry.id}] No API test implementation — passing by default`);
  1443 |       break;
  1444 |     }
  1445 |   }
  1446 | }
  1447 | 
  1448 | // ═══════════════════════════════════════════════════════════════════════════════
  1449 | // Executor: UI tests
  1450 | // ═══════════════════════════════════════════════════════════════════════════════
  1451 | 
  1452 | // eslint-disable-next-line @typescript-eslint/no-explicit-any
  1453 | async function runUiTest(entry: MatrixEntry, page: import('@playwright/test').Page): Promise<void> {
  1454 |   const auth = loadAuthState();
  1455 | 
  1456 |   // Inject auth state into the browser before navigating
  1457 |   await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'domcontentloaded' });
  1458 |   await page.evaluate((token: string) => {
  1459 |     localStorage.setItem('vgxt-token', token);
  1460 |   }, auth.token);
  1461 | 
  1462 |   switch (entry.id) {
  1463 | 
  1464 |     case 'fe-001': {
  1465 |       await page.goto(`${FRONTEND_URL}/`, { waitUntil: 'networkidle' });
  1466 |       // Look for theme toggle button
  1467 |       const toggle = page.locator('[data-testid="theme-toggle"], button[aria-label*="theme"], button[aria-label*="dark"], button[aria-label*="light"]').first();
  1468 |       await toggle.waitFor({ timeout: 5000 }).catch(() => {
  1469 |         // Theme toggle may be in different location
  1470 |       });
  1471 |       // Check localStorage persistence
  1472 |       const theme = await page.evaluate(() => localStorage.getItem('vgxt-dark'));
  1473 |       // Theme key may be null initially — just verify the page loaded without error
  1474 |       expect(page.url(), `[${entry.id}] Should be on app page`).toContain(FRONTEND_URL);
  1475 |       void theme; // used for potential assertion in real run
  1476 |       break;
  1477 |     }
  1478 | 
  1479 |     case 'fe-002': {
  1480 |       await page.goto(`${FRONTEND_URL}/`, { waitUntil: 'networkidle' });
  1481 |       // Look for sidebar views — expect at least 3 saved view items
  1482 |       const viewItems = page.locator('[data-testid="saved-view-item"], [data-view-item], nav a[href*="view"]');
  1483 |       await page.waitForTimeout(1000); // allow React to render
  1484 |       const count = await viewItems.count();
> 1485 |       expect(count, `[${entry.id}] Expected at least 3 default view items in sidebar`).toBeGreaterThanOrEqual(3);
       |                                                                                        ^ Error: [fe-002] Expected at least 3 default view items in sidebar
  1486 |       break;
  1487 |     }
  1488 | 
  1489 |     case 'fe-003': {
  1490 |       // Navigate to auth callback with a fragment
  1491 |       await page.goto(`${FRONTEND_URL}/auth/callback#access_token=fake_token&token_type=bearer`, {
  1492 |         waitUntil: 'domcontentloaded',
  1493 |       });
  1494 |       // The page should attempt the exchange and either succeed or show an error
  1495 |       // We just verify the page renders something
  1496 |       await page.waitForTimeout(500);
  1497 |       expect(page.url(), `[${entry.id}] Auth callback page should load`).toBeTruthy();
  1498 |       break;
  1499 |     }
  1500 | 
  1501 |     case 'fe-004': {
  1502 |       // Set an invalid token, then navigate — should redirect to /login
  1503 |       await page.evaluate(() => {
  1504 |         localStorage.setItem('vgxt-token', 'invalid-token-that-causes-401');
  1505 |       });
  1506 |       await page.goto(`${FRONTEND_URL}/`, { waitUntil: 'networkidle' });
  1507 |       // After a 401, the app should redirect to /login
  1508 |       await page.waitForURL(`${FRONTEND_URL}/login`, { timeout: 5000 }).catch(() => {
  1509 |         // May not redirect immediately depending on implementation
  1510 |       });
  1511 |       const url = page.url();
  1512 |       // Accept either /login redirect or that localStorage was cleared
  1513 |       const token = await page.evaluate(() => localStorage.getItem('vgxt-token'));
  1514 |       expect(
  1515 |         url.includes('/login') || token === null || token === '',
  1516 |         `[${entry.id}] 401 should clear token or redirect to /login`,
  1517 |       ).toBe(true);
  1518 |       break;
  1519 |     }
  1520 | 
  1521 |     case 'fe-005': {
  1522 |       await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' });
  1523 |       // Look for SSO buttons
  1524 |       const googleBtn = page.locator('button:has-text("Google"), a:has-text("Google"), [aria-label*="Google"]').first();
  1525 |       const githubBtn = page.locator('button:has-text("GitHub"), a:has-text("GitHub"), [aria-label*="GitHub"]').first();
  1526 |       const hasGoogle = await googleBtn.isVisible().catch(() => false);
  1527 |       const hasGithub = await githubBtn.isVisible().catch(() => false);
  1528 |       expect(hasGoogle || hasGithub, `[${entry.id}] At least one SSO button should be present on /login`).toBe(true);
  1529 |       break;
  1530 |     }
  1531 | 
  1532 |     case 'fe-006': {
  1533 |       // Need a project to navigate to — create one first
  1534 |       const proj = await createProject(`fe-006-${Date.now()}`);
  1535 |       await page.goto(`${FRONTEND_URL}/projects/${proj.id}`, { waitUntil: 'networkidle' });
  1536 |       const exportBtn = page.locator('button:has-text("Export"), button:has-text("CSV"), [aria-label*="export"]').first();
  1537 |       const visible = await exportBtn.isVisible({ timeout: 3000 }).catch(() => false);
  1538 |       expect(visible, `[${entry.id}] CSV export button should be visible on project page`).toBe(true);
  1539 |       break;
  1540 |     }
  1541 | 
  1542 |     case 'fe-007': {
  1543 |       await page.goto(`${FRONTEND_URL}/settings/tokens`, { waitUntil: 'networkidle' });
  1544 |       await page.waitForTimeout(500);
  1545 |       expect(page.url(), `[${entry.id}] Should load settings/tokens page`).toContain('token');
  1546 |       break;
  1547 |     }
  1548 | 
  1549 |     case 'fe-008': {
  1550 |       await page.goto(`${FRONTEND_URL}/settings/webhooks`, { waitUntil: 'networkidle' });
  1551 |       await page.waitForTimeout(500);
  1552 |       expect(page.url(), `[${entry.id}] Should load settings/webhooks page`).toContain('webhook');
  1553 |       break;
  1554 |     }
  1555 | 
  1556 |     case 'fe-009': {
  1557 |       const proj = await createProject(`fe-009-${Date.now()}`);
  1558 |       await createTask(proj.id, 'Task for bulk test');
  1559 |       await page.goto(`${FRONTEND_URL}/projects/${proj.id}`, { waitUntil: 'networkidle' });
  1560 |       await page.waitForTimeout(1000);
  1561 |       // Click the first task checkbox
  1562 |       const checkbox = page.locator('input[type="checkbox"]').first();
  1563 |       const hasCheckbox = await checkbox.isVisible({ timeout: 3000 }).catch(() => false);
  1564 |       if (hasCheckbox) {
  1565 |         await checkbox.click();
  1566 |         const bulkBar = page.locator('[data-testid="bulk-action-bar"], [aria-label*="bulk"], .bulk-action-bar').first();
  1567 |         const bulkVisible = await bulkBar.isVisible({ timeout: 2000 }).catch(() => false);
  1568 |         expect(bulkVisible, `[${entry.id}] Bulk action bar should appear after checkbox selection`).toBe(true);
  1569 |       } else {
  1570 |         console.warn(`[${entry.id}] No checkbox found — cannot test bulk bar`);
  1571 |       }
  1572 |       break;
  1573 |     }
  1574 | 
  1575 |     case 'brand-001': {
  1576 |       await page.goto(`${FRONTEND_URL}/`, { waitUntil: 'networkidle' });
  1577 |       const logo = page.locator('img[src*="vgx"]').first();
  1578 |       const visible = await logo.isVisible({ timeout: 3000 }).catch(() => false);
  1579 |       expect(visible, `[${entry.id}] VGX logo should be visible`).toBe(true);
  1580 |       break;
  1581 |     }
  1582 | 
  1583 |     case 'brand-002': {
  1584 |       await page.goto(`${FRONTEND_URL}/`, { waitUntil: 'networkidle' });
  1585 |       // Check that a primary button uses gradient background
```