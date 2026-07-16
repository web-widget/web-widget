/**
 * @fileoverview URL processing utility functions
 */
export const getPath = (request: Request): string => {
  const url = request.url;
  const pathStart = url.indexOf('/', url.indexOf('://') + 3);
  if (pathStart === -1) return '';

  const queryStart = url.indexOf('?', pathStart);
  return queryStart === -1
    ? url.slice(pathStart)
    : url.slice(pathStart, queryStart);
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
