import { defineConfig } from "vite";
// @ts-ignore
import { vuePlugin, vueWebWidgetPlugin } from "@examples/vue3/vite-plugins";
// @ts-ignore
import { vue2Plugin, vue2WebWidgetPlugin } from "@examples/vue2/vite-plugins";
import react from "@vitejs/plugin-react";
import { webRouterPlugin } from "@web-widget/vite";
import reactWebWidgetPlugin from "@web-widget/react/vite";

const vue2Dir = /\/\(vue2\)\//;
const vue3Dir = /\/\(vue3\)\//;
export default defineConfig({
  plugins: [
    webRouterPlugin(),
    react(),
    reactWebWidgetPlugin(),
    vuePlugin({
      exclude: vue2Dir,
    }),
    vue2Plugin({
      exclude: vue3Dir,
    }),
    vueWebWidgetPlugin({
      toWebWidgets: {
        exclude: vue2Dir,
      },
    }),
    vue2WebWidgetPlugin({
      toWebWidgets: {
        exclude: vue3Dir,
      },
    }),
  ],
  build: {
    target: ["chrome76"],
  },
});
