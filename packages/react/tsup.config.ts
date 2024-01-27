import type { Options } from "tsup";

const baseOptions: Options = {
  dts: true,
  target: "es2017",
  splitting: false,
  sourcemap: false,
  format: ["esm"],
  outDir: "dist",
  clean: true,
  external: [],
};

export const tsup: Options[] = [
  {
    ...baseOptions,
    entry: {
      "react.server": "src/server.ts",
    },
    esbuildOptions(options) {
      options.conditions = ["worklet", "worker", "import", "module", "default"];
    },
  },
  {
    ...baseOptions,
    entry: {
      "react.client": "src/client.ts",
    },
    esbuildOptions(options) {
      options.conditions = ["import", "module", "browser", "default"];
    },
  },
  {
    ...baseOptions,
    entry: {
      vite: "src/vite.ts",
    },
    format: ["esm", "cjs"],
  },
];
