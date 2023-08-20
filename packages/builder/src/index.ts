import type { BuilderUserConfig } from "./types";
export type * from "./types";

export { appendWidgetMetaPlugin } from "./build/append-widget-meta";
export { componentToWidgetPlugin } from "./build/component-to-widget";
export { replaceAssetPlugin } from "./build/replace-asset";
export { widgetToComponentPlugin } from "./build/widget-to-component";

export function defineConfig(config: BuilderUserConfig): BuilderUserConfig {
  return config;
}
