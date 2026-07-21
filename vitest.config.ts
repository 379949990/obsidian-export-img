import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    /** Per-test ceiling; suite hard-killed at 60s by scripts/run-tests.mjs */
    testTimeout: 10_000,
    hookTimeout: 10_000,
  },
});
