import { jest } from '@jest/globals';
import { getRoutemap, type ReadRouteSourceFiles } from './routemap-from-fs';
import type { RouteSourceFile } from '@/dev/routing/types';

describe('getRoutemap', () => {
  const root = '/project';
  const routesPath = '/project/routes';

  function source(
    type: RouteSourceFile['type'],
    name: string,
    pathname: string
  ): RouteSourceFile {
    return {
      type,
      name,
      pathname,
      ext: '.ts',
      source: `${routesPath}/${pathname || name}.ts`,
    };
  }

  test('builds and sorts a routemap from injected source files', async () => {
    const sourceFiles = [
      source('route', '[id]', 'posts/[id]'),
      source('fallback', '_404', '_404'),
      source('middleware', '[tenant]', '[tenant]'),
      source('middleware', 'auth', 'admin/auth'),
      source('route', 'new', 'posts/new'),
      source('action', '[id]', 'posts/[id]'),
      source('action', 'save', 'posts/save'),
      source('layout', 'root', 'root'),
    ];
    const readRouteSourceFiles = jest
      .fn<ReadRouteSourceFiles>()
      .mockResolvedValue(sourceFiles);

    const routemap = await getRoutemap(
      root,
      routesPath,
      '/app/',
      undefined,
      ['drafts'],
      readRouteSourceFiles
    );

    expect(readRouteSourceFiles).toHaveBeenCalledWith(routesPath, ['drafts']);
    expect(routemap).toEqual({
      routes: [
        {
          pathname: '/app/posts/new',
          module: './routes/posts/new.ts',
          status: undefined,
        },
        {
          pathname: '/app/posts/:id',
          module: './routes/posts/[id].ts',
          status: undefined,
        },
      ],
      actions: [
        {
          pathname: '/app/posts/save',
          module: './routes/posts/save.ts',
          status: undefined,
        },
        {
          pathname: '/app/posts/:id',
          module: './routes/posts/[id].ts',
          status: undefined,
        },
      ],
      middlewares: [
        {
          pathname: '/app/admin/auth',
          module: './routes/admin/auth.ts',
          status: undefined,
        },
        {
          pathname: '/app/:tenant',
          module: './routes/[tenant].ts',
          status: undefined,
        },
      ],
      fallbacks: [
        {
          pathname: undefined,
          module: './routes/_404.ts',
          status: 404,
        },
      ],
      layout: {
        pathname: undefined,
        module: './routes/root.ts',
        status: undefined,
      },
    });
  });

  test('applies pathname overrides only to route-like entries', async () => {
    const overridePathname = jest.fn((pathname: string) =>
      pathname.replace('/app', '/tenant')
    );
    const route = source('route', 'index', 'index');
    const action = source('action', 'submit', 'submit');
    const middleware = source('middleware', 'auth', 'auth');
    const fallback = source('fallback', '_500', '_500');
    const layout = source('layout', 'root', 'root');

    const routemap = await getRoutemap(
      root,
      routesPath,
      '/app/',
      overridePathname,
      [],
      async () => [route, action, middleware, fallback, layout]
    );

    expect(overridePathname).toHaveBeenCalledTimes(3);
    expect(overridePathname).toHaveBeenNthCalledWith(1, '/app', route);
    expect(overridePathname).toHaveBeenNthCalledWith(2, '/app/submit', action);
    expect(overridePathname).toHaveBeenNthCalledWith(
      3,
      '/app/auth',
      middleware
    );
    expect(routemap).toMatchObject({
      routes: [{ pathname: '/tenant' }],
      actions: [{ pathname: '/tenant/submit' }],
      middlewares: [{ pathname: '/tenant/auth' }],
      fallbacks: [{ pathname: undefined }],
      layout: { pathname: undefined },
    });
  });

  test('returns empty collections when no convention files are found', async () => {
    await expect(
      getRoutemap(root, routesPath, '', undefined, undefined, async () => [])
    ).resolves.toEqual({
      routes: [],
      actions: [],
      middlewares: [],
      fallbacks: [],
      layout: undefined,
    });
  });

  test('uses only the first layout', async () => {
    const first = source('layout', 'root', 'root');
    const second = source('layout', 'nested', 'nested');

    const routemap = await getRoutemap(
      root,
      routesPath,
      '',
      undefined,
      [],
      async () => [first, second]
    );

    expect(routemap.layout?.module).toBe('./routes/root.ts');
  });
});
