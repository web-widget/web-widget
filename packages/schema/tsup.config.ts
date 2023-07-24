import type { Options } from "tsup";
export const tsup: Options = {
  entry: {
    client: "src/client.ts",
    server: "src/server.ts",
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
