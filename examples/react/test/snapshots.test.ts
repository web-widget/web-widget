import { describe, test, expect } from 'vitest';
import routes from '../routemap.server.json';
import fetch from './fetch';

const STATIC_ROUTES: { pathname: string }[] = routes.routes.filter(
  ({ pathname }) => !/[:(){}*+?]/.test(pathname)
);

STATIC_ROUTES.push({ pathname: '/examples/_404' });

// Replace local file paths with placeholders to ensure snapshots are consistent across different devices
function replaceLocalPaths(content: string): string {
  return (
    content
      // Replace all file:// protocol URLs
      .replace(/file:\/\/\/[^"'\s>]+/g, 'file:///LOCAL_PATH')
  );
}

describe('Should match snapshot', () => {
  test.each(STATIC_ROUTES.map((route) => [route.pathname]))(
    'Request "%s" should match snapshot',
    async (pathname) => {
      const result = await fetch(`${pathname}`);
      expect(result.status).toMatchSnapshot(`${pathname}@status`);
      expect(result.statusText).toMatchSnapshot(`${pathname}@statusText`);
      expect(Object.fromEntries(result.headers.entries())).toMatchSnapshot(
        `${pathname}@headers`
      );
      expect(replaceLocalPaths(await result.text())).toMatchSnapshot(
        `${pathname}@body`
      );
    }
  );
});
