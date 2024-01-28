import type { RouteSourceFileName, RouteSourceType } from './types';
import { getExtension, removeExtension } from './fs';

// eslint-disable-next-line regexp/no-super-linear-backtracking
const NAME_REG = /^(?<name>.*)(?:\.|@)(?<type>.*)$/;
const FALLBACK_NAME_REG = /^_\d\d\d$/;
const types = ['fallback', 'layout', 'middleware', 'route'];

export function getSourceFile(fileName: string) {
  const ext = getExtension(fileName);
  const base = removeExtension(fileName);
  const matched = base.match(NAME_REG);
  const groups = matched?.groups;

  if (groups && types.includes(groups.type)) {
    if (groups.type === 'route') {
      if (isFallbackName(groups.name)) {
        groups.type = 'fallback';
      }
    }
    const sourceFileName: RouteSourceFileName = {
      name: groups.name,
      type: groups.type as RouteSourceType,
      ext,
    };
    return sourceFileName;
  }

  return null;
}

function isFallbackName(name: string) {
  if (!FALLBACK_NAME_REG.test(name)) {
    return false;
  }
  try {
    const statusCode = parseInt(name.slice(1), 10);
    return statusCode >= 400 && statusCode <= 599;
  } catch (e) {
    //
  }
  return false;
}
