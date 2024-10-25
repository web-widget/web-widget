import type { Options } from 'tsup';

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const existsSync = (filePath: string) => {
  if (fs.existsSync(filePath)) {
    console.log('>>>>File exists:', filePath);
  } else {
    console.log('>>>>File does not exist', filePath);
  }
};

existsSync(`${__dirname}/package.json`);
existsSync(`${__dirname}/node_modules/vite/package.json`);
existsSync(`${__dirname}/node_modules/@web-widget/helpers/package.json`);
existsSync(`${__dirname}/node_modules/@web-widget/react/package.json`);
existsSync(`${__dirname}/node_modules/@web-widget/react/dist/react.server.js`);
existsSync(
  `${__dirname}/node_modules/@web-widget/react/dist/react.server.d.ts`
);

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
      options.conditions = ['worklet', 'worker', 'import', 'module', 'default'];
    },
  },
  {
    ...baseOptions,
    entry: {
      'vue.client': 'src/client.ts',
    },
    esbuildOptions(options) {
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
