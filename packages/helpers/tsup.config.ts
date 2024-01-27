import type { Options } from "tsup";
export const tsup: Options = {
  entry: {
    "helpers.client": "src/client.ts",
    "helpers.server": "src/server.ts",
    context: "src/context/index.ts",
    module: "src/module/index.ts",
    http: "src/http/index.ts",
  },
  dts: true,
  target: "es2020",
  splitting: true,
  sourcemap: false,
  format: ["esm"],
  outDir: "dist",
  clean: true,
  external: [],
};
