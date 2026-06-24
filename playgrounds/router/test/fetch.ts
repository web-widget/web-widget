import webRouter from '../entry.server';

/**
 * Synthetic origin for in-process server tests. Nothing listens on this host;
 * same-origin `fetch()` calls are routed through `webRouter.dispatch`.
 */
export const TEST_ORIGIN = 'http://test.local';

declare global {
  // eslint-disable-next-line no-var
  var __WEB_WIDGET_TEST_FETCH_PATCHED__: boolean | undefined;
}

if (!globalThis.__WEB_WIDGET_TEST_FETCH_PATCHED__) {
  const nativeFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = (input, init) => {
    const href =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const url = new URL(href, TEST_ORIGIN);

    if (url.origin === TEST_ORIGIN) {
      return webRouter.dispatch(url.href, init);
    }

    return nativeFetch(input as RequestInfo | URL, init);
  };

  globalThis.__WEB_WIDGET_TEST_FETCH_PATCHED__ = true;
}

export default async function fetch(pathname: string, options?: RequestInit) {
  return webRouter.dispatch(`${TEST_ORIGIN}${pathname}`, options);
}
