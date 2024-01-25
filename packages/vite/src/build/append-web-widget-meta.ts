import path from "node:path";
import { createFilter, type FilterPattern } from "@rollup/pluginutils";
import * as esModuleLexer from "es-module-lexer";
import MagicString from "magic-string";
import type { Plugin, Manifest as ViteManifest } from "vite";
import { getLinks } from "./utils";

export type AppendWebWidgetMetaPluginOptions = {
  manifest: ViteManifest | string;
  include?: FilterPattern;
  exclude?: FilterPattern;
};

export function appendWebWidgetMetaPlugin(
  options: AppendWebWidgetMetaPluginOptions
): Plugin {
  let root: string;
  let base: string;
  let viteManifest: ViteManifest;
  let filter: (id: string | unknown) => boolean;

  return {
    name: "@widget:append-web-widget-meta",
    enforce: "post",
    async configResolved(resolvedConfig) {
      const { manifest, include, exclude } = options;
      root = resolvedConfig.root;
      base = resolvedConfig.base;
      viteManifest =
        typeof manifest === "string"
          ? ((
              await import(manifest, {
                assert: {
                  type: "json",
                },
              })
            ).default as ViteManifest)
          : manifest;
      filter = createFilter(include, exclude);
    },
    async transform(code, id) {
      if (!filter(id)) {
        return null;
      }

      const magicString = new MagicString(code);
      const fileName = path.relative(root, id);
      const meta = {
        link: getLinks(viteManifest, fileName, base, false),
      };

      await esModuleLexer.init;
      const [, exports] = esModuleLexer.parse(code, id);
      const metaExport = exports.find(({ n: name }) => name === "meta");
      if (metaExport) {
        const { n: name, ln: localName } = metaExport;
        const metaExportName = localName ?? name;
        magicString.append(
          [
            ``,
            `;((meta) => {`,
            `  const link = ${JSON.stringify(meta.link, null, 2)};`,
            `  meta.link ? meta.link.push(...link) : (meta.link = link);`,
            `})(${metaExportName});`,
          ].join("\n")
        );
      } else {
        magicString.append(
          [
            ``,
            `export const meta = {`,
            `  link: ${JSON.stringify(meta.link)},`,
            `};`,
          ].join("\n")
        );
      }

      return { code: magicString.toString(), map: magicString.generateMap() };
    },
  };
}
