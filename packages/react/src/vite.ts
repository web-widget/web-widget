import type { Plugin } from "vite";
import { webWidgetPlugin } from "@web-widget/builder";
import type { WebWidgetPluginOptions } from "@web-widget/builder";

export interface ReactWebWidgetPluginOptions extends WebWidgetPluginOptions {}

export default function reactWebWidgetPlugin({
  provide = "@web-widget/react",
  toWebWidgets = {
    include: [
      "routes/**/*.tsx",
      "widgets/**/*.tsx",
      "**/*.route.tsx",
      "**/*.widget.tsx",
    ],
  },
  toComponents = {
    include: ["widgets/**/*", "*.widget.*"],
    includeImporter: ["**/*.tsx"],
  },
}: ReactWebWidgetPluginOptions = {}): Plugin[] {
  return webWidgetPlugin({
    provide,
    toWebWidgets,
    toComponents,
  });
}