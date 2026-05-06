# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: feature-matrix.spec.ts >> [webhook-008] All 7 task event types fire webhooks
- Location: tests/e2e/feature-matrix.spec.ts:337:7

# Error details

```
Error: [webhook-008] Task delete should succeed

expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 400
```

# Test source

```ts
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
  2116 |         const proj2 = await createProject(`${prefix}-proj2`);
  2117 |         const task2 = await createTask(proj2.id, `${prefix}-task2`);
  2118 |         const checkRes = await apiFetch(`/tasks/${task2.id}`, { method: 'DELETE' });
> 2119 |         expect(checkRes.status, `[${entry.id}] Task delete should succeed`).toBe(200);
       |                                                                             ^ Error: [webhook-008] Task delete should succeed
  2120 |       } finally {
  2121 |         receiver.close();
  2122 |       }
  2123 |       break;
  2124 |     }
  2125 | 
  2126 |     default: {
  2127 |       console.warn(`[${entry.id}] No webhook test implementation — passing by default`);
  2128 |       break;
  2129 |     }
  2130 |   }
  2131 | }
  2132 | 
```