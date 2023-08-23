import type { Options } from "tsup";
export const tsup: Options[] = [
  {
    entry: {
      "vue.server": "src/server.ts",
    },
    esbuildOptions(options) {
      options.conditions = ["worklet", "worker", "import", "module", "default"];
    },
    dts: true,
    target: "es2017",
    splitting: false,
    sourcemap: false,
    format: ["esm"],
    outDir: "dist",
    clean: true,
    external: [],
  },
  {
    entry: {
      "vue.client": "src/client.ts",
    },
    esbuildOptions(options) {
      options.conditions = ["import", "module", "browser", "default"];
    },
    dts: true,
    target: "es2017",
    splitting: false,
    sourcemap: false,
    format: ["esm"],
    outDir: "dist",
    clean: true,
    external: [],
  },
];
