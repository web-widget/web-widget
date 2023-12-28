import { defineConfig } from "vite";
// @ts-ignore
import { vuePlugin, vueWebWidgetPlugin } from "@examples/vue3/vite-plugins";
// @ts-ignore
import { vue2Plugin, vue2WebWidgetPlugin } from "@examples/vue2/vite-plugins";
import react from "@vitejs/plugin-react";
import { webRouterPlugin } from "@web-widget/vite";
import reactWebWidgetPlugin from "@web-widget/react/vite";

export default defineConfig({
  plugins: [
    webRouterPlugin(),
    react(),
    reactWebWidgetPlugin(),
    vuePlugin(),
    vue2Plugin(),
    vueWebWidgetPlugin(),
    vue2WebWidgetPlugin(),
  ],
  build: {
    target: ["chrome76"],
  },
});
