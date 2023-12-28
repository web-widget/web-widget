import type { Plugin } from "vite";
import { webWidgetPlugin } from "@web-widget/vite";
import type { WebWidgetPluginOptions } from "@web-widget/vite";

export interface VueWebWidgetPluginOptions extends WebWidgetPluginOptions {}

export default function vueWebWidgetPlugin({
  provide = "@web-widget/vue",
  toWebWidgets = {},
  toComponents = {},
}: VueWebWidgetPluginOptions = {}): Plugin[] {
  return webWidgetPlugin({
    provide,
    toWebWidgets: {
      include: /\.(route|widget).*\.vue(\?.*)?$/,
      ...toWebWidgets,
    },
    toComponents: {
      include: /\.(widget)\.[^.]*$/,
      // exclude: /.vue\?.*$/,
      includeImporter: /.*\.vue(\?.*\.(ts|js))?$/,
      ...toComponents,
    },
  });
}
