import type { Plugin } from "vite";
import { webWidgetPlugin } from "@web-widget/vite";
import type { WebWidgetPluginOptions } from "@web-widget/vite";

export interface Vue2WebWidgetPluginOptions extends WebWidgetPluginOptions {}

export default function vue2WebWidgetPlugin({
  provide,
  toWebWidgets = {},
  toComponents = {},
}: Vue2WebWidgetPluginOptions = {}): Plugin[] {
  return webWidgetPlugin({
    provide: provide ?? "@web-widget/vue2",
    toWebWidgets: {
      include: [
        /\b(routes|widgets).*\.vue(\?.*\.(ts|js))?$/,
        /(\.route|widget).*\.vue(\?.*\.(ts|js))?$/,
      ],
      ...toWebWidgets,
    },
    toComponents: {
      include: ["widgets/**/*", "**/*.widget.*"],
      exclude: /.vue\?.*$/,
      includeImporter: /.*\.vue(\?.*\.(ts|js))?$/,
      ...toComponents,
    },
  });
}
