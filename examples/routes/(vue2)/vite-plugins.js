import * as compiler from "vue/compiler-sfc";
import vue2 from "@vitejs/plugin-vue2";
// import type { Options } from "@vitejs/plugin-vue2";
// import type { Plugin } from "vite";
export { default as vue2WebWidgetPlugin } from "@web-widget/vue2/vite";

export function vue2Plugin(options = {}) {
  return [
    // {
    //   name: "#recover",
    //   async config() {
    //     return {
    //       resolve: {
    //         alias: [
    //           // 避免 @vitejs/plugin-vue2 覆盖配置
    //           // https://github.com/vitejs/vite-plugin-vue2/blob/main/src/index.ts#L103
    //           { find: "vue", replacement: "vue" },
    //         ],
    //       },
    //     };
    //   },
    // },
    vue2({
      compiler,
      ...options,
    }),
  ];
}
