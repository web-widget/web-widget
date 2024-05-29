import { basename, dirname } from 'node:path';
import { normalizePath } from '@/utils';

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
