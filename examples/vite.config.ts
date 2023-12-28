import { defineConfig } from "vite";
import { vuePlugin, vueWebWidgetPlugin } from "@examples/vue3/vite-plugins";
import { vue2Plugin, vue2WebWidgetPlugin } from "@examples/vue2/vite-plugins";
import react from "@vitejs/plugin-react";
import { webRouterPlugin } from "@web-widget/vite";
import reactWebWidgetPlugin from "@web-widget/react/vite";

export default defineConfig({
  plugins: [
    webRouterPlugin(),
    react(),
    reactWebWidgetPlugin(),
    vuePlugin({
      exclude: /\/\(vue2\)\//,
    }),
    vue2Plugin({
      exclude: /\/\(vue3\)\//,
    }),
    vueWebWidgetPlugin({
      toWebWidgets: {
        exclude: /\/\(vue2\)\//,
      },
    }),
    vue2WebWidgetPlugin({
      toWebWidgets: {
        exclude: /\/\(vue3\)\//,
      },
    }),
  ],
  build: {
    target: ["chrome76"],
  },
});
