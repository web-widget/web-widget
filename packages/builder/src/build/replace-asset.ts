import type { Manifest as ViteManifest, Plugin as VitePlugin } from "vite";
import { createFilter, type FilterPattern } from "@rollup/pluginutils";
import MagicString from "magic-string";

export type ReplaceAssetPluginOptions = {
  manifest: ViteManifest;
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

      const magicString = new MagicString(code);

      try {
        magicString.replace(
          ASSET_PLACEHOLDER_REG,
          (match, quotation, fileName) => {
            if (!fileName) {
              return match;
            }

            let asset = manifest[fileName];

            if (!asset) {
              const extension = extensions.find(
                (extension) => manifest[fileName + extension]
              );
              if (extension) {
                asset = manifest[fileName + extension];
              }
            }

            if (!asset) {
              return this.error(
                new TypeError(
                  `Asset not found in client build manifest: ${fileName}`
                )
              );
            }

            return quotation + base + asset.file + quotation;
          }
        );
      } catch (error) {
        return this.error(error);
      }

      return { code: magicString.toString(), map: magicString.generateMap() };
    },
  };
}
