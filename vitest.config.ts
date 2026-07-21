import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // `obsidian` ships types only — stub runtime for unit tests.
      obsidian: path.join(root, 'tests/mocks/obsidian.ts'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    /** Per-test ceiling; suite hard-killed at 60s by scripts/run-tests.mjs */
    testTimeout: 10_000,
    hookTimeout: 10_000,
  },
});
