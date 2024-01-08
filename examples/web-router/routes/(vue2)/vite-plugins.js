import * as compiler from "vue/compiler-sfc";
import vue2Plugin from "@vitejs/plugin-vue2";
import vue2WebWidgetPlugin from "@web-widget/vue2/vite";

export function vue2PresetsPlugin() {
  return [
    vue2Plugin({
      compiler,
      include: /\/\(vue2\)\/.*\.vue(?:\?.*)?$/,
    }),
    vue2WebWidgetPlugin({
      toWebWidgets: {
        include: /\/\(vue2\)\/.*(?:\.|@)(route|widget)\.vue(?:\?.*)?$/,
      },
      toComponents: {
        includeImporter: /\/\(vue2\)\/.*\.vue(?:\?.*)?$/,
      },
    }),
  ];
}
