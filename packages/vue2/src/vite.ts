import type { Plugin } from "vite";
import { webWidgetPlugin } from "@web-widget/vite";
import type { WebWidgetPluginOptions } from "@web-widget/vite";

export interface Vue2WebWidgetPluginOptions extends WebWidgetPluginOptions {}

export default function vue2WebWidgetPlugin({
  provide = "@web-widget/vue2",
  export: exportWidget = {},
  import: importWidget = {},
}: Vue2WebWidgetPluginOptions = {}): Plugin[] {
  return webWidgetPlugin({
    provide,
    export: {
      include: /(?:\.|@)(?:route|widget)\.vue(?:\?.*)?$/,
      exclude: /vue\?.*&lang\.(?:css|js|ts)$/,
      ...exportWidget,
    },
    import: {
      include: /(?:\.|@)widget\..*$/,
      exclude: /vue\?.*&lang\.(?:css|js|ts)$/,
      includeImporter: /.*\.vue(?:\?.*)?$/,
      ...importWidget,
    },
  });
}
