import type { Options } from 'tsup';
export const tsup: Options = {
  entry: {
    'universal.server': 'src/universal.server.ts',
    'universal.client': 'src/universal.client.ts',
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
  external: [],
};
