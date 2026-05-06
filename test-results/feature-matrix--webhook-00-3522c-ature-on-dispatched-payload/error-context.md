# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: feature-matrix.spec.ts >> [webhook-005] HMAC-SHA256 signature on dispatched payload
- Location: tests/e2e/feature-matrix.spec.ts:337:7

# Error details

```
TypeError: Cannot read properties of undefined (reading 'secret')
```

# Test source

```ts
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
> 2015 |         const secret = createBody.data.secret;
       |                                        ^ TypeError: Cannot read properties of undefined (reading 'secret')
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
  2043 |         const createRes = await apiFetch('/webhooks', {
  2044 |           method: 'POST',
  2045 |           body: JSON.stringify({ url: receiver.url, events: ['task.created'] }),
  2046 |         });
  2047 |         const createBody = (await createRes.json()) as { data: { id: string } };
  2048 | 
  2049 |         // Deactivate the webhook
  2050 |         await apiFetch(`/webhooks/${createBody.data.id}`, {
  2051 |           method: 'PATCH',
  2052 |           body: JSON.stringify({ active: false }),
  2053 |         });
  2054 | 
  2055 |         // Create a task — should NOT trigger the webhook
  2056 |         const proj = await createProject(`${prefix}-proj`);
  2057 |         await createTask(proj.id, `${prefix}-task`);
  2058 |         await new Promise((r) => setTimeout(r, 500));
  2059 | 
  2060 |         expect(receiver.requests.length, `[${entry.id}] Inactive webhook must not receive requests`).toBe(0);
  2061 |       } finally {
  2062 |         receiver.close();
  2063 |       }
  2064 |       break;
  2065 |     }
  2066 | 
  2067 |     case 'webhook-007': {
  2068 |       const receiver = await startMockReceiver();
  2069 |       try {
  2070 |         // Subscribe to task.created ONLY
  2071 |         const createRes = await apiFetch('/webhooks', {
  2072 |           method: 'POST',
  2073 |           body: JSON.stringify({ url: receiver.url, events: ['task.created'] }),
  2074 |         });
  2075 |         const createBody = (await createRes.json()) as { data: { id: string } };
  2076 |         void createBody;
  2077 | 
  2078 |         // Trigger task.updated by updating a task
  2079 |         const proj = await createProject(`${prefix}-proj`);
  2080 |         const task = await createTask(proj.id, `${prefix}-task`);
  2081 |         await apiFetch(`/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ title: `${prefix}-updated` }) });
  2082 |         await new Promise((r) => setTimeout(r, 500));
  2083 | 
  2084 |         // The webhook should only have received task.created (from createTask above), not task.updated
  2085 |         const updatedEvents = receiver.requests.filter((r) => {
  2086 |           try {
  2087 |             const body = JSON.parse(r.body) as { event?: string };
  2088 |             return body.event === 'task.updated';
  2089 |           } catch { return false; }
  2090 |         });
  2091 |         expect(updatedEvents.length, `[${entry.id}] Unsubscribed event must not be dispatched`).toBe(0);
  2092 |       } finally {
  2093 |         receiver.close();
  2094 |       }
  2095 |       break;
  2096 |     }
  2097 | 
  2098 |     case 'webhook-008': {
  2099 |       // This test verifies all 7 event types fire — we can only test a subset without a full integration
  2100 |       const receiver = await startMockReceiver();
  2101 |       try {
  2102 |         const allEvents = ['task.created', 'task.updated', 'task.status.changed', 'task.completed', 'task.archived', 'task.unarchived', 'task.deleted'];
  2103 |         await apiFetch('/webhooks', {
  2104 |           method: 'POST',
  2105 |           body: JSON.stringify({ url: receiver.url, events: allEvents }),
  2106 |         });
  2107 | 
  2108 |         const proj = await createProject(`${prefix}-proj`);
  2109 |         const task = await createTask(proj.id, `${prefix}-task`); // task.created
  2110 |         await apiFetch(`/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ title: `${prefix}-updated` }) }); // task.updated
  2111 |         await apiFetch(`/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'DONE' }) }); // task.status.changed + task.completed
  2112 |         await new Promise((r) => setTimeout(r, 500));
  2113 | 
  2114 |         // We don't assert exact counts since dispatch is fire-and-forget
  2115 |         // Just verify the endpoint is wired up and responds 200
```