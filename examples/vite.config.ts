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
        // Patch vue3 plugin config
        // @see https://github.com/vitejs/vite-plugin-vue/blob/2b33c323f26802f5607aa717ae0d6f6b030b94bf/packages/plugin-vue/src/index.ts#L147
        dedupe.splice(dedupe.indexOf("vue"), 1);
      }

      return {
        ssr: {
          // NOTE: Vue2 does not support webworker
          // target: "node",
        },
        optimizeDeps: {
          // include: ["@web-widget/vue"],
          // 兼容 vue2 别名
          exclude: ["vue" /*"@web-widget/vue2"*/],
        },
        resolve: {
          dedupe,
          // Patch vue2 plugin config
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
    webRouterPlugin(),
    reactPresetsPlugin(),
    vuePresetsPlugin(),
    vue2PresetsPlugin(),
  ],
  build: {
    target: ["chrome76"],
  },
});
