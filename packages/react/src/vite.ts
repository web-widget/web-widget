import type { Plugin } from "vite";
import { webWidgetPlugin } from "@web-widget/vite";
import type { WebWidgetPluginOptions } from "@web-widget/vite";

export interface ReactWebWidgetPluginOptions extends WebWidgetPluginOptions {}

export default function reactWebWidgetPlugin({
  provide = "@web-widget/react",
  export: exportWidget = {},
  import: importWidget = {},
}: ReactWebWidgetPluginOptions = {}): Plugin[] {
  return webWidgetPlugin({
    provide,
    export: {
      include: /(?:\.|@)(?:route|widget)\.(?:tsx|jsx)(?:\?.*)?$/,
      ...exportWidget,
    },
    import: {
      include: /(?:\.|@)widget\..*$/,
      includeImporter: /.*\.(?:tsx|jsx)(?:\?.*)?$/,
      ...importWidget,
    },
  });
}
