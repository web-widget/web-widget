import { defineConfig, webWidgetPlugin } from "@web-widget/builder";
import vue from "@vitejs/plugin-vue2";
import react from "@vitejs/plugin-react";

export default defineConfig({
  input: "./routemap.json",
  vite: {
    ssr: {
      // NOTE: Vue2 does not support webworker
      target: "node",
    },
    plugins: [
      // ----- React -----
      react(),
      webWidgetPlugin({
        provide: "@web-widget/react",
        toWebWidgets: {
          include: ["routes/**/*.tsx", "widgets/**/*.tsx"],
        },
        toComponents: {
          include: ["widgets/**/*"],
          component: ["**/*.tsx"],
        },
      }),
      // ----- Vue -----
      vue(),
      webWidgetPlugin({
        provide: "@web-widget/vue2",
        toWebWidgets: {
          include: /\/(routes|widgets)\/.*\.vue(\?.*\.(ts|js))?$/,
        },
      }),
    ],
  },
});
