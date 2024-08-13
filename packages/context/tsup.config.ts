import type { Options } from 'tsup';
export const tsup: Options = {
  entry: {
    'context.universal.server': 'src/universal.server.ts',
    'context.universal.client': 'src/universal.client.ts',
    'context.server': 'src/server.ts',
    'context.client': 'src/client.ts',
  },
  dts: true,
  target: 'es2020',
  splitting: true,
  sourcemap: false,
  format: ['esm'],
  outDir: 'dist',
  clean: true,
  external: ['node:async_hooks'],
};
