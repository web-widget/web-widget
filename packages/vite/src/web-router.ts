import type { Plugin } from "vite";
import { buildWebWidgetEntryPlugin } from "./build/build-web-widget-entry";
import { parseConfig } from "./config";
import { pluginContainer } from "./container";
import { webRouterDevServerPlugin } from "./dev/dev-server";
import type { BuilderUserConfig, ResolvedBuilderConfig } from "./types";

export function webRouterPlugin(config: BuilderUserConfig = {}): Plugin[] {
  let builderConfig: ResolvedBuilderConfig;
  return [
    ...pluginContainer<ResolvedBuilderConfig>(
      buildWebWidgetEntryPlugin,
      ({ root = process.cwd(), resolve: { extensions } = {} }) => {
        builderConfig = parseConfig(config || {}, root, extensions);
        return builderConfig;
      },
      true
    ),

    ...pluginContainer<ResolvedBuilderConfig>(webRouterDevServerPlugin, () => {
      return builderConfig;
    }),
  ];
}
