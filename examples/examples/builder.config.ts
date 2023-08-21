import {
  defineConfig,
  componentToWidgetPlugin,
  widgetToComponentPlugin,
} from "@web-widget/builder";
import vue from "@vitejs/plugin-vue";
import react from "@vitejs/plugin-react";

export default defineConfig({
  input: "./routemap.json",
  vite: {
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
      // ----- Vue -----
      vue(),
      componentToWidgetPlugin({
        include: ["routes/**/*.vue", "widgets/**/*.vue"],
        provide: "@web-widget/vue",
      }),
    ],
  },
});
