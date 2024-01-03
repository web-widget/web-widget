import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { buildWebWidgetEntryPlugin } from "./build/build-web-widget-entry";
import { parseConfig } from "./config";
import { pluginContainer } from "./container";
import { webRouterDevServerPlugin } from "./dev/dev-server";
import type { BuilderUserConfig, ResolvedBuilderConfig } from "./types";

function resolveRealFile(
  fileName: string,
  root: string,
  extensions: string[] = [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json"]
): string {
  const paths = ["", ...extensions].map((extension) =>
    path.resolve(root, `${fileName}${extension}`)
  );

  for (const file of paths) {
    if (fs.existsSync(file)) {
      return file;
    }
  }

  throw new Error(`File not found: ${paths.join(", ")}`);
}

export function webRouterPlugin(config: BuilderUserConfig = {}): Plugin[] {
  const builderConfig = parseConfig(config || {});
  return [
    ...pluginContainer<ResolvedBuilderConfig>(
      buildWebWidgetEntryPlugin,
      ({ root = process.cwd(), resolve: { extensions } = {} }) => {
        Object.values(builderConfig.input).forEach((value) => {
          Object.entries(value).forEach(([k, v]) => {
            value[k] =
              typeof v === "string" ? resolveRealFile(v, root, extensions) : v;
          });
        });

        return builderConfig;
      },
      true
    ),

    ...pluginContainer<ResolvedBuilderConfig>(webRouterDevServerPlugin, () => {
      return builderConfig;
    }),
  ];
}
