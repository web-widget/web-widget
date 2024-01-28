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

export const mergePath = (...paths: string[]): string => {
  let p: string = '';
  let endsWithSlash = false;

  for (let path of paths) {
    /* ['/hey/','/say'] => ['/hey', '/say'] */
    if (p[p.length - 1] === '/') {
      p = p.slice(0, -1);
      endsWithSlash = true;
    }

    /* ['/hey','say'] => ['/hey', '/say'] */
    if (path[0] !== '/') {
      path = `/${path}`;
    }

    /* ['/hey/', '/'] => `/hey/` */
    if (path === '/' && endsWithSlash) {
      p = `${p}/`;
    } else if (path !== '/') {
      p = `${p}${path}`;
    }

    /* ['/', '/'] => `/` */
    if (path === '/' && p === '') {
      p = '/';
    }
  }

  return p;
};
