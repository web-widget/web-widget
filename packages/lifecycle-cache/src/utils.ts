import { EXPOSE } from './constants';

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

export function allowExposedToClient(object: any, key: string) {
  if (typeof key !== 'string') {
    throw new TypeError('Key must be a string.');
  }
  object[EXPOSE] ??= new Set();
  object[EXPOSE].add(key);
}
