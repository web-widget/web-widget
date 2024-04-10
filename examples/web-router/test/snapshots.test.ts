import { createTestServer, type Server } from './server';

let server: Server;

beforeAll(async () => {
  server = await createTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('Should match snapshot', () => {
  test.each([
    ['/client-only-component'],
    ['/custom-handlers'],
    ['/experimental-async-component'],
    ['/fallback'],
    /**/ ['/fallback?404', 404],
    /**/ ['/fallback?500', 500],
    /**/ ['/fallback?global-404', 404],
    /**/ ['/fallback?global-500', 500],
    // NOTE: React streaming rendering cannot output a stable HTML structure.
    // ['/fetching-data'],
    ['/form'],
    ['/'],
    ['/lit-html-template'],
    ['/meta'],
    ['/react-and-vue'],
    ['/react-server-component'],
    // NOTE: React streaming rendering cannot output a stable HTML structure.
    // ['/react-streaming'],
    ['/style'],
    ['/react-import-widgets'],
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
  ])('Request "%s" should match snapshot', async (pathname, status = 200) => {
    const result = await server.fetch(`${pathname}`);
    expect(result.status).toBe(status);
    expect(result.statusText).toMatchSnapshot(`${pathname}@statusText`);
    expect(result.headers).toMatchSnapshot(`${pathname}@headers`);
    expect(Object.fromEntries(result.headers.entries())).toMatchSnapshot(
      `${pathname}@headers`
    );
  });

  test.each([['/fetching-data'], ['/react-streaming']])(
    'Request "%s" should match status',
    async (pathname, status = 200) => {
      const result = await server.fetch(`${pathname}`);
      expect(result.status).toBe(status);
      expect(result.statusText).toMatchSnapshot(`${pathname}@statusText`);
      expect(Object.fromEntries(result.headers.entries())).toMatchSnapshot(
        `${pathname}@headers`
      );
    }
  );
});
