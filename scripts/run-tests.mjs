#!/usr/bin/env node
/**
 * Run vitest with a hard 60s wall-clock limit.
 * Exceeding the limit exits non-zero so CI / agents treat it as failure.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const TIMEOUT_MS = 60_000;
const root = path.dirname(fileURLToPath(import.meta.url));
const cwd = path.resolve(root, '..');

const child = spawn(
  process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
  ['exec', 'vitest', 'run', ...process.argv.slice(2)],
  {
    cwd,
    stdio: 'inherit',
    env: process.env,
  },
);

let killedForTimeout = false;
const timer = setTimeout(() => {
  killedForTimeout = true;
  console.error(`\n[test] exceeded ${TIMEOUT_MS / 1000}s — killing vitest`);
  child.kill('SIGKILL');
}, TIMEOUT_MS);

child.on('error', (err) => {
  clearTimeout(timer);
  console.error(err);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  clearTimeout(timer);
  if (killedForTimeout) {
    process.exit(1);
  }
  if (signal) {
    process.exit(1);
  }
  process.exit(code ?? 1);
});
