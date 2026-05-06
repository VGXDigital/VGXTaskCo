// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

/**
 * no-console-log.mjs — PostToolUse hook for Claude Code
 * Warns when a source file contains console.log calls.
 * Skips test files, scripts, and config files.
 * Exit code 2 = warning (Claude will surface this to the user).
 * Exit code 0 = clean.
 */

import { readFileSync } from 'fs';

const filePath = process.argv[2];

if (!filePath) {
  process.exit(0);
}

// Skip test files, scripts, and config files
const SKIP_PATTERNS = [
  '/tests/',
  '.test.ts',
  '.test.js',
  'vitest.config.ts',
  'vitest.config.js',
  'playwright.config.ts',
  'playwright.config.js',
  '/scripts/',
  'scripts/',
  '.mjs',
  '.cjs',
];

const isSkipped = SKIP_PATTERNS.some((pattern) => filePath.includes(pattern));
if (isSkipped) {
  process.exit(0);
}

let content;
try {
  content = readFileSync(filePath, 'utf8');
} catch {
  // File not found or unreadable — not our concern
  process.exit(0);
}

if (content.includes('console.log')) {
  process.stderr.write(
    `[no-console-log] WARNING: console.log found in ${filePath}\n` +
    `  Use the Fastify logger (app.log / request.log) instead.\n`,
  );
  process.exit(2);
}

process.exit(0);
