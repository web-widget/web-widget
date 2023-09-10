import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import react from "@vitejs/plugin-react";
import { webRouterPlugin } from "@web-widget/vite";
import reactWebWidgetPlugin from "@web-widget/react/vite";
import vueWebWidgetPlugin from "@web-widget/vue/vite";

export default defineConfig({
  plugins: [
    webRouterPlugin(),
    react(),
    reactWebWidgetPlugin(),
    vue(),
    vueWebWidgetPlugin(),
  ],
});
