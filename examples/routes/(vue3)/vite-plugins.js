import { default as vue3Plugin } from "@vitejs/plugin-vue";
import { default as vue3WebWidgetPlugin } from "@web-widget/vue/vite";

export function vuePlugin() {
  return [
    vue3Plugin({
      include: /\(vue3\)\/.*\.vue$/,
    }),
  ];
}

export function vueWebWidgetPlugin() {
  return vue3WebWidgetPlugin({
    toWebWidgets: {
      include:
        /\(vue3\)\/.*\.(route|widget).*\.vue(\?as=[^&]*|\?.*\.(ts|js))?$/,
    },
  });
}
