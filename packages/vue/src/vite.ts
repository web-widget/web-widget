import type { Plugin } from "vite";
import { webWidgetPlugin } from "@web-widget/vite";
import type { WebWidgetPluginOptions } from "@web-widget/vite";

export interface VueWebWidgetPluginOptions extends WebWidgetPluginOptions {}

export default function vueWebWidgetPlugin({
  provide = "@web-widget/vue",
  export: exportWidget = {},
  import: importWidget = {},
}: VueWebWidgetPluginOptions = {}): Plugin[] {
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
