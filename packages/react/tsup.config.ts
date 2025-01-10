import { defineConfig, type Options } from 'tsup';

const baseConfig: Options = {
  dts: true,
  external: [],
  format: 'esm',
  outDir: 'dist',
  sourcemap: false,
  splitting: true,
  target: 'chrome67',
};

const createConfig = (
  entry: Record<string, string>,
  ssr: boolean | null = null
) => ({
  ...baseConfig,
  entry,
  define: ssr !== null ? { 'import.meta.env.SSR': String(ssr) } : undefined,
  treeshake: ssr !== null,
});

export default defineConfig([
  createConfig({ 'react.server': 'src/index.ts' }, true),
  createConfig({ 'react.client': 'src/index.ts' }, false),
  createConfig({ vite: 'src/vite.ts' }),
]);
