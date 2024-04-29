import { EXPOSED_TO_CLIENT } from './constants';

const ESCAPE_LOOKUP: { [match: string]: string } = {
  '>': '\\u003e',
  '<': '\\u003c',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};

const ESCAPE_REGEX = /[><\u2028\u2029]/g;

// This utility is based on https://github.com/zertosh/htmlescape
// License: https://github.com/zertosh/htmlescape/blob/0527ca7156a524d256101bb310a9f970f63078ad/LICENSE
export function htmlEscapeJsonString(str: string): string {
  return str.replace(ESCAPE_REGEX, (match) => ESCAPE_LOOKUP[match]);
}

export function unsafeAttrsToHtml(attrs: Record<string, string>) {
  return Object.entries(attrs)
    .map(
      ([attrName, attrValue]) =>
        `${attrName}${attrValue === '' ? '' : '="' + attrValue + '"'}`
    )
    .join(' ');
}

export function allowExposedToClient(object: any, key: string) {
  if (typeof key !== 'string') {
    throw new TypeError('Key must be a string.');
  }
  object[EXPOSED_TO_CLIENT] ??= new Set();
  object[EXPOSED_TO_CLIENT].add(key);
}
