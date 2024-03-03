import type { Options } from 'tsup';
export const tsup: Options = {
  entry: {
    'context.client': 'src/context/client.ts',
    'context.server': 'src/context/server.ts',
    error: 'src/error/index.ts',
    headers: 'src/headers/index.ts',
    http: 'src/http/index.ts',
    'module.client': 'src/module/client.ts',
    'module.server': 'src/module/server.ts',
    navigation: 'src/navigation/index.ts',
    state: 'src/state/index.ts',
    status: 'src/status/index.ts',
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
