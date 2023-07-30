import type { Options } from "tsup";
export const tsup: Options = {
  entry: {
    types: "src/types.ts",
    "schema-helpers.client": "src/helpers/client.ts",
    "schema-helpers.server": "src/helpers/server.ts",
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
