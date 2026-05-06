// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

/**
 * Playwright global setup for VGXTaskCo feature-matrix tests.
 *
 * Creates a test user via POST /auth/register and persists the JWT to
 * tests/e2e/.auth-state.json so all subsequent test files can reuse it
 * without logging in on every test.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface AuthState {
  token: string;
  userId: string;
  email: string;
}

const isProd = (process.env['E2E_ENV'] ?? 'prod') === 'prod';
const BASE_URL = process.env['E2E_BASE_URL'] ?? (isProd ? 'https://vgxtaskco-api.fly.dev' : 'http://localhost:4000');
const AUTH_STATE_PATH = resolve(__dirname, '.auth-state.json');

async function globalSetup(): Promise<void> {
  const email = `e2e-${Date.now()}@vgxtaskco.test`;
  const password = 'E2eTestPass!!2026';
  const name = 'E2E Test User';

  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Global setup failed: POST /auth/register returned ${res.status}. Body: ${body}`,
    );
  }

  const json = (await res.json()) as { data: { token: string; user: { id: string; email: string } } };

  const authState: AuthState = {
    token: json.data.token,
    userId: json.data.user.id,
    email: json.data.user.email,
  };

  mkdirSync(dirname(AUTH_STATE_PATH), { recursive: true });
  writeFileSync(AUTH_STATE_PATH, JSON.stringify(authState, null, 2), 'utf8');

  console.log(`[global-setup] Test user created: ${email} (${authState.userId})`);
}

export default globalSetup;
