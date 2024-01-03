import { basename, dirname, normalize } from "node:path";

/**
 * Adopted from Qwik
 *
 * https://github.com/BuilderIO/qwik/blob/main/LICENSE
 */

function toTitleCase(str: string) {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase();
  });
}

export function getExtension(fileName: string) {
  if (typeof fileName === "string") {
    const parts = fileName.trim().toLowerCase().split(".");
    if (parts.length > 1) {
      const ext = parts.pop()!.split("?")[0].split("#")[0];
      if (ext === "ts" && parts.pop() === "d") {
        return ".d.ts";
      }
      return "." + ext;
    }
  }
  return "";
}

export function removeExtension(fileName: string) {
  if (typeof fileName === "string") {
    fileName = fileName.trim();
    const ext = getExtension(fileName);
    return fileName.slice(0, fileName.length - ext.length);
  }
  return "";
}

export function normalizePath(path: string) {
  return normalizePathSlash(normalize(path));
}

export function normalizePathSlash(path: string) {
  // MIT https://github.com/sindresorhus/slash/blob/main/license
  // Convert Windows backslash paths to slash paths: foo\\bar ➔ foo/bar
  const isExtendedLengthPath = /^\\\\\?\\/.test(path);
  const hasNonAscii = /[^\u0000-\u0080]+/.test(path); // eslint-disable-line no-control-regex

  if (isExtendedLengthPath || hasNonAscii) {
    return path;
  }

  path = path.replace(/\\/g, "/");
  if (path.endsWith("/")) {
    path = path.slice(0, path.length - 1);
  }
  return path;
}

/**
 * Creates an id for the module, based on its path.
 *
 * @param routesDir
 * @param fsPath
 * @param explicitFileType Add to avoid collisions between different types of modules. `Menu` and
 *   `Layout` files are named based on their path (eg. /routes/about/menu.md => AboutMenu)
 */
export function createFileId(
  routesDir: string,
  fsPath: string,
  explicitFileType?: "Route" | "Middleware" | "Fallback" | "Layout"
) {
  const ids: string[] = [];

  for (let i = 0; i < 25; i++) {
    let baseName = removeExtension(basename(fsPath));

    baseName = baseName.replace(/[\W_]+/g, "");
    if (baseName === "") {
      baseName = "$" + i;
    } else if (!isNaN(baseName.charAt(0) as any)) {
      baseName = "$" + baseName;
    }
    ids.push(toTitleCase(baseName));

    fsPath = normalizePath(dirname(fsPath));

    if (fsPath === routesDir) {
      break;
    }
  }

  if (ids.length > 1 && ids[0] === "Index") {
    ids.shift();
  }

  return ids
    .reverse()
    .join("")
    .concat(explicitFileType || "");
}
