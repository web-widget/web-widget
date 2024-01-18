import type { Plugin } from "vite";
import { webWidgetPlugin } from "@web-widget/vite";
import type { WebWidgetPluginOptions } from "@web-widget/vite";

const EXCLUDE = /vue\?.*&lang\.(?:css|js|ts)$/;

function toArray(value: any) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

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
