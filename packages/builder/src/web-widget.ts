import type { Plugin as VitePlugin } from "vite";
import { appendWebWidgetMetaPlugin } from "./build/append-web-widget-meta";
import { componentToWebWidgetPlugin } from "./build/component-to-web-widget";
import { type ComponentToWebWidgetPluginOptions } from "./build/component-to-web-widget";
import { replaceAssetPlugin } from "./build/replace-asset";
import { webWidgetToComponentPlugin } from "./build/web-widget-to-component";
import { type WebWidgetToComponentPluginOptions } from "./build/web-widget-to-component";

export {
  appendWebWidgetMetaPlugin,
  componentToWebWidgetPlugin,
  replaceAssetPlugin,
  webWidgetToComponentPlugin,
};

export interface WebWidgetPluginOptions {
  provide?: string;
  toWebWidgets?: Partial<
    ComponentToWebWidgetPluginOptions & {
      provide?: string;
    }
  >;
  toComponents?: Partial<
    WebWidgetToComponentPluginOptions & {
      provide?: string;
    }
  >;
}

export function webWidgetPlugin({
  provide,
  toWebWidgets,
  toComponents,
}: WebWidgetPluginOptions): VitePlugin[] {
  const plugins = [];

  if (toWebWidgets) {
    plugins.push(
      componentToWebWidgetPlugin({
        ...toWebWidgets,
        provide: (toWebWidgets.provide ?? provide) as string,
      })
    );
  }

  if (toWebWidgets) {
    plugins.push(
      webWidgetToComponentPlugin({
        ...toComponents,
        provide: (toWebWidgets.provide ?? provide) as string,
      })
    );
  }

  return plugins;
}
