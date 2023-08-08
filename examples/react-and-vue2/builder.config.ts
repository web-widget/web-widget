import { defineConfig } from "@web-widget/builder";
import vue from "@vitejs/plugin-vue2";
import react from "@web-widget/react/vite-plugin";

export default defineConfig({
  input: "./routemap.json",
  vite: {
    plugins: [react(), vue()],
    ssr: {
      // NOTE: Vue2 does not support webworker
      target: "node",
    },
  },
});
