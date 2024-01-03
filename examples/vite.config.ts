import type { Plugin } from "vite";
import { defineConfig } from "vite";
// @ts-ignore
import { vuePresetsPlugin } from "@examples/vue3/vite-plugins";
// @ts-ignore
import { vue2PresetsPlugin } from "@examples/vue2/vite-plugins";
import react from "@vitejs/plugin-react";
import { webRouterPlugin } from "@web-widget/vite";
import reactWebWidgetPlugin from "@web-widget/react/vite";

function reactPresetsPlugin() {
  return [react(), reactWebWidgetPlugin()];
}

function patchVuePluginConfig(): Plugin {
  return {
    name: "patchVuePluginConfig",
    async config(config) {
      const dedupe = config?.resolve?.dedupe;
      if (dedupe) {
        // Patch vue3 plugin config.
        // @see https://github.com/vitejs/vite-plugin-vue/blob/main/packages/plugin-vue/src/index.ts#L147
        dedupe.splice(dedupe.indexOf("vue"), 1);
      }

      return {
        optimizeDeps: {
          // Avoid version conflicts caused by `optimizeDeps`.
          exclude: ["vue", "vue-router"],
        },
        resolve: {
          dedupe,
          // Patch vue2 plugin config.
          // @see https://github.com/vitejs/vite-plugin-vue2/blob/main/src/index.ts#L103
          alias: { find: "vue", replacement: "vue" },
        },
      };
    },
  };
}

export default defineConfig({
  plugins: [
    patchVuePluginConfig(),
    webRouterPlugin({
      filesystemRouting: true,
    }),
    reactPresetsPlugin(),
    vuePresetsPlugin(),
    vue2PresetsPlugin(),
  ],
  build: {
    target: ["chrome76"],
  },
});
