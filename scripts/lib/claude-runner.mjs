// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

/**
 * Shared helper for spawning Claude CLI in headless mode.
 * Extracted from scripts/build-runner.mjs for reuse by feature-autocorrect.mjs.
 */

import { spawnSync } from 'child_process';

// ── Secret scrubber ────────────────────────────────────────────────────────────

const SECRET_RE = /(JWT_SECRET|DATABASE_URL|[A-Z_]*_SECRET|[A-Z_]*_TOKEN|[A-Z_]*_KEY)\s*[=:]\s*\S+/g;

/**
 * Removes secret values from a string so they are never written to logs.
 * @param {string} text
 * @returns {string}
 */
export function scrubSecrets(text) {
  return text.replace(SECRET_RE, (_, key) => `${key}=[REDACTED]`);
}

/**
 * Invokes `claude -p --dangerously-skip-permissions --output-format json`
 * with the given prompt text passed via stdin.
 *
 * @param {string} promptText
 * @param {{ timeout?: number }} [options]
 * @returns {{ stdout: string, stderr: string, status: number, error: string | null }}
 */
export function invokeClaudeHeadless(promptText, options = {}) {
  const timeout = options.timeout ?? 10 * 60 * 1000; // 10 minutes default

  const result = spawnSync(
    'claude',
    ['-p', '--dangerously-skip-permissions', '--output-format', 'json'],
    {
      input: promptText,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      timeout,
    },
  );

  return {
    stdout: scrubSecrets(result.stdout || ''),
    stderr: scrubSecrets(result.stderr || ''),
    status: result.status ?? 1,
    error: result.error ? result.error.message : null,
  };
}

/**
 * Invokes a shell command synchronously.
 *
 * @param {string} command
 * @param {string} cwd
 * @param {{ timeout?: number }} [options]
 * @returns {{ ok: boolean, output: string }}
 */
export function runCommand(command, cwd, options = {}) {
  const timeout = options.timeout ?? 5 * 60 * 1000;
  const result = spawnSync(command, {
    shell: true,
    encoding: 'utf8',
    cwd,
    timeout,
  });

  return {
    ok: (result.status ?? 1) === 0,
    output: scrubSecrets((result.stdout || '') + (result.stderr || '')),
  };
}
