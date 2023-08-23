import type { Plugin as VitePlugin, Manifest as ViteManifest } from "vite";
import { createFilter, type FilterPattern } from "@rollup/pluginutils";
import MagicString from "magic-string";

type ViteSsrManifest = Record<string, string[]>;

export type ReplaceAssetPluginOptions = {
  /** SSR Manifest */
  manifest:
    | ViteManifest
    | ViteSsrManifest
    | [ViteManifest, ViteSsrManifest]
    | [ViteSsrManifest, ViteManifest];
  include?: FilterPattern;
  exclude?: FilterPattern;
};

/**
 * Replace the asset's placeholder with the asset's path.
 */
export function replaceAssetPlugin({
  manifest,
  include,
  exclude,
}: ReplaceAssetPluginOptions): VitePlugin {
  let extensions: string[] = [];
  let base: string;
  const filter = createFilter(include, exclude);
  const ASSET_PLACEHOLDER_REG = /(["'`])asset:\/\/(.*?)\1/g;

  const manifests = Array.isArray(manifest) ? manifest : [manifest];
  const map: Map<string, string> = new Map();

  manifests.forEach((manifest) => {
    Object.entries(manifest).forEach(([fileName, value]) => {
      if (value.file) {
        map.set(fileName, value.file);
      } else if (Array.isArray(value)) {
        const file = value.find((item) => item.endsWith(".js"));
        if (file) {
          map.set(fileName, file.replace(/^\//, ""));
        }
      }
    });
  });

  return {
    name: "builder:replace-asset-placeholder",
    enforce: "post",
    configResolved(resolvedConfig) {
      base = resolvedConfig.base;
      extensions = resolvedConfig.resolve.extensions;
    },
    async transform(code, id) {
      if (!filter(id)) {
        return null;
      }
      // const normalize = (file: string) => {
      //   return !/^\.+\//.test(file) ? "./" + file : file;
      // };

      let pos: number = 0;
      const magicString = new MagicString(code);

      try {
        magicString.replace(
          ASSET_PLACEHOLDER_REG,
          (match, quotation, fileName, start) => {
            if (!fileName) {
              return match;
            }

            let asset = map.get(fileName);

            if (!asset) {
              asset = extensions.find((extension) =>
                map.get(fileName + extension)
              );
            }

            if (!asset) {
              pos = start;
              throw new TypeError(
                `Asset not found in client build manifest: "${fileName}".`
              );
            }

            return quotation + base + asset + quotation;
          }
        );
      } catch (error) {
        return this.error(error, pos);
      }

      return { code: magicString.toString(), map: magicString.generateMap() };
    },
  };
}
