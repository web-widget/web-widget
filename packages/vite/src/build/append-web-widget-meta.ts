import { createFilter, type FilterPattern } from "@rollup/pluginutils";
import type { LinkDescriptor } from "@web-widget/schema";
import * as esModuleLexer from "es-module-lexer";
import MagicString from "magic-string";
import mime from "mime-types";
import path from "node:path";
import type { Plugin, Manifest as ViteManifest } from "vite";

const RESOLVE_URL_REG = /^(?:\w+:)?\//;
const rebase = (src: string, base: string) => {
  return RESOLVE_URL_REG.test(src) ? src : base + src;
};

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
    name: "builder:append-web-widget-meta",
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
        link: getLinks(viteManifest, fileName, false).map(
          ({ href, ...attrs }) => {
            if (href) {
              return {
                ...attrs,
                href: rebase(href, base),
              };
            } else {
              return attrs;
            }
          }
        ),
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

function getLinks(
  manifest: ViteManifest,
  srcFileName: string,
  containSelf: boolean,
  cache = new Set()
): LinkDescriptor[] {
  if (cache.has(srcFileName)) {
    return [];
  }

  cache.add(srcFileName);

  const links: LinkDescriptor[] = [];
  const item = manifest[srcFileName];

  if (!item) {
    return [];
  }

  const push = (srcFileName: string) => {
    const ld = getLink(srcFileName);
    if (ld && !cache.has(ld.href)) {
      links.push(ld);
      cache.add(ld.href);
    }
  };

  if (containSelf) {
    push(item.file);
  }

  if (Array.isArray(item.assets)) {
    item.assets.forEach(push);
  }

  if (Array.isArray(item.css)) {
    item.css.forEach(push);
  }

  if (Array.isArray(item.imports)) {
    item.imports?.forEach((srcFileName) => {
      links.push(
        ...getLinks(manifest, srcFileName, true, cache)
          // Note: In the web router, all client components are loaded asynchronously.
          .filter((link) => link.rel !== "modulepreload")
      );
    });
  }

  if (Array.isArray(item.dynamicImports)) {
    item.dynamicImports?.forEach((srcFileName) => {
      links.push(...getLinks(manifest, srcFileName, true, cache));
    });
  }

  return links;
}

function getLink(fileName: string): LinkDescriptor | null {
  if (fileName.endsWith(".js")) {
    return {
      crossorigin: "",
      href: fileName,
      rel: "modulepreload",
    };
  } else if (fileName.endsWith(".css")) {
    return {
      href: fileName,
      rel: "stylesheet",
    };
  }

  const ext = path.extname(fileName);
  const type = mime.lookup(ext);
  const asValue = type ? type.split("/")[0] : "";

  if (type && ["image", "font"].includes(asValue)) {
    return {
      as: asValue,
      ...(asValue === "font" ? { crossorigin: "" } : {}),
      href: fileName,
      rel: "preload",
      type,
    };
  }

  return null;
}
