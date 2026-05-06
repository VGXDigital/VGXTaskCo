// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

/**
 * VGXTaskCo Build Runner
 * Drives the build sequence in headless mode using Claude CLI.
 * Reads prompts/vgxtaskco-build.md, executes each prompt block via `claude`,
 * validates with the Verify step, retries on failure, and writes build-log.jsonl + build-report.md.
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'fs';
import { spawnSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Arg parsing ────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { from: null, to: null, dryRun: false, maxRetries: 3 };
  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--from':       args.from       = argv[++i]; break;
      case '--to':         args.to         = argv[++i]; break;
      case '--dry-run':    args.dryRun     = true;      break;
      case '--max-retries': args.maxRetries = parseInt(argv[++i], 10); break;
    }
  }
  return args;
}

// ── Markdown parser ────────────────────────────────────────────────────────────

/**
 * Parses the build markdown file.
 * Expects headings like: ### Prompt N.M — Title
 * Blockquoted `>` lines are the prompt body.
 * Lines starting with `**Verify:**` contain the verify command.
 */
function parsePromptFile(filePath) {
  if (!existsSync(filePath)) {
    console.error(`Prompt file not found: ${filePath}`);
    process.exit(1);
  }
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  const blocks = [];
  let current = null;
  const headingRe = /^###\s+Prompt\s+([\d.]+)\s+[—–-]+\s+(.+)/;
  const verifyRe  = /^\*\*Verify:\*\*\s*(.+)/;

  for (const line of lines) {
    const hm = headingRe.exec(line);
    if (hm) {
      if (current) blocks.push(current);
      current = { id: hm[1], title: hm[2].trim(), prompt: '', verify: null };
      continue;
    }
    if (!current) continue;

    const vm = verifyRe.exec(line);
    if (vm) {
      current.verify = vm[1].trim();
      continue;
    }
    // Blockquote lines
    if (line.startsWith('> ')) {
      current.prompt += line.slice(2) + '\n';
    } else if (line === '>') {
      current.prompt += '\n';
    }
  }
  if (current) blocks.push(current);
  return blocks;
}

// ── Build log helpers ──────────────────────────────────────────────────────────

const LOG_PATH = resolve(ROOT, 'build-log.jsonl');

function loadPassedIds() {
  if (!existsSync(LOG_PATH)) return new Set();
  const lines = readFileSync(LOG_PATH, 'utf8').trim().split('\n').filter(Boolean);
  const passed = new Set();
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entry.status === 'pass') passed.add(entry.id);
    } catch { /* skip malformed */ }
  }
  return passed;
}

function writeLog(entry) {
  appendFileSync(LOG_PATH, JSON.stringify(entry) + '\n', 'utf8');
}

// ── Secret scrubber ────────────────────────────────────────────────────────────

const SECRET_RE = /(JWT_SECRET|DATABASE_URL|[A-Z_]*_SECRET|[A-Z_]*_TOKEN)\s*=\s*\S+/g;

function scrubSecrets(text) {
  return text.replace(SECRET_RE, (_, key) => `${key}=[REDACTED]`);
}

// ── Claude invocation ──────────────────────────────────────────────────────────

function invokeClande(promptText) {
  const result = spawnSync(
    'claude',
    ['-p', '--dangerously-skip-permissions', '--output-format', 'json'],
    {
      input: promptText,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      timeout: 10 * 60 * 1000, // 10 min
    }
  );
  return {
    stdout: scrubSecrets(result.stdout || ''),
    stderr: scrubSecrets(result.stderr || ''),
    status: result.status ?? 1,
    error:  result.error ? result.error.message : null,
  };
}

// ── Verify step ───────────────────────────────────────────────────────────────

/**
 * Returns { ok: boolean, output: string, manual: boolean }
 * Manual steps (no shell command) just warn.
 */
function runVerify(verify) {
  if (!verify) return { ok: true, output: 'No verify step', manual: false };

  // Detect manually-verified steps
  const lower = verify.toLowerCase();
  const isManual =
    !verify.startsWith('pnpm') &&
    !verify.startsWith('node') &&
    !verify.startsWith('npx') &&
    !verify.startsWith('ls ') &&
    !verify.startsWith('test ') &&
    !verify.match(/^[a-z][\w-]* /);

  if (isManual) {
    console.warn(`  [WARN] Manual verify step: ${verify}`);
    return { ok: true, output: verify, manual: true };
  }

  const result = spawnSync(verify, {
    shell: true,
    encoding: 'utf8',
    cwd: ROOT,
    timeout: 5 * 60 * 1000,
  });

  return {
    ok: (result.status ?? 1) === 0,
    output: scrubSecrets((result.stdout || '') + (result.stderr || '')),
    manual: false,
  };
}

// ── Phase commit helper ────────────────────────────────────────────────────────

function runCommit(message) {
  const result = spawnSync(`git add . && git commit -m "${message}"`, {
    shell: true,
    encoding: 'utf8',
    cwd: ROOT,
    timeout: 30 * 1000,
  });
  return result.status === 0;
}

// ── Report writer ─────────────────────────────────────────────────────────────

function writeReport(results) {
  const total  = results.length;
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  const lines = [
    '# VGXTaskCo Build Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `| Total | Passed | Failed | Skipped |`,
    `|-------|--------|--------|---------|`,
    `| ${total} | ${passed} | ${failed} | ${skipped} |`,
    '',
    '## Results',
    '',
  ];

  for (const r of results) {
    const icon = r.status === 'pass' ? '✅' : r.status === 'skipped' ? '⏭️' : '❌';
    lines.push(`### ${icon} Prompt ${r.id} — ${r.title}`);
    lines.push(`- **Status**: ${r.status}`);
    lines.push(`- **Duration**: ${r.durationMs ?? 0}ms`);
    if (r.attempts) lines.push(`- **Attempts**: ${r.attempts}`);
    if (r.lastError) lines.push(`- **Error**: ${scrubSecrets(r.lastError)}`);
    lines.push('');
  }

  writeFileSync(resolve(ROOT, 'build-report.md'), lines.join('\n'), 'utf8');
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);
  const promptFile = resolve(ROOT, 'prompts', 'vgxtaskco-build.md');
  const blocks = parsePromptFile(promptFile);

  if (blocks.length === 0) {
    console.error('No prompt blocks found in', promptFile);
    process.exit(1);
  }

  const passedIds = loadPassedIds();
  const results = [];
  let anyFailed = false;

  // Filter range
  const fromIdx = args.from ? blocks.findIndex(b => b.id === args.from) : 0;
  const toIdx   = args.to   ? blocks.findIndex(b => b.id === args.to)   : blocks.length - 1;

  if (fromIdx === -1) { console.error(`--from id "${args.from}" not found`); process.exit(1); }
  if (toIdx   === -1) { console.error(`--to id "${args.to}" not found`);     process.exit(1); }

  const selected = blocks.slice(fromIdx, toIdx + 1);

  for (const block of selected) {
    // Idempotency check
    if (passedIds.has(block.id)) {
      console.log(`[SKIP] Prompt ${block.id} — ${block.title} (already passed)`);
      results.push({ id: block.id, title: block.title, status: 'skipped' });
      continue;
    }

    console.log(`\n[START] Prompt ${block.id} — ${block.title}`);

    if (args.dryRun) {
      console.log(`  [DRY-RUN] Would invoke Claude with ${block.prompt.length} chars`);
      results.push({ id: block.id, title: block.title, status: 'pass', durationMs: 0, attempts: 0 });
      continue;
    }

    let attempt = 0;
    let success = false;
    let lastError = '';
    let transcript = '';
    const t0 = Date.now();

    while (attempt < args.maxRetries && !success) {
      attempt++;
      const promptText = attempt === 1
        ? block.prompt
        : `${block.prompt}\n\n---\nPrevious attempt failed with this error:\n${lastError}\n\nPlease fix the issue and retry.`;

      console.log(`  Attempt ${attempt}/${args.maxRetries}...`);
      const claudeResult = invokeClande(promptText);
      transcript = claudeResult.stdout;

      if (claudeResult.error) {
        lastError = `Claude invocation error: ${claudeResult.error}`;
        console.error(`  [ERROR] ${lastError}`);
        continue;
      }

      if (claudeResult.status !== 0) {
        lastError = `Claude exited with status ${claudeResult.status}: ${claudeResult.stderr}`;
        console.error(`  [ERROR] ${lastError}`);
        continue;
      }

      // Run verify
      const verify = runVerify(block.verify);
      if (verify.ok) {
        success = true;
        if (verify.manual) {
          console.warn(`  [WARN] Manual verify — assuming pass`);
        } else {
          console.log(`  [VERIFY] Passed`);
        }
      } else {
        lastError = verify.output.slice(0, 2000);
        console.error(`  [VERIFY FAIL] ${lastError}`);
      }
    }

    const durationMs = Date.now() - t0;

    if (success) {
      const entry = { id: block.id, status: 'pass', durationMs, attempt };
      writeLog(entry);
      results.push({ ...entry, title: block.title });
      console.log(`  [PASS] ${block.id} in ${durationMs}ms`);
    } else {
      anyFailed = true;
      const entry = { id: block.id, status: 'fail', durationMs, lastError, transcript: transcript.slice(0, 5000) };
      writeLog(entry);
      results.push({ ...entry, title: block.title, attempts: attempt });
      console.error(`  [FAIL] ${block.id} after ${attempt} attempts`);
      writeReport(results);
      process.exit(1);
    }
  }

  writeReport(results);

  if (anyFailed) {
    console.error('\nBuild finished with failures. See build-report.md');
    process.exit(1);
  } else {
    console.log('\nBuild complete. See build-report.md');
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
