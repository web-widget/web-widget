import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import reactWebWidgetPlugin from "@web-widget/react/vite";
import vue3Plugin from "@vitejs/plugin-vue";
import vue3WebWidgetPlugin from "@web-widget/vue/vite";

export function vuePresetsPlugin() {
  return [vue3Plugin(), vue3WebWidgetPlugin()];
}

function reactPresetsPlugin() {
  return [react(), reactWebWidgetPlugin()];
}

export default defineConfig({
  plugins: [reactPresetsPlugin(), vuePresetsPlugin()],
  build: {
    minify: false,
    manifest: true,
    target: ["chrome76"],
  },
});
