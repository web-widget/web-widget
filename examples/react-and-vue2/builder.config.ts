import {
  defineConfig,
  componentToWidgetPlugin,
  widgetToComponentPlugin,
} from "@web-widget/builder";
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
      componentToWidgetPlugin({
        include: ["routes/**/*.tsx", "widgets/**/*.tsx"],
        provide: "@web-widget/react",
      }),
      widgetToComponentPlugin({
        include: ["widgets/**/*"],
        provide: "@web-widget/react",
        component: ["**/*.tsx"],
      }),
      // ----- Vue2 -----
      vue(),
      componentToWidgetPlugin({
        include: ["routes/**/*.vue", "widgets/**/*.vue"],
        provide: "@web-widget/vue2",
      }),
    ],
  },
});
