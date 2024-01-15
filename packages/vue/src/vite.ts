import type { Plugin } from "vite";
import { webWidgetPlugin } from "@web-widget/vite";
import type { WebWidgetPluginOptions } from "@web-widget/vite";

// Examples:
// .vue?vue&type=script&setup=true&lang.ts
// .vue?vue&type=style&index=0&scoped=7b8d5933&lang.less
const VUE_INTERNAL_REQUEST = /vue\?vue\b.*$/;

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
      ...exportWidget,
      exclude: [...toArray(exportWidget.exclude), VUE_INTERNAL_REQUEST],
    },
    import: {
      include: /(?:\.|@)widget\..*$/,
      includeImporter: /.*\.vue(?:\?.*)?$/,
      ...importWidget,
      exclude: [...toArray(importWidget.exclude), VUE_INTERNAL_REQUEST],
    },
  });
}
