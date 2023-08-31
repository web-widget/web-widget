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
        provide: "@web-widget/vue",
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
  },
});
