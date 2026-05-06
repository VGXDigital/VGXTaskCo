# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: feature-matrix.spec.ts >> [audit-012] webhook.deleted audit event recorded
- Location: tests/e2e/feature-matrix.spec.ts:297:7

# Error details

```
Error: [audit-012] Webhook deletion must succeed

expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 400
```

# Test source

```ts
  1804 |       console.warn(`[${entry.id}] No DB test implementation — passing by default`);
  1805 |       break;
  1806 |     }
  1807 |   }
  1808 | }
  1809 | 
  1810 | async function runAuditCheck(entry: MatrixEntry, prefix: string): Promise<void> {
  1811 |   switch (entry.id) {
  1812 |     case 'audit-001': {
  1813 |       const email = `${prefix}@test.test`;
  1814 |       const res = await fetch(`${BASE_URL}/auth/register`, {
  1815 |         method: 'POST',
  1816 |         headers: { 'Content-Type': 'application/json' },
  1817 |         body: JSON.stringify({ email, password: 'ValidPass!!2026', name: 'Audit test' }),
  1818 |       });
  1819 |       expect(res.status, `[${entry.id}] Register should succeed for audit test`).toBe(201);
  1820 |       break;
  1821 |     }
  1822 |     case 'audit-002': {
  1823 |       const email = `${prefix}@test.test`;
  1824 |       await fetch(`${BASE_URL}/auth/register`, {
  1825 |         method: 'POST',
  1826 |         headers: { 'Content-Type': 'application/json' },
  1827 |         body: JSON.stringify({ email, password: 'ValidPass!!2026', name: 'Audit test' }),
  1828 |       });
  1829 |       const res = await fetch(`${BASE_URL}/auth/login`, {
  1830 |         method: 'POST',
  1831 |         headers: { 'Content-Type': 'application/json' },
  1832 |         body: JSON.stringify({ email, password: 'ValidPass!!2026' }),
  1833 |       });
  1834 |       expect(res.status, `[${entry.id}] Login must succeed`).toBe(200);
  1835 |       break;
  1836 |     }
  1837 |     case 'audit-003': {
  1838 |       const res = await fetch(`${BASE_URL}/auth/login`, {
  1839 |         method: 'POST',
  1840 |         headers: { 'Content-Type': 'application/json' },
  1841 |         body: JSON.stringify({ email: 'nonexistent@example.com', password: 'WrongPass!!2026' }),
  1842 |       });
  1843 |       expect(res.status, `[${entry.id}] Failed login must return 401`).toBe(401);
  1844 |       break;
  1845 |     }
  1846 |     case 'audit-004': {
  1847 |       const res = await apiFetch('/api-tokens', { method: 'POST', body: JSON.stringify({ name: `${prefix}-token` }) });
  1848 |       expect(res.status, `[${entry.id}] Token creation must succeed`).toBe(201);
  1849 |       break;
  1850 |     }
  1851 |     case 'audit-005': {
  1852 |       const createRes = await apiFetch('/api-tokens', { method: 'POST', body: JSON.stringify({ name: `${prefix}-token` }) });
  1853 |       const createBody = (await createRes.json()) as { data: { id: string } };
  1854 |       const res = await apiFetch(`/api-tokens/${createBody.data.id}`, { method: 'DELETE' });
  1855 |       expect(res.status, `[${entry.id}] Token revoke must succeed`).toBe(200);
  1856 |       break;
  1857 |     }
  1858 |     case 'audit-006': {
  1859 |       const res = await apiFetch('/projects', { method: 'POST', body: JSON.stringify({ name: `${prefix}-proj` }) });
  1860 |       expect(res.status, `[${entry.id}] Project creation must succeed`).toBe(201);
  1861 |       break;
  1862 |     }
  1863 |     case 'audit-007': {
  1864 |       const proj = await createProject(`${prefix}-proj`);
  1865 |       const res = await apiFetch(`/projects/${proj.id}`, { method: 'DELETE' });
  1866 |       expect(res.status, `[${entry.id}] Project deletion must succeed`).toBe(200);
  1867 |       break;
  1868 |     }
  1869 |     case 'audit-008': {
  1870 |       const res = await apiFetch('/webhooks', { method: 'POST', body: JSON.stringify({ url: 'https://example.com', events: ['task.created'] }) });
  1871 |       expect(res.status, `[${entry.id}] Webhook creation must succeed`).toBe(201);
  1872 |       break;
  1873 |     }
  1874 |     case 'audit-009': {
  1875 |       const other = await createTestUser(`${prefix}-b`);
  1876 |       const otherProj = await createProject(`${prefix}-b-proj`, other.token);
  1877 |       const otherTask = await createTask(otherProj.id, `${prefix}-task`, {}, other.token);
  1878 |       const res = await apiFetch('/tasks/bulk/status', {
  1879 |         method: 'POST',
  1880 |         body: JSON.stringify({ ids: [otherTask.id], status: 'DONE' }),
  1881 |       });
  1882 |       expect(res.status, `[${entry.id}] Cross-user bulk must return 403`).toBe(403);
  1883 |       break;
  1884 |     }
  1885 |     case 'audit-010': {
  1886 |       const proj = await createProject(`${prefix}-proj`);
  1887 |       const t1 = await createTask(proj.id, `${prefix}-task`);
  1888 |       const res = await apiFetch('/tasks/bulk/status', {
  1889 |         method: 'POST',
  1890 |         body: JSON.stringify({ ids: [t1.id], status: 'DONE' }),
  1891 |       });
  1892 |       expect(res.status, `[${entry.id}] Bulk status must succeed`).toBe(200);
  1893 |       break;
  1894 |     }
  1895 |     case 'audit-011': {
  1896 |       const res = await apiFetch('/views', { method: 'POST', body: JSON.stringify({ name: `${prefix}-view`, scope: 'user', filter: {} }) });
  1897 |       expect(res.status, `[${entry.id}] View creation must succeed`).toBe(201);
  1898 |       break;
  1899 |     }
  1900 |     case 'audit-012': {
  1901 |       const createRes = await apiFetch('/webhooks', { method: 'POST', body: JSON.stringify({ url: 'https://example.com', events: ['task.created'] }) });
  1902 |       const createBody = (await createRes.json()) as { data: { id: string } };
  1903 |       const res = await apiFetch(`/webhooks/${createBody.data.id}`, { method: 'DELETE' });
> 1904 |       expect(res.status, `[${entry.id}] Webhook deletion must succeed`).toBe(200);
       |                                                                         ^ Error: [audit-012] Webhook deletion must succeed
  1905 |       break;
  1906 |     }
  1907 |   }
  1908 | }
  1909 | 
  1910 | // ═══════════════════════════════════════════════════════════════════════════════
  1911 | // Executor: CSV tests
  1912 | // ═══════════════════════════════════════════════════════════════════════════════
  1913 | 
  1914 | async function runCsvTest(entry: MatrixEntry): Promise<void> {
  1915 |   const prefix = `feat-${entry.id}-${Date.now()}`;
  1916 | 
  1917 |   switch (entry.id) {
  1918 | 
  1919 |     case 'csv-001': {
  1920 |       const proj = await createProject(`${prefix}-proj`);
  1921 |       await createTask(proj.id, `${prefix}-task-1`);
  1922 |       await createTask(proj.id, `${prefix}-task-2`);
  1923 |       const res = await apiFetch(`/export/project/${proj.id}`);
  1924 |       expect(res.status, `[${entry.id}] CSV export expected 200`).toBe(200);
  1925 |       const ct = res.headers.get('content-type');
  1926 |       expect(ct, `[${entry.id}] Content-Type must be text/csv`).toContain('text/csv');
  1927 |       const csv = await res.text();
  1928 |       const headerRow = csv.split('\n')[0] ?? '';
  1929 |       const expectedCols = ['id', 'title', 'status', 'priority'];
  1930 |       for (const col of expectedCols) {
  1931 |         expect(headerRow, `[${entry.id}] CSV header must contain column: ${col}`).toContain(col);
  1932 |       }
  1933 |       break;
  1934 |     }
  1935 | 
  1936 |     case 'csv-002': {
  1937 |       const proj1 = await createProject(`${prefix}-proj1`);
  1938 |       const proj2 = await createProject(`${prefix}-proj2`);
  1939 |       await createTask(proj1.id, `${prefix}-t1`);
  1940 |       await createTask(proj2.id, `${prefix}-t2`);
  1941 |       const res = await apiFetch('/export/tasks');
  1942 |       expect(res.status, `[${entry.id}] Cross-project CSV export expected 200`).toBe(200);
  1943 |       const csv = await res.text();
  1944 |       const lines = csv.split('\n').filter((l) => l.trim());
  1945 |       expect(lines.length, `[${entry.id}] CSV should have header + at least 2 rows`).toBeGreaterThanOrEqual(3);
  1946 |       break;
  1947 |     }
  1948 | 
  1949 |     case 'csv-003': {
  1950 |       const proj = await createProject(`${prefix}-proj`);
  1951 |       // Task with comma and quote in title
  1952 |       await createTask(proj.id, `Title with, comma and "quotes"`);
  1953 |       const res = await apiFetch(`/export/project/${proj.id}`);
  1954 |       expect(res.status).toBe(200);
  1955 |       const csv = await res.text();
  1956 |       // A properly RFC 4180 escaped field with a comma must be wrapped in quotes
  1957 |       expect(csv, `[${entry.id}] CSV must quote fields containing commas`).toContain('"');
  1958 |       break;
  1959 |     }
  1960 | 
  1961 |     case 'csv-005': {
  1962 |       const proj = await createProject(`${prefix}-proj`);
  1963 |       const task = await createTask(proj.id, `${prefix}-archived`);
  1964 |       await apiFetch(`/tasks/${task.id}`, {
  1965 |         method: 'PATCH',
  1966 |         body: JSON.stringify({ archivedAt: new Date().toISOString() }),
  1967 |       });
  1968 |       const res = await apiFetch(`/export/project/${proj.id}`);
  1969 |       expect(res.status).toBe(200);
  1970 |       const csv = await res.text();
  1971 |       const lines = csv.split('\n').filter((l) => l.trim() && !l.startsWith('id'));
  1972 |       // The archived task should NOT appear
  1973 |       const hasArchivedTask = lines.some((l) => l.includes(prefix + '-archived'));
  1974 |       expect(hasArchivedTask, `[${entry.id}] Archived tasks should not appear in default CSV export`).toBe(false);
  1975 |       break;
  1976 |     }
  1977 | 
  1978 |     case 'csv-006': {
  1979 |       const other = await createTestUser(`${prefix}-b`);
  1980 |       const otherProj = await createProject(`${prefix}-b-proj`, other.token);
  1981 |       const uniqueTitle = `${prefix}-other-unique-export`;
  1982 |       await createTask(otherProj.id, uniqueTitle, {}, other.token);
  1983 |       const res = await apiFetch('/export/tasks');
  1984 |       expect(res.status).toBe(200);
  1985 |       const csv = await res.text();
  1986 |       expect(csv, `[${entry.id}] Other user's tasks must not appear in export`).not.toContain(uniqueTitle);
  1987 |       break;
  1988 |     }
  1989 | 
  1990 |     default: {
  1991 |       console.warn(`[${entry.id}] No CSV test implementation — passing by default`);
  1992 |       break;
  1993 |     }
  1994 |   }
  1995 | }
  1996 | 
  1997 | // ═══════════════════════════════════════════════════════════════════════════════
  1998 | // Executor: Webhook tests
  1999 | // ═══════════════════════════════════════════════════════════════════════════════
  2000 | 
  2001 | async function runWebhookTest(entry: MatrixEntry): Promise<void> {
  2002 |   const prefix = `feat-${entry.id}-${Date.now()}`;
  2003 | 
  2004 |   switch (entry.id) {
```