// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { defineConfig } from '@playwright/test';

const isProd = (process.env['E2E_ENV'] ?? 'prod') === 'prod';

export const E2E_GUI_URL = isProd ? 'https://taskco.vgx.guru' : 'http://localhost:5173';
export const E2E_API_URL = isProd ? 'https://vgxtaskco-api.fly.dev' : 'http://localhost:4000';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30000,
  workers: 1, // serial — shared DB
  reporter: [
    ['list'],                                              // live terminal output per test
    ['html', { outputFolder: 'playwright-report', open: 'never' }],  // open with: npx playwright show-report
    ['json', { outputFile: 'tests/feature-matrix-report.json' }],    // machine-readable
  ],
  use: {
    baseURL: E2E_GUI_URL,
    headless: true,
    channel: 'msedge',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
});
