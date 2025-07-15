import { describe, test, expect } from 'vitest';
import fetch from './fetch';

describe('Should match snapshot', () => {
  test.each([
    ['/background-tasks'],
    ['/client-only-component'],
    ['/custom-handlers'],
    ['/experimental-async-component'],
    ['/fallback'],
    /**/ ['/fallback?404', 404],
    /**/ ['/fallback?500', 500],
    /**/ ['/fallback?global-404', 404],
    /**/ ['/fallback?global-500', 500],
    [
      '/fetching-data',
      200,
      (v: string) => v.replace(/<script>.*?<\/script>/g, ''),
    ],
    ['/form'],
    ['/'],
    ['/lit-html-template'],
    ['/meta'],
    ['/react-and-vue'],
    ['/react-server-component'],
    ['/react-streaming'],
    ['/style'],
    // TODO: Fix the issue with the React import widgets.
    // ['/react-import-widgets'],
    ['/dynamic-routes', 404],
    /**/ ['/dynamic-routes/1'],
    ['/vue2-server-component'],
    ['/vue3-server-component'],
    ['/vue3-streaming'],
    ['/vue2-import-widgets'],
    ['/vue3-import-widgets'],
    ['/vue2-router'],
    /**/ ['/vue2-router/about'],
    ['/vue3-router'],
    /**/ ['/vue3-router/about'],
    ['/api/hello-world'],
    ['/api/mock-users?username=react'],
  ])(
    'Request "%s" should match snapshot',
    async (pathname, status = 200, replace = (v: string) => v) => {
      const result = await fetch(`${pathname}`);
      expect(result.status).toBe(status);
      expect(result.statusText).toMatchSnapshot(`${pathname}@statusText`);
      expect(Object.fromEntries(result.headers.entries())).toMatchSnapshot(
        `${pathname}@headers`
      );
      expect(replace(await result.text())).toMatchSnapshot(`${pathname}@body`);
    }
  );
});
