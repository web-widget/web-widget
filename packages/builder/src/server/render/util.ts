import url from "node:url";
import slash from "slash";
import { isCSSRequest } from "vite";

const rawRE = /(?:\?|&)raw(?:&|$)/;
const inlineRE = /(?:\?|&)inline\b/;

export { isCSSRequest };

export const isBuildableCSSRequest = (request: string): boolean =>
  isCSSRequest(request) && !rawRE.test(request) && !inlineRE.test(request);

/**
 * Convert file URL to ID for viteServer.moduleGraph.idToModuleMap.get(:viteID)
 * Format:
 *   Linux/Mac:  /Users/vue/code/my-project/src/pages/index.vue
 *   Windows:    C:/Users/vue/code/my-project/src/pages/index.vue
 */
export function viteID(filePath: URL): string {
  return slash(url.fileURLToPath(filePath) + filePath.search).replace(
    /\\/g,
    "/"
  );
}

export const VALID_ID_PREFIX = `/@id/`;

// Strip valid id prefix. This is prepended to resolved Ids that are
// not valid browser import specifiers by the importAnalysis plugin.
export function unwrapId(id: string): string {
  return id.startsWith(VALID_ID_PREFIX) ? id.slice(VALID_ID_PREFIX.length) : id;
}
