import type { Plugin } from "vite";
import { webWidgetPlugin } from "@web-widget/vite";
import type { WebWidgetPluginOptions } from "@web-widget/vite";

export interface ReactWebWidgetPluginOptions extends WebWidgetPluginOptions {}

export default function reactWebWidgetPlugin({
  provide = "@web-widget/react",
  toWebWidgets = {},
  toComponents = {},
}: ReactWebWidgetPluginOptions = {}): Plugin[] {
  return webWidgetPlugin({
    provide,
    toWebWidgets: {
      include: ["**/*.route.tsx", "**/*.widget.tsx"],
      ...toWebWidgets,
    },
    toComponents: {
      include: /\.(widget)\.[^.]*$/,
      includeImporter: ["**/*.tsx"],
      ...toComponents,
    },
  });
}
