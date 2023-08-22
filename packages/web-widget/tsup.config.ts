import type { Options } from "tsup";
export const tsup: Options = {
  entry: {
    "web-widget.server": "src/server.ts",
    "web-widget.client": "src/client.ts",
  },
  dts: true,
  target: "es2017",
  splitting: false,
  sourcemap: true,
  format: ["esm"],
  outDir: "dist",
  clean: true,
  external: [],
};
