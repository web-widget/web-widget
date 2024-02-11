import type { Options } from 'tsup';

const baseOptions: Options = {
  dts: true,
  target: 'es2017',
  splitting: false,
  sourcemap: false,
  format: ['esm'],
  outDir: 'dist',
  clean: true,
  external: [],
};

export const tsup: Options[] = [
  {
    ...baseOptions,
    entry: {
      'vue.server': 'src/server.ts',
    },
    esbuildOptions(options) {
      // eslint-disable-next-line no-param-reassign
      options.conditions = ['worklet', 'worker', 'import', 'module', 'default'];
    },
  },
  {
    ...baseOptions,
    entry: {
      'vue.client': 'src/client.ts',
    },
    esbuildOptions(options) {
      // eslint-disable-next-line no-param-reassign
      options.conditions = ['import', 'module', 'browser', 'default'];
    },
  },
  {
    ...baseOptions,
    entry: {
      vite: 'src/vite.ts',
    },
    format: ['esm', 'cjs'],
  },
];
