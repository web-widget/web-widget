// @ts-ignore
import { promises as fs } from 'node:fs';
// @ts-ignore
import path from 'node:path';
// @ts-ignore
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST = 'dist';
const NAME = 'web-router.server';
const PLACEHOLDER_NAME = 'placeholder';
const PLACEHOLDER_PATH = path.resolve(
  __dirname,
  DIST,
  `${PLACEHOLDER_NAME}.d.ts`
);
const PLACEHOLDER_CODE = `interface Framework {
  /**
   * Built-in client assets for the framework.
   */
  meta: import('./${NAME}.d.ts').Meta;
  /**
   * Service module manifest.
   */
  manifest: import('./${NAME}.d.ts').Manifest;
}
interface ImportMeta {
  /**
   * Assets injected by the framework.
   * This object is generated by the build tool.
   */
  readonly framework: Framework;
}`;

import { defineConfig } from 'tsup';

export default defineConfig({
  dts: {
    banner: `/// <reference path="./${PLACEHOLDER_NAME}.d.ts" />`,
  },
  entry: {
    [NAME]: 'src/index.ts',
  },
  external: [],
  format: 'esm',
  outDir: DIST,
  sourcemap: false,
  splitting: true,
  target: 'chrome67',
  onSuccess: async () => {
    try {
      await fs.writeFile(PLACEHOLDER_PATH, PLACEHOLDER_CODE, 'utf8');
    } catch (error: any) {
      error.message = `Failed to create file: ${error.message}`;
      throw error;
    }
  },
});
