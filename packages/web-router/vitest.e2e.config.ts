import { defineConfig } from 'vitest/config';

/**
 * Vitest config for e2e memory leak tests.
 * Uses the default Node.js pool (not Cloudflare Workers/miniflare)
 * so that `--expose-gc`, `process.memoryUsage()`, and `v8.writeHeapSnapshot()`
 * are available.
 *
 * Run with:
 *   pnpm --filter @web-widget/web-router test:memory-leak
 */
export default defineConfig({
  test: {
    pool: 'forks',
    environment: 'node',
    globals: false,
    include: ['src/memory-leak.e2e.test.ts'],
    // Pass --expose-gc to child processes so globalThis.gc() is available
    execArgv: ['--expose-gc'],
  },
});
