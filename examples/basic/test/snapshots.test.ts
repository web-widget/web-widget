import routes from '../routemap.server.json';
import { createTestServer, type Server } from './server';

let server: Server;
const STATIC_ROUTES = routes.routes.filter(
  ({ pathname }) => !/[:(){}*+?]/.test(pathname)
);

beforeAll(async () => {
  server = await createTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('Should match snapshot', () => {
  test.each(STATIC_ROUTES.map((route) => [route.pathname]))(
    'Request "%s" should match snapshot',
    async (pathname) => {
      const result = await server.fetch(`${pathname}`);
      expect(result.status).toMatchSnapshot(`${pathname}@status`);
      expect(result.statusText).toMatchSnapshot(`${pathname}@statusText`);
      expect(result.headers).toMatchSnapshot(`${pathname}@headers`);
      expect(await result.text()).toMatchSnapshot(`${pathname}@body`);
    }
  );
});
