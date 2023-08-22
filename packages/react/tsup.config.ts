import type { Options } from "tsup";
export const tsup: Options = {
  entry: {
    "react.server": "src/server.ts",
    "react.client": "src/client.ts",
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
