/* eslint-disable no-console, no-undef */
/* global setTimeout */

import { parsePath } from 'history';

// @see https://github.com/hjylewis/trashable
export function makeTrashable(promise) {
  let trash = () => {};

  const wrappedPromise = new Promise((resolve, reject) => {
    trash = () => {
      resolve = null;
      reject = null;
    };

    promise.then(
      val => {
        if (resolve) resolve(val);
      },
      error => {
        if (reject) reject(error);
      }
    );
  });

  wrappedPromise.trash = trash;
  return wrappedPromise;
}

export function reasonableTime(promise, timeout, ignore) {
  return new Promise((resolve, reject) => {
    promise.then(
      () => resolve(promise),
      error => reject(error)
    );
    setTimeout(
      () => (ignore ? resolve() : reject(new Error('Timeout'))),
      timeout
    );
  });
}

// @see https://github.com/remix-run/react-router/blob/main/packages/react-router/index.tsx#L1188
function compilePath(path, caseSensitive = false, end = true) {
  if (!(path === '*' || !path.endsWith('*') || path.endsWith('/*'))) {
    console.warn(
      `Route path "${path}" will be treated as if it were ` +
        `"${path.replace(/\*$/, '/*')}" because the \`*\` character must ` +
        `always follow a \`/\` in the pattern. To get rid of this warning, ` +
        `please change the route path to "${path.replace(/\*$/, '/*')}".`
    );
  }

  const paramNames = [];
  let regexpSource = `^${path
    .replace(/\/*\*?$/, '') // Ignore trailing / and /*, we'll handle it below
    .replace(/^\/*/, '/') // Make sure it has a leading /
    .replace(/[\\.*+^$?{}|()[\]]/g, '\\$&') // Escape special regex chars
    .replace(/:(\w+)/g, (_, paramName) => {
      paramNames.push(paramName);
      return '([^\\/]+)';
    })}`;

  if (path.endsWith('*')) {
    paramNames.push('*');
    regexpSource +=
      path === '*' || path === '/*'
        ? '(.*)$' // Already matched the initial /, just match the rest
        : '(?:\\/(.+)|\\/*)$'; // Don't include the / in params["*"]
  } else {
    regexpSource += end
      ? '\\/*$' // When matching to the end, ignore trailing slashes
      : // Otherwise, match a word boundary or a proceeding /. The word boundary restricts
        // parent routes to matching only their own words and nothing more, e.g. parent
        // route "/home" should not match "/home2".
        '(?:\\b|\\/|$)';
  }

  const matcher = new RegExp(regexpSource, caseSensitive ? undefined : 'i');

  return [matcher, paramNames];
}

function safelyDecodeURIComponent(value, paramName) {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    console.warn(
      `The value for the URL param "${paramName}" will not be decoded because` +
        ` the string "${value}" is a malformed URL segment. This is probably` +
        ` due to a bad percent encoding (${error}).`
    );

    return value;
  }
}

/**
 * Performs pattern matching on a URL pathname and returns information about
 * the match.
 *
 * @see https://reactrouter.com/docs/en/v6/api#matchpath
 */
export function matchPath(pattern, pathname) {
  if (typeof pattern === 'string') {
    pattern = { path: pattern, caseSensitive: false, end: true };
  }

  const [matcher, paramNames] = compilePath(
    pattern.path,
    pattern.caseSensitive,
    pattern.end
  );

  const match = pathname.match(matcher);
  if (!match) return null;

  const matchedPathname = match[0];
  let pathnameBase = matchedPathname.replace(/(.)\/+$/, '$1');
  const captureGroups = match.slice(1);
  const params = paramNames.reduce((memo, paramName, index) => {
    // We need to compute the pathnameBase here using the raw splat value
    // instead of using params["*"] later because it will be decoded then
    if (paramName === '*') {
      const splatValue = captureGroups[index] || '';
      pathnameBase = matchedPathname
        .slice(0, matchedPathname.length - splatValue.length)
        .replace(/(.)\/+$/, '$1');
    }

    memo[paramName] = safelyDecodeURIComponent(
      captureGroups[index] || '',
      paramName
    );
    return memo;
  }, {});

  return {
    params,
    pathname: matchedPathname,
    pathnameBase,
    pattern
  };
}

function stripBasename(pathname, basename) {
  if (basename === '/') return pathname;

  if (!pathname.toLowerCase().startsWith(basename.toLowerCase())) {
    return null;
  }

  const nextChar = pathname.charAt(basename.length);
  if (nextChar && nextChar !== '/') {
    // pathname does not start with basename/
    return null;
  }

  return pathname.slice(basename.length) || '/';
}

/**
 * Matches the given routes to a location and returns the match data.
 *
 * @see https://reactrouter.com/docs/en/v6/api#matchroutes
 */
export function matchRoutes(routes, locationArg, basename = '/') {
  const location =
    typeof locationArg === 'string' ? parsePath(locationArg) : locationArg;

  const pathname = stripBasename(location.pathname || '/', basename);

  if (pathname == null) {
    return null;
  }

  let route = null;
  for (let i = 0; i < routes.length; ++i) {
    const matches = matchPath(routes[i].path, pathname);
    if (matches) {
      route = routes[i];
      route.$pathMatch = matches;
      break;
    }
  }

  return route;
}
