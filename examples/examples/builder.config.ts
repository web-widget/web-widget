import { defineConfig, webWidgetPlugin } from "@web-widget/builder";
import vue from "@vitejs/plugin-vue";
import react from "@vitejs/plugin-react";

export default defineConfig({
  input: "./routemap.json",
  vite: {
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
        provide: "@web-widget/vue",
        toWebWidgets: {
          include: ["routes/**/*.vue", "widgets/**/*.vue"],
        },
      }),
    ],
  },
});
