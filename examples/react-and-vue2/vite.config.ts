import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue2";
import react from "@vitejs/plugin-react";
import { webRouterPlugin } from "@web-widget/builder";
import reactWebWidgetPlugin from "@web-widget/react/vite";
import vue2WebWidgetPlugin from "@web-widget/vue2/vite";

export default defineConfig({
  ssr: {
    // NOTE: Vue2 does not support webworker
    target: "node",
  },
  plugins: [
    webRouterPlugin(),
    react(),
    reactWebWidgetPlugin(),
    vue(),
    vue2WebWidgetPlugin(),
  ],
});
