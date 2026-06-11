/**
 * @fileoverview URL processing utility functions
 */
export const getPath = (request: Request): string => {
  // Optimized: RegExp is faster than indexOf() + slice()
  const match = request.url.match(/^https?:\/\/[^/]+(\/[^?]*)/);
  return match ? match[1] : '';
};

export const getQueryStrings = (url: string): string => {
  const queryIndex = url.indexOf('?', 8);
  return queryIndex === -1 ? '' : '?' + url.slice(queryIndex + 1);
};

export const getPathNoStrict = (request: Request): string => {
  const result = getPath(request);

  // if strict routing is false => `/hello/hey/` and `/hello/hey` are treated the same
  return result.length > 1 && result[result.length - 1] === '/'
    ? result.slice(0, -1)
    : result;
};
