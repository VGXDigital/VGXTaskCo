// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// happy-dom is used instead of jsdom because Node 25 ships a native but
// broken localStorage global (requires --localstorage-file) that overrides
// jsdom's implementation.  happy-dom installs its own localStorage cleanly.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
