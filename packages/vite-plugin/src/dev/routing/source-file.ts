import type { RouteSourceFileName, RouteSourceType } from './types';
import { getExtension, removeExtension } from './utils';

// eslint-disable-next-line regexp/no-super-linear-backtracking
const NAME_REG = /^(?<name>.*)[.@](?<type>.*)$/;
const FALLBACK_NAME_REG = /^_\d\d\d$/;
const types: RouteSourceType[] = [
  'fallback',
  'layout',
  'action',
  'middleware',
  'route',
];

export function getSourceFile(
  fileName: string,
  compoundExtensions: readonly string[] = []
) {
  const ext = getExtension(fileName, compoundExtensions);
  const base = removeExtension(fileName, compoundExtensions);
  const matched = base.match(NAME_REG);
  const groups = matched?.groups;

  if (groups && types.includes(groups.type as RouteSourceType & string)) {
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
  const statusCode = parseInt(name.slice(1), 10);
  return statusCode >= 400 && statusCode <= 599;
}
