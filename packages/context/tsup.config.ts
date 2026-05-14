import { defineConfig } from 'tsup';

// Server entries include global.ts (node:async_hooks); client bundles never pull it — split targets accordingly.
const formats = {
  external: ['node:async_hooks'] as string[],
  format: 'esm' as const,
  outDir: 'dist',
  sourcemap: false,
  splitting: true,
};

export default defineConfig([
  {
    ...formats,
    dts: true,
    entry: {
      'context.universal.server': 'src/universal.server.ts',
      'context.server': 'src/server.ts',
    },
    platform: 'node',
    target: 'node20',
  },
  {
    ...formats,
    dts: true,
    entry: {
      'context.universal.client': 'src/universal.client.ts',
      'context.client': 'src/client.ts',
    },
    platform: 'browser',
    target: 'chrome67',
  },
]);
