import { createTestServer, type Server } from './server';

let server: Server;

beforeAll(async () => {
  server = await createTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('Should match snapshot', () => {
  test.each([['/about'], ['/']])(
    'Request "%s" should match snapshot',
    async (pathname, status = 200) => {
      const result = await server.fetch(`${pathname}`);
      expect(result.status).toBe(status);
      expect(result.statusText).toMatchSnapshot(`${pathname}@statusText`);
      expect(result.headers).toMatchSnapshot(`${pathname}@headers`);
      expect(await result.text()).toMatchSnapshot(`${pathname}@body`);
    }
  );
});
