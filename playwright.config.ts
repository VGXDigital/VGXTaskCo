// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30000,
  workers: 1, // serial — shared DB
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
  },
  globalSetup: './tests/e2e/global-setup.ts',
});
