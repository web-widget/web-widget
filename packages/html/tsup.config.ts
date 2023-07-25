import type { Options } from "tsup";
export const tsup: Options = {
  entry: {
    "html.server": "src/server.ts",
    "html.client": "src/client.ts",
  },
  dts: true,
  target: "esnext",
  splitting: false,
  sourcemap: false,
  format: ["esm"],
  outDir: "dist",
  clean: true,
  external: [],
};
