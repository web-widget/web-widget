import type { Plugin as VitePlugin } from "vite";
import { createFilter, type FilterPattern } from "@rollup/pluginutils";
import MagicString from "magic-string";

export type ReplaceAssetPluginOptions = {
  /** SSR Manifest */
  manifest: Record<string, string[]>;
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

      let pos: number = 0;
      const magicString = new MagicString(code);

      try {
        magicString.replace(
          ASSET_PLACEHOLDER_REG,
          (match, quotation, fileName, start) => {
            if (!fileName) {
              return match;
            }

            let assets = manifest[fileName];

            if (!assets) {
              const extension = extensions.find(
                (extension) => manifest[fileName + extension]
              );
              if (extension) {
                assets = manifest[fileName + extension];
              }
            }

            let assetFile = assets?.find((item) => item.endsWith(".js"));
            if (!assetFile) {
              pos = start;
              throw new TypeError(
                `Asset not found in client build manifest: "${fileName}".`
              );
            }
            assetFile = assetFile.replace(/^\//, "");
            return quotation + base + assetFile + quotation;
          }
        );
      } catch (error) {
        return this.error(error, pos);
      }

      return { code: magicString.toString(), map: magicString.generateMap() };
    },
  };
}
