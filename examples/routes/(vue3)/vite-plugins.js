import { default as vue3Plugin } from "@vitejs/plugin-vue";
export { default as vueWebWidgetPlugin } from "@web-widget/vue/vite";

export function vuePlugin(options) {
  return [vue3Plugin(options)];
}
