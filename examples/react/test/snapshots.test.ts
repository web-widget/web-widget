import { describe, test, expect } from 'vitest';
import routes from '../routemap.server.json';
import fetch from './fetch';

const STATIC_ROUTES = routes.routes.filter(
  ({ pathname }) => !/[:(){}*+?]/.test(pathname)
);

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
      expect(await result.text()).toMatchSnapshot(`${pathname}@body`);
    }
  );
});
