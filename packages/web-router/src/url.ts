/**
 * @fileoverview URL processing utility functions
 */

function extractPathname(url: string): string {
  // Optimized: RegExp is faster than indexOf() + slice()
  const match = url.match(/^https?:\/\/[^/]+(\/[^?]*)/);
  return match ? match[1] : '';
}

function normalizeTrailingSlash(path: string): string {
  return path.length > 1 && path[path.length - 1] === '/'
    ? path.slice(0, -1)
    : path;
}

export const getPathForRequest = (request: Request): string => {
  return extractPathname(request.url);
};

export const getPathForUrl = (url: URL): string => {
  return extractPathname(url.href);
};

export const getQueryStringForHref = (href: string): string => {
  const queryIndex = href.indexOf('?', 8);
  return queryIndex === -1 ? '' : '?' + href.slice(queryIndex + 1);
};

export const getPathNoStrictForRequest = (request: Request): string => {
  return normalizeTrailingSlash(getPathForRequest(request));
};

export const getPathNoStrictForUrl = (url: URL): string => {
  return normalizeTrailingSlash(getPathForUrl(url));
};
