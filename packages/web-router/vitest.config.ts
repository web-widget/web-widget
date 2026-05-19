import { defineConfig } from 'vitest/config';
import { cloudflarePool } from '@cloudflare/vitest-pool-workers';

export default defineConfig({
  test: {
    // Intentional throws in async middleware are handled by Application.onError at response time;
    // Vitest 4 otherwise reports them as unhandled rejections.
    dangerouslyIgnoreUnhandledErrors: true,
    pool: cloudflarePool({
      miniflare: {
        compatibilityDate: '2023-05-18',
        compatibilityFlags: ['nodejs_compat'],
        modules: true,
      },
    }),
    globals: true,
    environment: 'node',
  },
});
