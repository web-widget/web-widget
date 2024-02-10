import { createTestServer, type Server } from './server';

let close: Server['close'], request: Server['request'];

beforeAll(async () => {
  const server = await createTestServer();
  close = server.close;
  request = server.request;
});

afterAll(async () => {
  await close();
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
    const result = await request(`${pathname}`);
    expect(result.status).toBe(status);
    expect(
      Array.from(result.headers.entries()).filter(([key]) => key !== 'date')
    ).toMatchSnapshot('headers' + pathname);
    expect(await result.text()).toMatchSnapshot('body' + pathname);
  });

  test.each([['/fetching-data'], ['/react-streaming']])(
    'Request "%s" should match status',
    async (pathname, status = 200) => {
      const result = await request(`${pathname}`);
      expect(result.status).toBe(status);
    }
  );
});
