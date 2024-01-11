import * as compiler from "vue/compiler-sfc";
import vue2Plugin from "@vitejs/plugin-vue2";
import vue2WebWidgetPlugin from "@web-widget/vue2/vite";

export function vue2PresetsPlugin() {
  return [
    vue2Plugin({
      compiler,
      include: /\/vue2\/.*\.vue(?:\?.*)?$/,
    }),
    vue2WebWidgetPlugin({
      export: {
        include: /\/vue2\/.*@widget\.vue(?:\?.*)?$/,
      },
      import: {
        includeImporter: /\/vue2\/.*\.vue(?:\?.*)?$/,
      },
    }),
  ];
}
