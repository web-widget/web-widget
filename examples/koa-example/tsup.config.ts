import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      server: 'main.ts',
    },
    // minifyIdentifiers: false,
    bundle: true,
    dts: true,
    sourcemap: true,
    splitting: true,
    // @ts-ignore
    //minify: process.env.NODE_ENV === 'production',
    //skipNodeModulesBundle: true,
    outDir: 'dist',
    //shims: true,
    clean: true
  },
  // {
  //   entry: {
  //     'html.server': 'src/runtime/html/mod.server.ts',
  //     'html.client': 'src/runtime/html/mod.client.ts',
  //     'react.server': 'src/runtime/react/mod.server.ts',
  //     'react.client': 'src/runtime/react/mod.client.ts',
  //     'react/jsx-runtime': 'src/runtime/react/jsx_runtime.ts',
  //     'react/babel-plugin': 'src/runtime/react/babel_plugin.ts',
  //   },
  //   dts: true,
  //   minify: false,
  //   outDir: 'dist/runtime'
  // }
]);
