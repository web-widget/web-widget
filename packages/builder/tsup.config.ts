import type { Options } from "tsup";
export const tsup: Options = {
  entry: {
    builder: "src/index.ts",
    cli: "src/cli.ts",
    "entry.server": "src/entry/server.ts",
    context: "src/context.ts",
  },
  dts: true,
  target: "node14",
  splitting: true,
  sourcemap: false,
  format: ["esm"],
  outDir: "dist",
  clean: true,
  external: ["virtual:@web-widget/server:user-manifest"],
};
