import type { Plugin } from "vite";
import { webWidgetPlugin } from "@web-widget/vite";
import type { WebWidgetPluginOptions } from "@web-widget/vite";

const EXCLUDE = /vue\?.*&lang\.(?:css|js|ts)$/;

function toArray(value: any) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

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
      extractFromExportDefault: [
        {
          name: "handler",
          default: "{GET({render}){return render()}}",
        },
        {
          name: "meta",
          default: "{}",
        },
      ],
      ...exportWidget,
      exclude: [...toArray(exportWidget.exclude), EXCLUDE],
    },
    import: {
      include: /(?:\.|@)widget\..*$/,
      includeImporter: /.*\.vue(?:\?.*)?$/,
      ...importWidget,
      exclude: [...toArray(importWidget.exclude), EXCLUDE],
    },
  });
}
