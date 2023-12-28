import type { Plugin } from "vite";
import { webWidgetPlugin } from "@web-widget/vite";
import type { WebWidgetPluginOptions } from "@web-widget/vite";

export interface Vue2WebWidgetPluginOptions extends WebWidgetPluginOptions {}

export default function vue2WebWidgetPlugin({
  provide = "@web-widget/vue2",
  toWebWidgets = {},
  toComponents = {},
}: Vue2WebWidgetPluginOptions = {}): Plugin[] {
  return webWidgetPlugin({
    provide,
    toWebWidgets: {
      include: /\.(route|widget).*\.vue(\?as=[^&]*|\?.*\.(ts|js))?$/,
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
