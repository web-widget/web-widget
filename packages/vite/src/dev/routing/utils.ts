import { basename, dirname, normalize } from 'node:path';

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
  if (typeof fileName === 'string') {
    const parts = fileName.trim().toLowerCase().split('.');
    if (parts.length > 1) {
      const ext = parts.pop()!.split('?')[0].split('#')[0];
      if (ext === 'ts' && parts.pop() === 'd') {
        return '.d.ts';
      }
      return '.' + ext;
    }
  }
  return '';
}

export function removeExtension(fileName: string) {
  if (typeof fileName === 'string') {
    fileName = fileName.trim();
    const ext = getExtension(fileName);
    return fileName.slice(0, fileName.length - ext.length);
  }
  return '';
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

  path = path.replace(/\\/g, '/');
  if (path.endsWith('/')) {
    path = path.slice(0, path.length - 1);
  }
  return path;
}

/**
 * Creates an id for the module, based on its path.
 */
export function createFileId(pathname: string, explicitFileType?: string) {
  let current = pathname;
  const ids: string[] = [];

  for (let i = 0; i < 25; i++) {
    let baseName = basename(current);
    baseName = baseName.replace(/[\W_]+/g, '');
    if (baseName === '') {
      baseName = '$' + i;
    } else if (!isNaN(baseName.charAt(0) as any)) {
      baseName = '$' + baseName;
    }
    ids.push(toTitleCase(baseName));

    current = normalizePath(dirname(current));
    if (current === '.') {
      break;
    }
  }

  if (ids.length > 1 && ids[0] === 'Index') {
    ids.shift();
  }

  return ids
    .reverse()
    .join('')
    .concat(toTitleCase(explicitFileType || ''));
}

export function addTrailingSlash(pathname: string) {
  const isMatchAll = pathname.endsWith('*');
  const isFile = pathname.split('/').at(-1)?.includes('.');
  if (!isMatchAll && !isFile) {
    pathname = pathname + '/';
  }
  return pathname;
}
