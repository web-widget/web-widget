import { basename, dirname } from 'node:path';
import { normalizePath } from '@/internal/path';
import { ROUTE_OR_WIDGET_MARKER_AT_END_PATTERN } from '@/internal/module-conventions';

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
      if (['ts', 'tsx', 'js', 'jsx'].includes(ext)) {
        const sub = parts.pop();
        if (sub === 'd' && ext === 'ts') {
          return '.d.ts';
        }
        const marker = parts.at(-1);
        if (
          sub &&
          marker &&
          ROUTE_OR_WIDGET_MARKER_AT_END_PATTERN.test(marker)
        ) {
          return '.' + sub + '.' + ext;
        }
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

function isFilePathname(pathname: string) {
  const basename = pathname.split('/').at(-1);
  // Match: /foo/bar/index.html
  // Mismatch: /foo/bar/(.*)
  return basename && /[^(]\.[^)]+/.test(basename);
}

export function addTrailingSlash(pathname: string) {
  if (!pathname.endsWith('/')) {
    if (!isFilePathname(pathname)) {
      return pathname + '/';
    }
  }
  return pathname;
}
