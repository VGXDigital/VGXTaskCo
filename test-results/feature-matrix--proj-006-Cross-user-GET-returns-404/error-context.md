# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: feature-matrix.spec.ts >> [proj-006] Cross-user GET returns 404
- Location: tests/e2e/feature-matrix.spec.ts:256:7

# Error details

```
TypeError: Cannot read properties of undefined (reading 'token')
```

# Test source

```ts
  13  |  *
  14  |  * criticality: "nice-to-have" tests are marked test.fixme() and don't block the suite.
  15  |  * Output: tests/feature-matrix-report.json + tests/feature-matrix-report.md
  16  |  */
  17  | 
  18  | import { test, expect } from '@playwright/test';
  19  | import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
  20  | import { resolve, dirname } from 'node:path';
  21  | import { fileURLToPath } from 'node:url';
  22  | import { createHmac } from 'node:crypto';
  23  | import { createServer } from 'node:http';
  24  | import type { IncomingMessage, ServerResponse } from 'node:http';
  25  | 
  26  | const __dirname = dirname(fileURLToPath(import.meta.url));
  27  | const ROOT = resolve(__dirname, '../..');
  28  | 
  29  | // ── Load matrix and auth state ─────────────────────────────────────────────────
  30  | 
  31  | interface MatrixEntry {
  32  |   id: string;
  33  |   category: string;
  34  |   feature: string;
  35  |   surface: string;
  36  |   verifyType: 'api' | 'ui' | 'db' | 'audit' | 'csv' | 'webhook';
  37  |   criticality: 'critical' | 'important' | 'nice-to-have';
  38  |   endpoint: string | null;
  39  |   description: string;
  40  | }
  41  | 
  42  | interface AuthState {
  43  |   token: string;
  44  |   userId: string;
  45  |   email: string;
  46  | }
  47  | 
  48  | const MATRIX: MatrixEntry[] = JSON.parse(
  49  |   readFileSync(resolve(ROOT, 'tests/feature-matrix.json'), 'utf8'),
  50  | ) as MatrixEntry[];
  51  | 
  52  | const AUTH_STATE_PATH = resolve(__dirname, '.auth-state.json');
  53  | 
  54  | function loadAuthState(): AuthState {
  55  |   try {
  56  |     return JSON.parse(readFileSync(AUTH_STATE_PATH, 'utf8')) as AuthState;
  57  |   } catch {
  58  |     throw new Error(
  59  |       `Auth state not found at ${AUTH_STATE_PATH}. Run global-setup first.`,
  60  |     );
  61  |   }
  62  | }
  63  | 
  64  | const BASE_URL = process.env['E2E_BASE_URL'] ?? 'http://localhost:4000';
  65  | const FRONTEND_URL = process.env['E2E_FRONTEND_URL'] ?? 'http://localhost:5173';
  66  | 
  67  | // ── Report infrastructure ─────────────────────────────────────────────────────
  68  | 
  69  | interface ReportEntry {
  70  |   id: string;
  71  |   category: string;
  72  |   feature: string;
  73  |   criticality: string;
  74  |   status: 'pass' | 'fail' | 'skip';
  75  |   error?: string;
  76  |   durationMs: number;
  77  | }
  78  | 
  79  | const reportEntries: ReportEntry[] = [];
  80  | 
  81  | function addReport(entry: ReportEntry): void {
  82  |   reportEntries.push(entry);
  83  | }
  84  | 
  85  | // ── Helper: authenticated fetch ────────────────────────────────────────────────
  86  | 
  87  | async function apiFetch(
  88  |   path: string,
  89  |   options: RequestInit & { token?: string } = {},
  90  | ): Promise<Response> {
  91  |   const auth = loadAuthState();
  92  |   const token = options.token ?? auth.token;
  93  |   return fetch(`${BASE_URL}${path}`, {
  94  |     ...options,
  95  |     headers: {
  96  |       'Content-Type': 'application/json',
  97  |       Authorization: `Bearer ${token}`,
  98  |       ...(options.headers as Record<string, string> | undefined),
  99  |     },
  100 |   });
  101 | }
  102 | 
  103 | // ── Helper: create second user ─────────────────────────────────────────────────
  104 | 
  105 | async function createTestUser(prefix: string): Promise<AuthState> {
  106 |   const email = `${prefix}-${Date.now()}@vgxtaskco.test`;
  107 |   const res = await fetch(`${BASE_URL}/auth/register`, {
  108 |     method: 'POST',
  109 |     headers: { 'Content-Type': 'application/json' },
  110 |     body: JSON.stringify({ email, password: 'TestPass!!2026', name: prefix }),
  111 |   });
  112 |   const json = (await res.json()) as { data: { token: string; user: { id: string; email: string } } };
> 113 |   return { token: json.data.token, userId: json.data.user.id, email: json.data.user.email };
      |                             ^ TypeError: Cannot read properties of undefined (reading 'token')
  114 | }
  115 | 
  116 | // ── Helper: create project via API ─────────────────────────────────────────────
  117 | 
  118 | async function createProject(
  119 |   name: string,
  120 |   token?: string,
  121 | ): Promise<{ id: string; name: string; ownerId: string }> {
  122 |   const res = await apiFetch('/projects', {
  123 |     method: 'POST',
  124 |     token,
  125 |     body: JSON.stringify({ name, description: 'Test project' }),
  126 |   });
  127 |   const json = (await res.json()) as { data: { id: string; name: string; ownerId: string } };
  128 |   return json.data;
  129 | }
  130 | 
  131 | // ── Helper: create task via API ───────────────────────────────────────────────
  132 | 
  133 | async function createTask(
  134 |   projectId: string,
  135 |   title: string,
  136 |   extra: Record<string, unknown> = {},
  137 |   token?: string,
  138 | ): Promise<{ id: string; title: string; status: string; projectId: string }> {
  139 |   const res = await apiFetch(`/projects/${projectId}/tasks`, {
  140 |     method: 'POST',
  141 |     token,
  142 |     body: JSON.stringify({ title, ...extra }),
  143 |   });
  144 |   const json = (await res.json()) as { data: { id: string; title: string; status: string; projectId: string } };
  145 |   return json.data;
  146 | }
  147 | 
  148 | // ── Helper: start a simple HTTP mock receiver ─────────────────────────────────
  149 | 
  150 | interface MockReceiver {
  151 |   url: string;
  152 |   requests: { body: string; headers: Record<string, string> }[];
  153 |   close: () => void;
  154 | }
  155 | 
  156 | function startMockReceiver(): Promise<MockReceiver> {
  157 |   return new Promise((resolve) => {
  158 |     const requests: { body: string; headers: Record<string, string> }[] = [];
  159 |     const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  160 |       let body = '';
  161 |       req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
  162 |       req.on('end', () => {
  163 |         requests.push({
  164 |           body,
  165 |           headers: req.headers as Record<string, string>,
  166 |         });
  167 |         res.writeHead(200);
  168 |         res.end('OK');
  169 |       });
  170 |     });
  171 |     server.listen(0, '127.0.0.1', () => {
  172 |       const addr = server.address() as { port: number };
  173 |       resolve({
  174 |         url: `http://127.0.0.1:${addr.port}`,
  175 |         requests,
  176 |         close: () => server.close(),
  177 |       });
  178 |     });
  179 |   });
  180 | }
  181 | 
  182 | // ── Report writer: runs after all tests ──────────────────────────────────────
  183 | 
  184 | test.afterAll(() => {
  185 |   if (reportEntries.length === 0) return;
  186 | 
  187 |   const REPORT_JSON = resolve(ROOT, 'tests/feature-matrix-report.json');
  188 |   const REPORT_MD = resolve(ROOT, 'tests/feature-matrix-report.md');
  189 | 
  190 |   mkdirSync(resolve(ROOT, 'tests'), { recursive: true });
  191 |   writeFileSync(REPORT_JSON, JSON.stringify(reportEntries, null, 2), 'utf8');
  192 | 
  193 |   // Build markdown grouped by category
  194 |   const byCategory: Record<string, ReportEntry[]> = {};
  195 |   for (const e of reportEntries) {
  196 |     const cat = e.category;
  197 |     if (!byCategory[cat]) byCategory[cat] = [];
  198 |     byCategory[cat].push(e);
  199 |   }
  200 | 
  201 |   const total = reportEntries.length;
  202 |   const passed = reportEntries.filter(e => e.status === 'pass').length;
  203 |   const failed = reportEntries.filter(e => e.status === 'fail').length;
  204 |   const skipped = reportEntries.filter(e => e.status === 'skip').length;
  205 |   const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
  206 | 
  207 |   const lines: string[] = [
  208 |     '# VGXTaskCo Feature Matrix Report',
  209 |     '',
  210 |     `Generated: ${new Date().toISOString()}`,
  211 |     '',
  212 |     `**Pass rate: ${passRate}%** (${passed}/${total} — ${failed} failed, ${skipped} skipped)`,
  213 |     '',
```