import { createFilter, type FilterPattern } from "@rollup/pluginutils";
import MagicString from "magic-string";
import Module from "node:module";
import type { Plugin, Manifest as ViteManifest } from "vite";

const require = Module.createRequire(import.meta.url);

type ViteSsrManifest = Record<string, string[]>;

export const ASSET_PROTOCOL = "asset:";
const ASSET_PLACEHOLDER_REG = /(["'`])asset:\/\/(.*?)\1/g;

export type ResolveAssetProtocolPluginOptions = {
  manifest:
    | ViteManifest
    | ViteSsrManifest
    | string
    | [ViteManifest, ViteSsrManifest]
    | [ViteSsrManifest, ViteManifest]
    | [string, string];
  include?: FilterPattern;
  exclude?: FilterPattern;
};

/**
 * Replace the asset's placeholder with the asset's path.
 */
export function resolveAssetProtocol(
  options: ResolveAssetProtocolPluginOptions
): Plugin {
  let extensions: string[] = [];
  let base: string;
  let filter: (id: string | unknown) => boolean;
  const assetMap: Map<string, string> = new Map();

  return {
    name: "builder:resolve-asset-protocol",
    enforce: "post",
    async configResolved(resolvedConfig) {
      const { manifest, include, exclude } = options;

      base = resolvedConfig.base;
      extensions = resolvedConfig.resolve.extensions;
      filter = createFilter(include, exclude);

      const manifests = (Array.isArray(manifest) ? manifest : [manifest]).map(
        (manifest) =>
          typeof manifest === "string"
            ? (require(manifest) as ViteManifest | ViteSsrManifest)
            : manifest
      );

      manifests.forEach((manifest) => {
        Object.entries(manifest).forEach(([fileName, value]) => {
          if (value.file) {
            assetMap.set(fileName, value.file);
          } else if (Array.isArray(value)) {
            const file = value.find((item) => item.endsWith(".js"));
            if (file) {
              assetMap.set(fileName, file.replace(/^\//, ""));
            }
          }
        });
      });
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

            let asset = assetMap.get(fileName);

            if (!asset) {
              asset = extensions.find((extension) =>
                assetMap.get(fileName + extension)
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
