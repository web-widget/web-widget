import vue3Plugin from "@vitejs/plugin-vue";
import vue3WebWidgetPlugin from "@web-widget/vue/vite";

export function vuePresetsPlugin() {
  return [
    vue3Plugin({
      include: /\/vue3\/.*\.vue(?:\?.*)?$/,
    }),
    vue3WebWidgetPlugin({
      export: {
        include: /\/vue3\/.*@widget\.vue(?:\?.*)?$/,
      },
      import: {
        includeImporter: /\/vue3\/.*\.vue(?:\?.*)?$/,
      },
    }),
  ];
}
