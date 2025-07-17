import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: '@cloudflare/vitest-pool-workers',
    poolOptions: {
      workers: {
        miniflare: {
          compatibilityDate: '2023-05-18',
          compatibilityFlags: ['nodejs_compat'],
          modules: true,
        },
      },
    },
    globals: true,
    environment: 'node',
  },
});
