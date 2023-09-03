import type { Plugin } from "vite";
import { webWidgetPlugin } from "@web-widget/vite";
import type { WebWidgetPluginOptions } from "@web-widget/vite";

export interface VueWebWidgetPluginOptions extends WebWidgetPluginOptions {}

export default function vueWebWidgetPlugin({
  provide = "@web-widget/vue",
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
}: VueWebWidgetPluginOptions = {}): Plugin[] {
  return webWidgetPlugin({
    provide,
    toWebWidgets,
    toComponents,
  });
}
