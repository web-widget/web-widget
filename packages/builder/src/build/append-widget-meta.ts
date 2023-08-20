import type { LinkDescriptor, ScriptDescriptor } from "@web-widget/schema";
import * as esModuleLexer from "es-module-lexer";
import type { Manifest as ViteManifest, Plugin as VitePlugin } from "vite";
import { extname, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import mime from "mime-types";
import { createFilter, type FilterPattern } from "@rollup/pluginutils";
import MagicString from "magic-string";
import { resolve } from "import-meta-resolve";

export type AppendWidgetMetaPluginOptions = {
  manifest: ViteManifest;
  include?: FilterPattern;
  exclude?: FilterPattern;
};

export function appendWidgetMetaPlugin({
  manifest,
  include,
  exclude,
}: AppendWidgetMetaPluginOptions): VitePlugin {
  let root: string;
  let base: string;
  const CLIENT_MODULE_NAME = "@web-widget/web-widget";
  const RESOLVE_URL_REG = /^(?:\w+:)?\//;
  const filter = createFilter(include, exclude);
  const rebase = (src: string, importer: string) => {
    //return relative(dirname(importer), src);
    return RESOLVE_URL_REG.test(src) ? src : base + src;
  };

  return {
    name: "builder:append-widget-meta",
    enforce: "post",
    configResolved(resolvedConfig) {
      root = resolvedConfig.root;
      base = resolvedConfig.base;
    },
    async transform(code, id) {
      if (!filter(id)) {
        return null;
      }

      const webWidgetResolvedId = fileURLToPath(
        resolve(CLIENT_MODULE_NAME, pathToFileURL(id).href)
      );
      const webWidgetFileName = webWidgetResolvedId
        ? relative(root, webWidgetResolvedId)
        : null;
      const magicString = new MagicString(code);
      const fileName = relative(root, id);
      const meta = {
        script: webWidgetResolvedId
          ? [
              {
                type: "importmap",
                content: JSON.stringify({
                  imports: {
                    [CLIENT_MODULE_NAME]: rebase(
                      manifest[webWidgetFileName as string].file,
                      id
                    ),
                  },
                }),
              } as ScriptDescriptor,
            ]
          : [],
        link: [
          ...(webWidgetResolvedId
            ? getLinks(manifest, webWidgetFileName as string, true)
            : []),
          ...getLinks(manifest, fileName, false),
        ].map(({ href, ...attrs }) => {
          if (href) {
            return {
              ...attrs,
              href: rebase(href, id),
            };
          } else {
            return attrs;
          }
        }),
      };

      await esModuleLexer.init;
      const [, exports] = esModuleLexer.parse(code, id);

      if (exports.some(({ n }) => n === "meta")) {
        magicString.append(
          [
            ``,
            `try {`,
            `  const link = ${JSON.stringify(meta.link, null, 2)};`,
            `  const script = ${JSON.stringify(meta.script, null, 2)};`,
            `  meta.link ? meta.link.push(...link) : (meta.link = link);`,
            `  meta.script ? meta.script.push(...script) : (meta.script = script);`,
            `} catch(e) {`,
            `  throw new Error("@web-widget/builder: Failed to attach meta.", e);`,
            `}`,
          ].join("\n")
        );
      } else {
        magicString.append(
          [
            ``,
            `export const meta = {`,
            `  link: ${JSON.stringify(meta.link)},`,
            `  script: ${JSON.stringify(meta.script)},`,
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
  cache = new Map()
): LinkDescriptor[] {
  if (cache.has(srcFileName)) {
    return [];
  }

  cache.set(srcFileName, true);

  const links: LinkDescriptor[] = [];
  const item = manifest[srcFileName];

  if (!item) {
    return [];
  }

  const push = (srcFileName: string) => {
    const ld = getLink(srcFileName);
    if (ld) {
      links.push(ld);
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

  const ext = extname(fileName);
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
