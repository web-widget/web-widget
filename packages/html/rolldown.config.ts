import { defineConfig } from 'rolldown';
import { minify } from 'rolldown/experimental';
import { resolve, dirname } from 'node:path';
import { readFile } from 'node:fs/promises';

/**
 * Resolves `?raw` imports: reads the JS file, minifies its content,
 * and exports the result as a string literal.
 */
function rawMinifyPlugin() {
  return {
    name: 'raw-minify',
    resolveId(source: string, importer: string | undefined) {
      if (!source.endsWith('?raw')) return null;
      const filePath = source.replace(/\?raw$/, '');
      const resolved = importer
        ? resolve(dirname(importer), filePath)
        : resolve(filePath);
      return resolved + '?raw';
    },
    async load(id: string) {
      if (!id.endsWith('?raw')) return null;
      const code = await readFile(id.replace(/\?raw$/, ''), 'utf8');
      const result = await minify(id, code);
      return `export default ${JSON.stringify(result.code)};`;
    },
  };
}

export default defineConfig({
  input: {
    index: 'src/index.ts',
    adapter: 'src/adapter.ts',
    'vite-plugin': 'src/vite-plugin.ts',
  },
  output: {
    format: 'esm',
    dir: 'dist',
    sourcemap: false,
    entryFileNames: '[name].js',
    chunkFileNames: '[name]-[hash].js',
  },
  platform: 'neutral',
  treeshake: true,
  plugins: [rawMinifyPlugin()],
});
