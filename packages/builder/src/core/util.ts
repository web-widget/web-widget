import fs from "node:fs";
import path from "node:path";
import slash from "slash";
import { fileURLToPath } from "node:url";
import { normalizePath } from "vite";
import type { ModuleLoader } from "./loader";

/** Returns true if argument is an object of any prototype/class (but not null). */
export function isObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value != null;
}

/** Cross-realm compatible URL */
export function isURL(value: unknown): value is URL {
  return Object.prototype.toString.call(value) === "[object URL]";
}

/** Wraps an object in an array. If an array is passed, ignore it. */
export function arraify<T>(target: T | T[]): T[] {
  return Array.isArray(target) ? target : [target];
}

export function padMultilineString(source: string, n = 2) {
  const lines = source.split(/\r?\n/);
  return lines.map((l) => ` `.repeat(n) + l).join(`\n`);
}

/** is a specifier an npm package? */
export function parseNpmName(
  spec: string
): { scope?: string; name: string; subpath?: string } | undefined {
  // not an npm package
  if (!spec || spec[0] === "." || spec[0] === "/") return undefined;

  let scope: string | undefined;
  let name = "";

  let parts = spec.split("/");
  if (parts[0][0] === "@") {
    scope = parts[0];
    name = parts.shift() + "/";
  }
  name += parts.shift();

  let subpath = parts.length ? `./${parts.join("/")}` : undefined;

  return {
    scope,
    name,
    subpath,
  };
}

/**
 * Convert file URL to ID for viteServer.moduleGraph.idToModuleMap.get(:viteID)
 * Format:
 *   Linux/Mac:  /Users/vue/code/my-project/src/pages/index.vue
 *   Windows:    C:/Users/vue/code/my-project/src/pages/index.vue
 */
export function viteID(filePath: URL): string {
  return slash(fileURLToPath(filePath) + filePath.search).replace(/\\/g, "/");
}

export const VALID_ID_PREFIX = `/@id/`;

// Strip valid id prefix. This is prepended to resolved Ids that are
// not valid browser import specifiers by the importAnalysis plugin.
export function unwrapId(id: string): string {
  return id.startsWith(VALID_ID_PREFIX) ? id.slice(VALID_ID_PREFIX.length) : id;
}

export function emoji(char: string, fallback: string) {
  return process.platform !== "win32" ? char : fallback;
}

export function resolveJsToTs(filePath: string) {
  if (filePath.endsWith(".jsx") && !fs.existsSync(filePath)) {
    const tryPath = filePath.slice(0, -4) + ".tsx";
    if (fs.existsSync(tryPath)) {
      return tryPath;
    }
  }
  return filePath;
}

/**
 * Resolve the hydration paths so that it can be imported in the client
 */
export function resolvePath(specifier: string, importer: string) {
  if (specifier.startsWith(".")) {
    const absoluteSpecifier = path.resolve(path.dirname(importer), specifier);
    return resolveJsToTs(normalizePath(absoluteSpecifier));
  } else {
    return specifier;
  }
}
