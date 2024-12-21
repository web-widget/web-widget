import { defineConfig } from 'tsup';

export default defineConfig({
  dts: true,
  entry: {
    'context.universal.server': 'src/universal.server.ts',
    'context.universal.client': 'src/universal.client.ts',
    'context.server': 'src/server.ts',
    'context.client': 'src/client.ts',
  },
  external: ['node:async_hooks'],
  format: 'esm',
  outDir: 'dist',
  sourcemap: false,
  splitting: true,
  target: 'chrome67',
});
