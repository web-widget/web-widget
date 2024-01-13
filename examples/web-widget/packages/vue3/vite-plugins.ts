import url from "node:url";
import path from "node:path";
import vuePlugin from "@vitejs/plugin-vue";
import vue3WebWidgetPlugin from "@web-widget/vue/vite";

const dirname = path.join(
  path.dirname(url.fileURLToPath(import.meta.url)),
  path.sep
);
const subFile = (type = "") =>
  new RegExp(
    `^${dirname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}.*${type}(?:\\?.*)?$`
  );

export function vuePresetsPlugin() {
  return [
    vuePlugin({
      include: subFile(".vue"),
    }),
    vue3WebWidgetPlugin({
      export: {
        include: subFile("@(:?route|widget).vue"),
      },
      import: {
        includeImporter: subFile(".vue"),
      },
    }),
  ];
}
