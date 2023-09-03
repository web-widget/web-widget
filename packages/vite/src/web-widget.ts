import path from "node:path";
import type { Plugin, UserConfig } from "vite";
import {
  componentToWebWidgetPlugin,
  type ComponentToWebWidgetPluginOptions,
} from "./build/component-to-web-widget";
import {
  webWidgetToComponentPlugin,
  type WebWidgetToComponentPluginOptions,
} from "./build/web-widget-to-component";
import { getGlobalOptions, pluginContainer } from "./container";
import type { ResolvedBuilderConfig } from "./types";

export interface WebWidgetPluginOptions {
  provide?: string;
  manifest?: ComponentToWebWidgetPluginOptions["manifest"];
  toWebWidgets?: Partial<
    ComponentToWebWidgetPluginOptions & {
      manifest?: ComponentToWebWidgetPluginOptions["manifest"];
      provide?: ComponentToWebWidgetPluginOptions["provide"];
    }
  >;
  toComponents?: Partial<
    WebWidgetToComponentPluginOptions & {
      manifest?: WebWidgetToComponentPluginOptions["manifest"];
      provide?: WebWidgetToComponentPluginOptions["provide"];
    }
  >;
}

export function webWidgetPlugin({
  manifest,
  provide,
  toComponents,
  toWebWidgets,
}: WebWidgetPluginOptions): Plugin[] {
  const plugins: Plugin[] = [];

  if (toWebWidgets) {
    plugins.push(
      pluginContainer<ComponentToWebWidgetPluginOptions>(
        componentToWebWidgetPlugin,
        (userConfig) => {
          if (!manifest) {
            manifest = getManifest(userConfig);
          }

          return {
            ...toWebWidgets,
            provide: (toWebWidgets.provide ?? provide) as string,
            manifest: manifest,
          };
        }
      ) as unknown as Plugin
    );
  }

  if (toWebWidgets) {
    plugins.push(
      pluginContainer<WebWidgetToComponentPluginOptions>(
        webWidgetToComponentPlugin,
        (userConfig) => {
          if (!manifest) {
            manifest = getManifest(userConfig);
          }
          return {
            ...toComponents,
            provide: (toWebWidgets.provide ?? provide) as string,
            manifest,
          };
        }
      ) as unknown as Plugin
    );
  }

  return plugins;
}

function getManifest(userConfig: UserConfig) {
  const { root = process.cwd() } = userConfig;
  const resolvedBuilderConfig =
    getGlobalOptions<ResolvedBuilderConfig>(userConfig);

  if (resolvedBuilderConfig) {
    const viteManifest = path.resolve(
      root,
      resolvedBuilderConfig.output.dir,
      resolvedBuilderConfig.output.client,
      resolvedBuilderConfig.output.manifest
    );
    return viteManifest;
  }
}
