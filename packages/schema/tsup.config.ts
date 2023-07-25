import type { Options } from "tsup";
export const tsup: Options = {
  entry: {
    types: "src/types.ts",
    "helpers.client": "src/client.ts",
    "helpers.server": "src/server.ts",
  },
  dts: true,
  target: "es2020",
  splitting: false,
  sourcemap: false,
  format: ["esm"],
  outDir: "dist",
  clean: true,
  external: [],
};
