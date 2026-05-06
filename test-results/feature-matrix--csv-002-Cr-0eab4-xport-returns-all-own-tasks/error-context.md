# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: feature-matrix.spec.ts >> [csv-002] Cross-project CSV export returns all own tasks
- Location: tests/e2e/feature-matrix.spec.ts:317:7

# Error details

```
Error: [csv-002] Cross-project CSV export expected 200

expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 404
```

# Test source

```ts
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
  1904 |       expect(res.status, `[${entry.id}] Webhook deletion must succeed`).toBe(200);
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
> 1942 |       expect(res.status, `[${entry.id}] Cross-project CSV export expected 200`).toBe(200);
       |                                                                                 ^ Error: [csv-002] Cross-project CSV export expected 200
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
  2005 | 
  2006 |     case 'webhook-005': {
  2007 |       const receiver = await startMockReceiver();
  2008 |       try {
  2009 |         // Create webhook pointing to our mock receiver
  2010 |         const createRes = await apiFetch('/webhooks', {
  2011 |           method: 'POST',
  2012 |           body: JSON.stringify({ url: receiver.url, events: ['test'] }),
  2013 |         });
  2014 |         const createBody = (await createRes.json()) as { data: { id: string; secret: string } };
  2015 |         const secret = createBody.data.secret;
  2016 | 
  2017 |         // Trigger a test dispatch
  2018 |         await apiFetch(`/webhooks/${createBody.data.id}/test`, { method: 'POST' });
  2019 | 
  2020 |         // Wait briefly for async dispatch
  2021 |         await new Promise((r) => setTimeout(r, 500));
  2022 | 
  2023 |         if (receiver.requests.length > 0) {
  2024 |           const req = receiver.requests[0]!;
  2025 |           const sig = req.headers['x-vgx-signature'];
  2026 |           expect(sig, `[${entry.id}] X-VGX-Signature header must be present`).toBeTruthy();
  2027 |           if (sig) {
  2028 |             const expectedSig = 'sha256=' + createHmac('sha256', secret).update(req.body).digest('hex');
  2029 |             expect(sig, `[${entry.id}] HMAC signature must match`).toBe(expectedSig);
  2030 |           }
  2031 |         } else {
  2032 |           console.warn(`[${entry.id}] No requests received by mock receiver — dispatch may be async`);
  2033 |         }
  2034 |       } finally {
  2035 |         receiver.close();
  2036 |       }
  2037 |       break;
  2038 |     }
  2039 | 
  2040 |     case 'webhook-006': {
  2041 |       const receiver = await startMockReceiver();
  2042 |       try {
```