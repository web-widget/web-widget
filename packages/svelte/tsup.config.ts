import { defineConfig } from 'tsup';
export default defineConfig({
  dts: true,
  entry: {
    svelte: 'src/index.ts',
    'svelte.transform': 'src/transform.ts',
    'svelte.adapter.server': 'src/adapter.server.ts',
    'svelte.adapter.client': 'src/adapter.client.ts',
  },
  format: 'esm',
  outDir: 'dist',
  splitting: true,
  target: 'chrome67',
});
