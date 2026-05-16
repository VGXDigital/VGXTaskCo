// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { readFileSync, existsSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AuthState } from './global-setup.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTH_STATE_PATH = resolve(__dirname, '.auth-state.json');

const isProd = (process.env['E2E_ENV'] ?? 'prod') === 'prod';
const BASE_URL = process.env['E2E_BASE_URL'] ?? (isProd ? 'https://vgxtaskco-api.fly.dev' : 'http://localhost:4000');

async function globalTeardown(): Promise<void> {
  if (!existsSync(AUTH_STATE_PATH)) return;

  const authState = JSON.parse(readFileSync(AUTH_STATE_PATH, 'utf8')) as AuthState;

  const deleteUser = async (token: string, email: string): Promise<void> => {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok || res.status === 404) {
      console.log(`[global-teardown] Deleted: ${email}`);
    } else {
      console.warn(`[global-teardown] Failed to delete ${email}: ${res.status}`);
    }
  };

  await deleteUser(authState.token, authState.email);
  if (authState.secondToken) {
    await deleteUser(authState.secondToken, authState.secondEmail);
  }

  unlinkSync(AUTH_STATE_PATH);
}

export default globalTeardown;
