import type { Plugin } from "vite";
import { webWidgetPlugin } from "@web-widget/builder";
import type { WebWidgetPluginOptions } from "@web-widget/builder";

export interface Vue2WebWidgetPluginOptions extends WebWidgetPluginOptions {}

export default function vue2WebWidgetPlugin({
  provide = "@web-widget/vue2",
  toWebWidgets = {
    include: [
      /\b(routes|widgets).*\.vue(\?.*\.(ts|js))?$/,
      /(\.route|widget).*\.vue(\?.*\.(ts|js))?$/,
    ],
  },
  toComponents = {
    include: ["widgets/**/*", "**/*.widget.*"],
    exclude: /.vue\?.*$/,
    includeImporter: /.*\.vue(\?.*\.(ts|js))?$/,
  },
}: Vue2WebWidgetPluginOptions = {}): Plugin[] {
  return webWidgetPlugin({
    provide,
    toWebWidgets,
    toComponents,
  });
}
