// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

/**
 * VGXTaskCo Feature Autocorrect Driver
 *
 * Runs the feature-matrix Playwright spec and, on failure, invokes Claude in
 * headless mode to apply minimal fixes, then re-runs. Repeats up to
 * --max-iterations times. Each iteration is committed on its own branch.
 *
 * Usage:
 *   node scripts/feature-autocorrect.mjs [options]
 *
 * Options:
 *   --max-iterations <n>    Max fix loops before giving up (default: 5)
 *   --only-critical         Treat only "critical" failures as blockers
 *   --report <path>         Path for the final markdown report
 *   --allow-dirty           Skip dirty working-tree check
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { invokeClaudeHeadless, runCommand, scrubSecrets } from './lib/claude-runner.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── CLI arg parsing ────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {
    maxIterations: 5,
    onlyCritical: false,
    report: resolve(ROOT, 'tests/autocorrect-final-report.md'),
    allowDirty: false,
  };

  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--max-iterations':
        args.maxIterations = parseInt(argv[++i], 10);
        break;
      case '--only-critical':
        args.onlyCritical = true;
        break;
      case '--report':
        args.report = resolve(argv[++i]);
        break;
      case '--allow-dirty':
        args.allowDirty = true;
        break;
      default:
        console.warn(`Unknown arg: ${argv[i]}`);
    }
  }

  return args;
}

// ── Safety checks ──────────────────────────────────────────────────────────────

function assertSafeToRun(args) {
  // Refuse dirty working tree unless --allow-dirty
  if (!args.allowDirty) {
    const { output } = runCommand('git status --porcelain', ROOT);
    if (output.trim()) {
      console.error(
        'Working tree is dirty. Commit or stash changes before running feature-autocorrect.\n' +
        'Pass --allow-dirty to override.\n\n' +
        output,
      );
      process.exit(1);
    }
  }

  // Refuse to run on main
  const branchResult = runCommand('git rev-parse --abbrev-ref HEAD', ROOT);
  const currentBranch = branchResult.output.trim();
  if (currentBranch === 'main' || currentBranch === 'master') {
    console.error(
      `Running feature-autocorrect directly on "${currentBranch}" is not allowed.\n` +
      'Check out a working branch first (e.g. git checkout -b auto/feature-fix).',
    );
    process.exit(1);
  }

  console.log(`[autocorrect] Branch: ${currentBranch}`);
}

// ── Matrix report loading ──────────────────────────────────────────────────────

const REPORT_JSON_PATH = resolve(ROOT, 'tests/feature-matrix-report.json');
const MATRIX_PATH = resolve(ROOT, 'tests/feature-matrix.json');
const LOG_PATH = resolve(ROOT, 'tests/autocorrect-log.jsonl');

/**
 * @typedef {{ id: string, category: string, feature: string, criticality: string, status: string, error?: string, durationMs: number }} ReportEntry
 * @typedef {{ id: string, feature: string, surface: string, verifyType: string, criticality: string, endpoint: string|null, description: string }} MatrixEntry
 */

function loadMatrix() {
  if (!existsSync(MATRIX_PATH)) {
    console.error(`Matrix not found: ${MATRIX_PATH}`);
    process.exit(1);
  }
  return /** @type {MatrixEntry[]} */ (JSON.parse(readFileSync(MATRIX_PATH, 'utf8')));
}

function loadReport() {
  if (!existsSync(REPORT_JSON_PATH)) return null;
  return /** @type {ReportEntry[]} */ (JSON.parse(readFileSync(REPORT_JSON_PATH, 'utf8')));
}

function getFailures(report, onlyCritical, matrix) {
  if (!report) return [];
  return report.filter((r) => {
    if (r.status !== 'fail') return false;
    if (onlyCritical) {
      const entry = matrix.find((m) => m.id === r.id);
      return entry?.criticality === 'critical';
    }
    return true;
  });
}

// ── Playwright runner ──────────────────────────────────────────────────────────

function runPlaywright() {
  console.log('[autocorrect] Running pnpm test:features ...');
  return runCommand('pnpm test:features', ROOT, { timeout: 5 * 60 * 1000 });
}

// ── Git helpers ────────────────────────────────────────────────────────────────

function commitIteration(iteration) {
  const timestamp = Date.now();
  const branch = `auto/feature-fix-${timestamp}`;

  runCommand(`git checkout -b ${branch}`, ROOT);
  runCommand('git add -A', ROOT);
  const msg = `auto: feature matrix fix — iteration ${iteration} (${new Date(timestamp).toISOString()})`;
  runCommand(`git commit -m "${msg}" --allow-empty`, ROOT);

  console.log(`[autocorrect] Committed on branch: ${branch}`);
  return branch;
}

// ── Correction prompt builder ──────────────────────────────────────────────────

function buildCorrectionPrompt(failures, matrix) {
  const failureList = failures
    .map((f) => {
      const entry = matrix.find((m) => m.id === f.id);
      return [
        `- ID: ${f.id}`,
        `  Feature: ${f.feature}`,
        `  Criticality: ${f.criticality}`,
        `  Expected: ${entry?.description ?? '(see feature-matrix.json)'}`,
        `  Actual error: ${scrubSecrets(f.error ?? 'no error captured')}`,
      ].join('\n');
    })
    .join('\n\n');

  return `The VGXTaskCo feature-verification matrix is failing on ${failures.length} item(s). For each failure listed below, read the relevant code (routes/services/components for the feature), diagnose the root cause, and apply the minimal fix that makes the matrix pass without changing scope or breaking other features. Do NOT regenerate files — edit them. Do NOT loosen tests to make them pass. Do NOT change the matrix entries to lower the bar.

Fix-order rules: tackle backend issues before frontend issues for the same feature (frontend often follows from backend). For each fix, also write or extend a unit test that covers the regression so the next run catches it earlier than the e2e step.

Failures:

${failureList}

After applying fixes, output a short summary listing each id you addressed and the file:line of the change. Do not run the e2e spec yourself — the runner will.`;
}

// ── Log helper ─────────────────────────────────────────────────────────────────

function appendLog(entry) {
  mkdirSync(resolve(ROOT, 'tests'), { recursive: true });
  appendFileSync(LOG_PATH, JSON.stringify(entry) + '\n', 'utf8');
}

// ── Final report writer ────────────────────────────────────────────────────────

function writeFinalReport(reportPath, iterations, finalFailures, matrix) {
  const total = matrix.length;
  const stillBroken = finalFailures.length;
  const fixedThisRun = iterations.reduce((acc, it) => acc + it.fixedIds.length, 0);

  const lines = [
    '# VGXTaskCo Autocorrect Final Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    `| Total features | Passed | Failed | Fixed this run | Still broken |`,
    `|----------------|--------|--------|----------------|--------------|`,
    `| ${total} | ${total - stillBroken} | ${stillBroken} | ${fixedThisRun} | ${stillBroken} |`,
    '',
    '---',
    '',
    '## Per-Iteration Results',
    '',
  ];

  for (const it of iterations) {
    lines.push(`### Iteration ${it.iteration}`);
    lines.push('');
    lines.push(`**Failed:** ${it.failedIds.join(', ') || 'none'}`);
    lines.push(`**Fixed:** ${it.fixedIds.join(', ') || 'none'}`);
    lines.push(`**Branch:** ${it.branch || 'n/a'}`);
    if (it.claudeSummary) {
      lines.push('');
      lines.push('**Claude summary:**');
      lines.push('```');
      lines.push(it.claudeSummary.slice(0, 2000));
      lines.push('```');
    }
    lines.push('');
  }

  if (finalFailures.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## Still Broken — Manual Action Required');
    lines.push('');
    for (const f of finalFailures) {
      const entry = matrix.find((m) => m.id === f.id);
      lines.push(`### ${f.id} — ${f.feature}`);
      lines.push(`- **Criticality:** ${f.criticality}`);
      lines.push(`- **Expected:** ${entry?.description ?? 'see feature-matrix.json'}`);
      lines.push(`- **Error:** ${scrubSecrets(f.error ?? 'no error')}`);
      lines.push(`- **Suggested next step:** Manually inspect ${entry?.endpoint ?? 'the relevant route'} and its service.`);
      lines.push('');
    }
  } else {
    lines.push('---');
    lines.push('');
    lines.push('**All critical features passing.**');
    lines.push('');
  }

  writeFileSync(reportPath, lines.join('\n'), 'utf8');
  console.log(`[autocorrect] Final report written to ${reportPath}`);
}

// ── Main loop ──────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);

  console.log('[autocorrect] VGXTaskCo Feature Autocorrect Driver');
  console.log(`[autocorrect] Max iterations: ${args.maxIterations}`);
  console.log(`[autocorrect] Only critical: ${args.onlyCritical}`);

  assertSafeToRun(args);

  const matrix = loadMatrix();

  /** @type {{ iteration: number, failedIds: string[], fixedIds: string[], branch: string, claudeSummary: string }[]} */
  const iterationHistory = [];

  // ── Initial run ──────────────────────────────────────────────────────────────

  let previousFailureIds = new Set();

  for (let iteration = 1; iteration <= args.maxIterations; iteration++) {
    console.log(`\n[autocorrect] === Iteration ${iteration}/${args.maxIterations} ===`);

    const playwrightResult = runPlaywright();
    const report = loadReport();
    const failures = getFailures(report, args.onlyCritical, matrix);

    const failedIds = failures.map((f) => f.id);

    if (failures.length === 0) {
      console.log('[autocorrect] All critical tests passing!');
      appendLog({ iteration, failedIds: [], fixedIds: [...previousFailureIds], claudeTranscript: '' });
      iterationHistory.push({ iteration, failedIds: [], fixedIds: [...previousFailureIds], branch: '', claudeSummary: '' });
      writeFinalReport(args.report, iterationHistory, [], matrix);
      console.log('[autocorrect] Done. Feature matrix fully passing.');
      process.exit(0);
    }

    console.log(`[autocorrect] ${failures.length} failure(s): ${failedIds.join(', ')}`);

    const fixedThisIteration = [...previousFailureIds].filter((id) => !failedIds.includes(id));
    previousFailureIds = new Set(failedIds);

    if (iteration === args.maxIterations) {
      // Last iteration — give up
      console.error(`[autocorrect] Max iterations (${args.maxIterations}) reached. ${failures.length} failure(s) remain.`);
      appendLog({ iteration, failedIds, fixedIds: fixedThisIteration, claudeTranscript: '' });
      iterationHistory.push({ iteration, failedIds, fixedIds: fixedThisIteration, branch: '', claudeSummary: '' });
      writeFinalReport(args.report, iterationHistory, failures, matrix);
      process.exit(1);
    }

    // ── Build correction prompt ──────────────────────────────────────────────────

    const prompt = buildCorrectionPrompt(failures, matrix);
    console.log(`[autocorrect] Invoking Claude with correction prompt (${prompt.length} chars)...`);

    const claudeResult = invokeClaudeHeadless(prompt, { timeout: 10 * 60 * 1000 });

    if (claudeResult.error || claudeResult.status !== 0) {
      console.error(`[autocorrect] Claude invocation failed: ${claudeResult.error ?? claudeResult.stderr}`);
    }

    // Parse Claude's JSON output to extract the text
    let claudeSummary = '';
    try {
      const claudeJson = JSON.parse(claudeResult.stdout);
      claudeSummary = claudeJson?.result ?? claudeJson?.content ?? claudeResult.stdout;
    } catch {
      claudeSummary = claudeResult.stdout;
    }

    // ── Commit changes ───────────────────────────────────────────────────────────

    const branch = commitIteration(iteration);

    // ── Log this iteration ───────────────────────────────────────────────────────

    const logEntry = {
      iteration,
      failedIds,
      fixedIds: fixedThisIteration,
      branch,
      claudeTranscript: scrubSecrets(claudeSummary.slice(0, 5000)),
      playwrightOutput: scrubSecrets(playwrightResult.output.slice(0, 2000)),
    };
    appendLog(logEntry);
    iterationHistory.push({ iteration, failedIds, fixedIds: fixedThisIteration, branch, claudeSummary: claudeSummary.slice(0, 500) });

    console.log(`[autocorrect] Claude fix applied. Re-running tests...`);
  }
}

main().catch((err) => {
  console.error('[autocorrect] Unhandled error:', err);
  process.exit(1);
});
