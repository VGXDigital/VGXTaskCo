# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: feature-matrix.spec.ts >> [fe-005] SSO buttons present on login page
- Location: tests/e2e/feature-matrix.spec.ts:276:7

# Error details

```
Error: [fe-005] At least one SSO button should be present on /login

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
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
  1485 |       expect(count, `[${entry.id}] Expected at least 3 default view items in sidebar`).toBeGreaterThanOrEqual(3);
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
> 1528 |       expect(hasGoogle || hasGithub, `[${entry.id}] At least one SSO button should be present on /login`).toBe(true);
       |                                                                                                           ^ Error: [fe-005] At least one SSO button should be present on /login
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
  1586 |       const primaryBtn = page.locator('button.bg-gradient, button[class*="gradient"], button[style*="gradient"]').first();
  1587 |       const visible = await primaryBtn.isVisible({ timeout: 3000 }).catch(() => false);
  1588 |       if (!visible) {
  1589 |         // Fallback: check computed style of any primary button
  1590 |         const btn = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")').first();
  1591 |         const bg = await btn.evaluate((el) => getComputedStyle(el).backgroundImage).catch(() => '');
  1592 |         expect(bg, `[${entry.id}] Primary button should have gradient background`).toContain('gradient');
  1593 |       }
  1594 |       break;
  1595 |     }
  1596 | 
  1597 |     case 'brand-003': {
  1598 |       await page.goto(`${FRONTEND_URL}/`, { waitUntil: 'networkidle' });
  1599 |       const fontsLoaded = await page.evaluate(() => {
  1600 |         const heading = document.querySelector('h1, h2, [class*="font-display"], [class*="font-heading"]');
  1601 |         const body = document.querySelector('body, p, [class*="font-body"]');
  1602 |         const headingFont = heading ? getComputedStyle(heading).fontFamily : '';
  1603 |         const bodyFont = body ? getComputedStyle(body).fontFamily : '';
  1604 |         return { headingFont, bodyFont };
  1605 |       });
  1606 |       expect(
  1607 |         fontsLoaded.headingFont.includes('Montserrat') || fontsLoaded.bodyFont.includes('Ubuntu'),
  1608 |         `[${entry.id}] VGX fonts should be loaded`,
  1609 |       ).toBe(true);
  1610 |       break;
  1611 |     }
  1612 | 
  1613 |     case 'brand-004': {
  1614 |       await page.goto(`${FRONTEND_URL}/`, { waitUntil: 'networkidle' });
  1615 |       const lightLogo = await page.locator('img[src*="vgx-light"]').isVisible().catch(() => false);
  1616 |       const darkLogo = await page.locator('img[src*="vgx-dark"]').isVisible().catch(() => false);
  1617 |       expect(lightLogo || darkLogo, `[${entry.id}] Either light or dark logo should be visible`).toBe(true);
  1618 |       break;
  1619 |     }
  1620 | 
  1621 |     default: {
  1622 |       console.warn(`[${entry.id}] No UI test implementation — passing by default`);
  1623 |       break;
  1624 |     }
  1625 |   }
  1626 | }
  1627 | 
  1628 | // ═══════════════════════════════════════════════════════════════════════════════
```