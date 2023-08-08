import { defineConfig } from "@web-widget/builder";
import vue from "@vitejs/plugin-vue2";
import react from "@web-widget/react/vite-plugin";

export default defineConfig({
  input: "./routemap.json",
  vite: {
    plugins: [
      {
        name: "config",
        config(_userConfig, { ssrBuild }) {
          if (ssrBuild) {
            return {
              build: {
                rollupOptions: {
                  external: [/^node:/, "@web-widget/vue2"],
                },
              },
            };
          }
        },
      },
      react(),
      vue(),
    ],
    ssr: {
      target: "node",
    },
  },
});
