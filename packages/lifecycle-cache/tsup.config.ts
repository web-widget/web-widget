import { defineConfig } from 'tsup';

export default defineConfig({
  dts: true,
  entry: {
    'lifecycle-cache.universal.server': 'src/universal.server.ts',
    'lifecycle-cache.universal.client': 'src/universal.client.ts',
    'lifecycle-cache.server': 'src/server.ts',
    'lifecycle-cache.client': 'src/client.ts',
  },
  external: [],
  format: 'esm',
  outDir: 'dist',
  sourcemap: false,
  splitting: true,
  target: 'chrome67',
});
