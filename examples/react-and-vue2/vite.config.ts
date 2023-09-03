import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue2";
import react from "@vitejs/plugin-react";
import { webWidgetPlugin, webRouterPlugin } from "@web-widget/builder";

export default defineConfig({
  ssr: {
    // NOTE: Vue2 does not support webworker
    target: "node",
  },
  plugins: [
    webRouterPlugin(),
    // ----- React -----
    react(),
    webWidgetPlugin({
      provide: "@web-widget/react",
      toWebWidgets: {
        include: [
          "routes/**/*.tsx",
          "widgets/**/*.tsx",
          "**/*.route.tsx",
          "**/*.widget.tsx",
        ],
      },
      toComponents: {
        include: ["widgets/**/*", "*.widget.*"],
        component: ["**/*.tsx"],
      },
    }),
    // ----- Vue -----
    vue(),
    webWidgetPlugin({
      provide: "@web-widget/vue2",
      toWebWidgets: {
        include: [
          /\b(routes|widgets).*\.vue(\?.*\.(ts|js))?$/,
          /(\.route|widget).*\.vue(\?.*\.(ts|js))?$/,
        ],
      },
      toComponents: {
        include: ["widgets/**/*", "**/*.widget.*"],
        exclude: /.vue\?.*$/,
        component: /.*\.vue(\?.*\.(ts|js))?$/,
      },
    }),
  ],
});
