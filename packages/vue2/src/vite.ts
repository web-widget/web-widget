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
  const route = /(?:\.|@)route\.vue(?:\?.*)?$/;
  const widget = /(?:\.|@)widget\.vue(?:\?.*)?$/;
  return webWidgetPlugin({
    provide,
    export: {
      include: [route, widget],
      extractFromExportDefault: [
        {
          name: "handler",
          default: "{GET({render}){return render()}}",
          include: route,
        },
        {
          name: "meta",
          default: "{}",
          include: route,
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
