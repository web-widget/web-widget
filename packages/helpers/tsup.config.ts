import type { Options } from 'tsup';
export const tsup: Options = {
  entry: {
    'action.client': 'src/action/client.ts',
    'action.server': 'src/action/server.ts',
    'cache.client': 'src/cache/client.ts',
    'cache.server': 'src/cache/server.ts',
    'context.client': 'src/context/client.ts',
    'context.server': 'src/context/server.ts',
    crypto: 'src/crypto/index.ts',
    'env.client': 'src/env/client.ts',
    'env.server': 'src/env/server.ts',
    error: 'src/error/index.ts',
    headers: 'src/headers/index.ts',
    http: 'src/http/index.ts',
    'module.client': 'src/module/client.ts',
    'module.server': 'src/module/server.ts',
    navigation: 'src/navigation/index.ts',
    purify: 'src/purify/index.ts',
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
