import type { Options } from 'tsup';
export const tsup: Options = {
  entry: {
    'module.client': 'src/module/client.ts',
    'module.server': 'src/module/server.ts',
    context: 'src/context/index.ts',
    http: 'src/http/index.ts',
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
