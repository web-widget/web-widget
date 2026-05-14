import { describe, test, expect } from 'vitest';
import routes from '../routemap.server.json';
import fetch from './fetch';

const STATIC_ROUTES: { pathname: string }[] = routes.routes.filter(
  ({ pathname }) => !/[:(){}*+?]/.test(pathname)
);

STATIC_ROUTES.push({ pathname: '/examples/_404' });

const EXPECTED_STATUS: Record<string, number> = {
  '/': 307,
  '/examples/_404': 200,
};

const JSON_ROUTES = new Set(['/examples/api/hello']);

describe('Should return stable responses', () => {
  test.each(STATIC_ROUTES.map((route) => [route.pathname]))(
    'Request "%s" should return expected response',
    async (pathname) => {
      const result = await fetch(pathname);
      const expectedStatus = EXPECTED_STATUS[pathname] ?? 200;
      expect(result.status).toBe(expectedStatus);
      expect(result.headers.get('x-powered-by')).toBeTruthy();

      if (pathname === '/') {
        expect(result.headers.get('location')).toBe('/examples');
        return;
      }

      if (JSON_ROUTES.has(pathname)) {
        expect(result.headers.get('content-type')).toContain(
          'application/json'
        );
        const data = await result.json();
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBeGreaterThan(0);
        return;
      }

      expect(result.headers.get('content-type')).toContain('text/html');
      const html = await result.text();
      expect(html).toContain('<!doctype html>');
      expect(html).toContain('<main');
      if (pathname === '/examples/frameworks') {
        expect(html).toContain('Framework Coexistence Demo');
      }
    }
  );
});
