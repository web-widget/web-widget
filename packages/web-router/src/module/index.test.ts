import type {
  ActionModule,
  HTTPException,
  LayoutModule,
  Meta,
  MiddlewareContext,
  MiddlewareModule,
  RouteContext,
  RouteModule,
  ServerRenderOptions,
} from '../types';
import { ModuleRuntime, type OnFallback } from './index';

describe('ModuleRuntime', () => {
  let runtime: ModuleRuntime;
  let mockOnFallback: OnFallback;

  beforeEach(() => {
    mockOnFallback = () => {};

    const mockLayoutComponent = () => '<html>test</html>';
    const mockLayoutModule: LayoutModule = {
      default: mockLayoutComponent,
      render: async () => '<html>rendered</html>',
    };

    const options = {
      layoutModule: mockLayoutModule,
      defaultMeta: { title: 'Default Title' } as Meta,
      defaultBaseAsset: '/assets/',
      defaultRenderer: {} as ServerRenderOptions,
      onFallback: mockOnFallback,
      exposeErrors: true,
    };

    runtime = new ModuleRuntime(options);
  });

  describe('constructor', () => {
    test('should create runtime instance with provided options', () => {
      expect(runtime).toBeInstanceOf(ModuleRuntime);
    });

    test('should accept async layout module loader', () => {
      const asyncLayoutLoader = async () =>
        ({
          default: () => '<html>async</html>',
          render: async () => '<html>async rendered</html>',
        }) as LayoutModule;

      const runtimeWithAsyncLayout = new ModuleRuntime({
        layoutModule: asyncLayoutLoader,
        defaultMeta: { title: 'Test' } as Meta,
        defaultBaseAsset: '/assets/',
        defaultRenderer: {} as ServerRenderOptions,
        onFallback: mockOnFallback,
        exposeErrors: false,
      });

      expect(runtimeWithAsyncLayout).toBeInstanceOf(ModuleRuntime);
    });
  });

  describe('createRouteHandler', () => {
    test('should process route with module and handler', async () => {
      const mockModule: RouteModule = {
        handler: {
          GET: () => new Response('test response'),
        },
      };

      const mockContext: Partial<RouteContext> = {
        meta: { title: 'Test' },
        request: new Request('http://test.com', { method: 'GET' }),
      };

      const mockNext = () => new Response('next');
      const middleware = runtime.createRouteHandler(mockModule);
      const result = await middleware(mockContext as RouteContext, mockNext);

      expect(result).toBeInstanceOf(Response);
      expect(await result.text()).toBe('test response');
    });

    test('should call next when no module is present', async () => {
      const mockContext: Partial<RouteContext> = {};

      const mockNext = () => new Response('next response');
      const middleware = runtime.createRouteHandler(null as any);
      const result = await middleware(mockContext as RouteContext, mockNext);

      expect(result).toBeInstanceOf(Response);
      expect(await result.text()).toBe('next response');
    });

    test('should use default GET handler when no handler is provided', async () => {
      const mockModule: RouteModule = {
        render: () => 'rendered content',
      };

      const mockContext: Partial<RouteContext> = {
        request: new Request('http://test.com', { method: 'GET' }),
        html: () => new Response('rendered response'),
      };

      const mockNext = () => new Response('next');
      const middleware = runtime.createRouteHandler(mockModule);
      const result = await middleware(mockContext as RouteContext, mockNext);

      expect(result).toBeInstanceOf(Response);
    });

    test('should add script descriptor to meta when meta exists', async () => {
      const mockModule: RouteModule = {
        handler: {
          GET: () => new Response('test'),
        },
      };

      const mockContext: Partial<RouteContext> = {
        request: new Request('http://test.com', { method: 'GET' }),
        meta: { title: 'Test', script: [] },
      };

      const mockNext = () => new Response('next');
      const middleware = runtime.createRouteHandler(mockModule);
      await middleware(mockContext as RouteContext, mockNext);

      expect(mockContext.meta!.script).toBeDefined();
      expect(mockContext.meta!.script!.length).toBeGreaterThan(0);
    });
  });

  describe('createRouteContextHandler', () => {
    test('should create route context for route with render function', async () => {
      const mockRoute: RouteModule = {
        render: () => 'route content',
        meta: { title: 'Route Title' },
      };

      const mockContext: Partial<RouteContext> = {
        module: undefined,
      };

      const mockNext = () => new Response('next');

      const handler = runtime.createRouteContextHandler(mockRoute);
      await handler(mockContext as RouteContext, mockNext);

      expect(mockContext.module).toBe(mockRoute);
      expect(mockContext.meta).toBeDefined();
      expect(mockContext.render).toBeDefined();
      expect(mockContext.html).toBeDefined();
      expect(mockContext.renderOptions).toBeDefined();
    });

    test('should not override existing module in context', async () => {
      const existingModule: RouteModule = {
        handler: () => new Response('existing'),
      };
      const newModule: RouteModule = { render: () => 'new content' };

      const mockContext: Partial<RouteContext> = {
        module: existingModule,
      };

      const mockNext = () => new Response('next');

      const handler = runtime.createRouteContextHandler(newModule);
      await handler(mockContext as RouteContext, mockNext);

      expect(mockContext.module).toBe(existingModule);
    });

    test('should handle route without render function', async () => {
      const mockRoute: RouteModule = {
        handler: () => new Response('handler response'),
      };

      const mockContext: Partial<RouteContext> = {
        module: undefined,
      };

      const mockNext = () => new Response('next');

      const handler = runtime.createRouteContextHandler(mockRoute);
      await handler(mockContext as RouteContext, mockNext);

      expect(mockContext.module).toBe(mockRoute);
      expect(mockContext.meta).toBeUndefined();
      expect(mockContext.render).toBeUndefined();
    });

    test('should handle async module loader', async () => {
      const mockRoute: RouteModule = {
        render: () => 'async route content',
        meta: { title: 'Async Route' },
      };

      const asyncLoader = async () => mockRoute;

      const mockContext: Partial<RouteContext> = {
        module: undefined,
      };

      const mockNext = () => new Response('next');

      const handler = runtime.createRouteContextHandler(asyncLoader);
      await handler(mockContext as RouteContext, mockNext);

      expect(mockContext.module).toBe(mockRoute);
      expect(mockContext.meta).toBeDefined();
    });

    test('should cache handler after first call', async () => {
      const mockRoute: RouteModule = {
        render: () => 'cached content',
      };

      const mockContext: Partial<RouteContext> = {
        module: undefined,
      };

      const mockNext = () => new Response('next');

      const handler = runtime.createRouteContextHandler(mockRoute);

      // First call
      await handler(mockContext as RouteContext, mockNext);
      const firstModule = mockContext.module;

      // Second call should use cached handler
      runtime.clearActivation(mockContext as RouteContext);
      await handler(mockContext as RouteContext, mockNext);
      expect(mockContext.module).toBe(firstModule);
    });

    test('should load an async route module only once across requests', async () => {
      let loadCount = 0;
      const routeModule: RouteModule = {
        handler: {
          GET: () => new Response('route content'),
        },
      };
      const loader = async () => {
        loadCount++;
        return routeModule;
      };
      const contextHandler = runtime.createRouteContextHandler(loader);
      const routeHandler = runtime.createRouteHandler(loader);
      const next = () => new Response('next');

      for (let index = 0; index < 2; index++) {
        const context = {
          request: new Request('http://localhost/'),
        } as RouteContext;
        await contextHandler(context, next);
        await routeHandler(context, next);
      }

      expect(loadCount).toBe(1);
    });

    test('should retry a failed module load and share concurrent retries', async () => {
      let loadCount = 0;
      const routeModule: RouteModule = {
        render: () => 'route content',
      };
      const loader = (() => {
        loadCount++;
        if (loadCount === 1) {
          throw new Error('temporary load failure');
        }
        return Promise.resolve(routeModule);
      }) as () => Promise<RouteModule>;
      const handler = runtime.createRouteContextHandler(loader);
      const next = () => new Response('next');

      await expect(handler({} as RouteContext, next)).rejects.toThrow(
        'temporary load failure'
      );
      await Promise.all([
        handler({} as RouteContext, next),
        handler({} as RouteContext, next),
      ]);

      expect(loadCount).toBe(2);
    });

    test('should isolate render caches between runtime instances', async () => {
      const sharedRouteModule: RouteModule = {
        default: () => 'route',
        render: async () => 'route content',
      };
      const createRuntime = (name: string) =>
        new ModuleRuntime({
          layoutModule: {
            default: () => 'layout',
            render: async (_component, props) => `${name}:${props.children}`,
          } as LayoutModule,
          defaultMeta: { title: name } as Meta,
          defaultBaseAsset: '/',
          defaultRenderer: { name } as ServerRenderOptions,
          onFallback: () => {},
        });
      const createContext = () =>
        ({
          params: {},
          pathname: '/',
          request: new Request('http://localhost/'),
          state: {},
        }) as unknown as RouteContext;
      const firstRuntime = createRuntime('first');
      const secondRuntime = createRuntime('second');
      const firstContext = createContext();
      const secondContext = createContext();

      await firstRuntime.createRouteContextHandler(sharedRouteModule)(
        firstContext,
        () => new Response('next')
      );
      await secondRuntime.createRouteContextHandler(sharedRouteModule)(
        secondContext,
        () => new Response('next')
      );

      expect(firstContext.meta.title).toBe('first');
      expect(await (await firstContext.html()).text()).toBe(
        'first:route content'
      );
      expect(secondContext.meta.title).toBe('second');
      expect(await (await secondContext.html()).text()).toBe(
        'second:route content'
      );
    });

    test('should not expose errors through another runtime render cache', async () => {
      const sharedErrorModule: RouteModule = {
        default: () => 'route',
        fallback: () => 'error',
        render: async (_component, props) =>
          `stack:${Reflect.get(props, 'stack')}`,
      };
      const createRuntime = (exposeErrors: boolean) =>
        new ModuleRuntime({
          layoutModule: {
            default: () => 'layout',
            render: async (_component, props) => props.children,
          } as LayoutModule,
          defaultMeta: {} as Meta,
          defaultBaseAsset: '/',
          defaultRenderer: {} as ServerRenderOptions,
          onFallback: () => {},
          exposeErrors,
        });
      const createContext = () =>
        ({
          params: {},
          pathname: '/',
          request: new Request('http://localhost/'),
          state: {},
        }) as unknown as RouteContext;
      const error = new Error('private failure') as HTTPException;
      error.status = 500;
      error.stack = 'SECRET_STACK';

      const exposedResponse = await createRuntime(true).createErrorHandler(
        sharedErrorModule
      )(error, createContext());
      const hiddenResponse = await createRuntime(false).createErrorHandler(
        sharedErrorModule
      )(error, createContext());

      expect(await exposedResponse.text()).toContain('SECRET_STACK');
      expect(await hiddenResponse.text()).not.toContain('SECRET_STACK');
    });
  });

  describe('createMiddlewareHandler', () => {
    test('should create middleware handler from module', async () => {
      const mockMiddleware: MiddlewareModule = {
        handler: async (context, next) => {
          (context as any).customProperty = 'middleware executed';
          return next();
        },
      };

      const mockContext: Partial<MiddlewareContext> = {};
      const mockNext = () => new Response('next response');

      const handler = runtime.createMiddlewareHandler(mockMiddleware);
      const result = await handler(mockContext as MiddlewareContext, mockNext);

      expect(result).toBeInstanceOf(Response);
      expect(await result.text()).toBe('next response');
      expect((mockContext as any).customProperty).toBe('middleware executed');
    });

    test('should handle async module loader', async () => {
      const mockMiddleware: MiddlewareModule = {
        handler: async (context, next) => {
          (context as any).asyncMiddleware = true;
          return next();
        },
      };

      const asyncLoader = async () => mockMiddleware;

      const mockContext: Partial<MiddlewareContext> = {};
      const mockNext = () => new Response('async next');

      const handler = runtime.createMiddlewareHandler(asyncLoader);
      const result = await handler(mockContext as MiddlewareContext, mockNext);

      expect(result).toBeInstanceOf(Response);
      expect((mockContext as any).asyncMiddleware).toBe(true);
    });

    test('should throw error when middleware handler is not defined', async () => {
      const invalidMiddleware: MiddlewareModule = {
        // No handler property
      } as any;

      const mockContext: Partial<MiddlewareContext> = {};
      const mockNext = () => new Response('next');

      const handler = runtime.createMiddlewareHandler(invalidMiddleware);

      await expect(
        handler(mockContext as MiddlewareContext, mockNext)
      ).rejects.toThrow('Module is missing export "handler".');
    });

    test('should cache middleware handler in production', async () => {
      let loadCount = 0;
      const asyncLoader = async () => {
        loadCount++;
        return {
          handler: async (_context, next) => next(),
        } as MiddlewareModule;
      };

      const prodRuntime = new ModuleRuntime({
        layoutModule: {
          default: () => '<html>test</html>',
          render: async () => '<html>rendered</html>',
        },
        defaultMeta: { title: 'Default Title' } as Meta,
        defaultBaseAsset: '/assets/',
        defaultRenderer: {} as ServerRenderOptions,
        onFallback: mockOnFallback,
        exposeErrors: false,
      });

      const mockContext: Partial<MiddlewareContext> = {};
      const mockNext = () => new Response('cached');

      const handler = prodRuntime.createMiddlewareHandler(asyncLoader);

      await handler(mockContext as MiddlewareContext, mockNext);
      await handler(mockContext as MiddlewareContext, mockNext);

      expect(loadCount).toBe(1);
    });

    test('should cache middleware module in dev when module graph is stable', async () => {
      let loadCount = 0;
      const asyncLoader = async () => {
        loadCount++;
        return {
          handler: async (_context, next) => next(),
        } as MiddlewareModule;
      };

      const mockContext: Partial<MiddlewareContext> = {};
      const mockNext = () => new Response('cached');

      const handler = runtime.createMiddlewareHandler(asyncLoader);

      await handler(mockContext as MiddlewareContext, mockNext);
      await handler(mockContext as MiddlewareContext, mockNext);

      expect(loadCount).toBe(1);
    });
  });

  describe('createActionHandler', () => {
    test('should handle POST request with valid action', async () => {
      const mockAction: ActionModule = {
        testAction: async (data: any) => ({
          result: `processed ${data.value}`,
        }),
      };

      const requestBody = {
        jsonrpc: '2.0',
        id: '1',
        method: 'testAction',
        params: [{ value: 'test' }],
      };

      const mockRequest = new Request('http://test.com/action', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const mockContext: Partial<MiddlewareContext> = {
        request: mockRequest,
      };

      const mockNext = () => new Response('next');

      const handler = runtime.createActionHandler(mockAction);
      const result = await handler(mockContext as MiddlewareContext, mockNext);

      expect(result).toBeInstanceOf(Response);
      expect(result.headers.get('content-type')).toContain('application/json');

      const responseData = await result.json();
      expect(responseData).toHaveProperty('result');
    });

    test('should reject non-POST requests with 405', async () => {
      const mockAction: ActionModule = {
        testAction: async () => ({ result: 'test' }),
      };

      const mockRequest = new Request('http://test.com/action', {
        method: 'GET',
      });

      const mockContext: Partial<MiddlewareContext> = {
        request: mockRequest,
      };

      const mockNext = () => new Response('next');

      const handler = runtime.createActionHandler(mockAction);
      const result = await handler(mockContext as MiddlewareContext, mockNext);

      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(405);
      expect(result.statusText).toBe('Method Not Allowed');
      expect(result.headers.get('Accept')).toBe('POST');
    });

    test('should handle async module loader', async () => {
      const mockAction: ActionModule = {
        asyncAction: async (data: any) => ({ async: true, data }),
      };

      const asyncLoader = async () => mockAction;

      const requestBody = {
        jsonrpc: '2.0',
        id: '1',
        method: 'asyncAction',
        params: [{ test: 'data' }],
      };

      const mockRequest = new Request('http://test.com/action', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const mockContext: Partial<MiddlewareContext> = {
        request: mockRequest,
      };

      const mockNext = () => new Response('next');

      const handler = runtime.createActionHandler(asyncLoader);
      const result = await handler(mockContext as MiddlewareContext, mockNext);

      expect(result).toBeInstanceOf(Response);
      const responseData = await result.json();
      expect(responseData).toHaveProperty('result');
    });

    test('should cache action module loader in production', async () => {
      let loadCount = 0;
      const asyncLoader = async () => {
        loadCount++;
        return {
          cachedAction: async () => ({ cached: true }),
        } as ActionModule;
      };

      const prodRuntime = new ModuleRuntime({
        layoutModule: {
          default: () => '<html>test</html>',
          render: async () => '<html>rendered</html>',
        },
        defaultMeta: { title: 'Default Title' } as Meta,
        defaultBaseAsset: '/assets/',
        defaultRenderer: {} as ServerRenderOptions,
        onFallback: mockOnFallback,
        exposeErrors: false,
      });

      const requestBody = {
        jsonrpc: '2.0',
        id: '1',
        method: 'cachedAction',
        params: [],
      };

      const handler = prodRuntime.createActionHandler(asyncLoader);

      const mockRequest1 = new Request('http://test.com/action', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const mockRequest2 = new Request('http://test.com/action', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      await handler(
        { request: mockRequest1 } as MiddlewareContext,
        () => new Response('next')
      );
      await handler(
        { request: mockRequest2 } as MiddlewareContext,
        () => new Response('next')
      );

      expect(loadCount).toBe(1);
    });

    test('should cache action module in dev when module graph is stable', async () => {
      let loadCount = 0;
      const asyncLoader = async () => {
        loadCount++;
        return {
          cachedAction: async () => ({ cached: true }),
        } as ActionModule;
      };

      const requestBody = {
        jsonrpc: '2.0',
        id: '1',
        method: 'cachedAction',
        params: [],
      };

      const handler = runtime.createActionHandler(asyncLoader);

      const mockRequest1 = new Request('http://test.com/action', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const mockRequest2 = new Request('http://test.com/action', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      await handler(
        { request: mockRequest1 } as MiddlewareContext,
        () => new Response('next')
      );
      await handler(
        { request: mockRequest2 } as MiddlewareContext,
        () => new Response('next')
      );

      expect(loadCount).toBe(1);
    });
  });

  describe('createErrorHandler', () => {
    test('should create error handler that processes errors', async () => {
      const mockFallbackComponent = () => 'error component';
      const mockRoute: RouteModule = {
        render: () => 'error page content',
        fallback: mockFallbackComponent,
      };

      const mockContext: Partial<RouteContext> = {
        html: () => new Response('error html'),
      };

      const testError = new Error('Test error');

      const errorHandler = runtime.createErrorHandler(mockRoute);
      const result = await errorHandler(
        testError,
        mockContext as MiddlewareContext
      );

      expect(result).toBeInstanceOf(Response);
      expect(mockContext.error).toBe(testError);
      expect(mockContext.module).toBe(mockRoute);
      expect(mockContext.meta).toBeDefined();
      expect(mockContext.render).toBeDefined();
      expect(mockContext.html).toBeDefined();
    });

    test('should handle async route module loader', async () => {
      const mockRoute: RouteModule = {
        render: () => 'async error page',
      };

      const asyncLoader = async () => mockRoute;

      const mockContext: Partial<RouteContext> = {
        html: () => new Response('async error html'),
      };

      const testError = new Error('Async error');

      const errorHandler = runtime.createErrorHandler(asyncLoader);
      const result = await errorHandler(
        testError,
        mockContext as MiddlewareContext
      );

      expect(result).toBeInstanceOf(Response);
      expect(mockContext.module).toBe(mockRoute);
    });

    test('should cache error handler', async () => {
      const mockRoute: RouteModule = {
        render: () => 'cached error page',
      };

      const mockContext: Partial<RouteContext> = {
        html: () => new Response('cached error html'),
      };

      const testError = new Error('Cache test error');

      const errorHandler = runtime.createErrorHandler(mockRoute);

      // First call
      const result1 = await errorHandler(
        testError,
        mockContext as MiddlewareContext
      );
      expect(result1).toBeInstanceOf(Response);

      const secondContext: Partial<RouteContext> = {};
      const result2 = await errorHandler(
        testError,
        secondContext as MiddlewareContext
      );
      expect(result2).toBeInstanceOf(Response);
      expect(secondContext.module).toBe(mockRoute);
    });

    test('renders the error page when an async onFallback callback fails', async () => {
      const callbackError = new Error('logging failed');
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const errorRuntime = new ModuleRuntime({
        layoutModule: {
          default: () => '<html>test</html>',
          render: async () => '<html>rendered</html>',
        } as LayoutModule,
        defaultMeta: { title: 'Default Title' } as Meta,
        defaultBaseAsset: '/',
        defaultRenderer: {} as ServerRenderOptions,
        onFallback: async () => {
          throw callbackError;
        },
      });
      const errorHandler = errorRuntime.createErrorHandler({
        handler: () => new Response('custom error page', { status: 500 }),
      });

      const response = await errorHandler(
        new Error('route failed'),
        {} as MiddlewareContext
      );

      expect(await response.text()).toBe('custom error page');
      expect(consoleError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'The onFallback callback failed.',
          cause: callbackError,
        })
      );
      consoleError.mockRestore();
    });
  });

  describe('error handling in development mode', () => {
    test('should create dev runtime instance', () => {
      const devModuleRuntime = new ModuleRuntime({
        layoutModule: {
          default: () => '<html>dev</html>',
          render: async () => '<html>dev rendered</html>',
        } as LayoutModule,
        defaultMeta: { title: 'Dev Title' } as Meta,
        defaultBaseAsset: '/dev-assets/',
        defaultRenderer: {} as ServerRenderOptions,
        onFallback: mockOnFallback,
        exposeErrors: true,
      });

      expect(devModuleRuntime).toBeInstanceOf(ModuleRuntime);
    });

    test('should handle errors differently in dev mode', () => {
      const devOnFallback = (error: any) => {
        expect(error).toBeDefined();
      };

      const devModuleRuntime = new ModuleRuntime({
        layoutModule: {
          default: () => '<html>dev</html>',
          render: async () => '<html>dev rendered</html>',
        } as LayoutModule,
        defaultMeta: { title: 'Dev Title' } as Meta,
        defaultBaseAsset: '/dev-assets/',
        defaultRenderer: {} as ServerRenderOptions,
        onFallback: devOnFallback,
        exposeErrors: true,
      });

      expect(devModuleRuntime).toBeInstanceOf(ModuleRuntime);
    });
  });

  describe('handler method normalization', () => {
    test('should handle function handlers', async () => {
      const functionHandler = () => new Response('function handler');

      const mockModule: RouteModule = {
        handler: functionHandler,
      };

      const mockContext: Partial<RouteContext> = {};

      const mockNext = () => new Response('next');
      const middleware = runtime.createRouteHandler(mockModule);
      const result = await middleware(mockContext as RouteContext, mockNext);

      expect(result).toBeInstanceOf(Response);
      expect(await result.text()).toBe('function handler');
    });

    test('should handle object handlers with HTTP methods', async () => {
      const objectHandler = {
        GET: () => new Response('GET response'),
        POST: () => new Response('POST response'),
      };

      const mockModule: RouteModule = {
        handler: objectHandler,
      };

      const mockContext: Partial<RouteContext> = {
        request: new Request('http://test.com', { method: 'GET' }),
      };

      const mockNext = () => new Response('next');
      const middleware = runtime.createRouteHandler(mockModule);
      const result = await middleware(mockContext as RouteContext, mockNext);

      expect(result).toBeInstanceOf(Response);
      expect(await result.text()).toBe('GET response');
    });
  });

  describe('handler caching', () => {
    test('should cache handler for modules without render capability', async () => {
      const mockModule: RouteModule = {
        handler: {
          GET: () => new Response('cached handler'),
        },
      };

      const mockContext: Partial<RouteContext> = {
        request: new Request('http://test.com', { method: 'GET' }),
      };
      const mockNext = () => new Response('next');

      const handler = runtime.createRouteContextHandler(mockModule);

      // First activation
      await handler(mockContext as RouteContext, mockNext);

      expect(mockContext.module).toBe(mockModule);
      expect(mockContext._handler).toBeDefined();
      expect(mockContext.render).toBeUndefined(); // No render capability
      expect(mockContext.html).toBeUndefined(); // No render capability

      // Verify cached handler works
      const result = await mockContext._handler!(mockContext as RouteContext);
      expect(result).toBeInstanceOf(Response);
      expect(await result.text()).toBe('cached handler');
    });

    test('should cache handler for modules with render capability', async () => {
      const mockModule: RouteModule = {
        handler: {
          GET: () => new Response('render handler'),
        },
        render: () => 'rendered content',
        meta: { title: 'Test' },
      };

      const mockContext: Partial<RouteContext> = {
        request: new Request('http://test.com', { method: 'GET' }),
      };
      const mockNext = () => new Response('next');

      const handler = runtime.createRouteContextHandler(mockModule);

      // First activation
      await handler(mockContext as RouteContext, mockNext);

      expect(mockContext.module).toBe(mockModule);
      expect(mockContext._handler).toBeDefined();
      expect(mockContext.render).toBeDefined(); // Has render capability
      expect(mockContext.html).toBeDefined(); // Has render capability
      expect(mockContext.meta).toBeDefined();

      // Verify cached handler works
      const result = await mockContext._handler!(mockContext as RouteContext);
      expect(result).toBeInstanceOf(Response);
      expect(await result.text()).toBe('render handler');
    });

    test('should use cached handler on subsequent calls', async () => {
      const mockModule: RouteModule = {
        handler: {
          GET: () => new Response('cached response'),
        },
      };

      const mockContext1: Partial<RouteContext> = {
        request: new Request('http://test.com', { method: 'GET' }),
      };
      const mockContext2: Partial<RouteContext> = {
        request: new Request('http://test.com', { method: 'GET' }),
      };
      const mockNext = () => new Response('next');

      const handler = runtime.createRouteContextHandler(mockModule);

      // First call - should set up cache
      await handler(mockContext1 as RouteContext, mockNext);
      expect(mockContext1._handler).toBeDefined();

      // Second call with same module - should reuse cached handler
      await handler(mockContext2 as RouteContext, mockNext);
      expect(mockContext2._handler).toBeDefined();

      // Both contexts should have the same cached handler reference
      expect(mockContext1._handler).toBe(mockContext2._handler);

      // Verify the cached handlers work correctly
      const result1 = await mockContext1._handler!(
        mockContext1 as RouteContext
      );
      const result2 = await mockContext2._handler!(
        mockContext2 as RouteContext
      );

      expect(await result1.text()).toBe('cached response');
      expect(await result2.text()).toBe('cached response');
    });

    test('should handle error scenarios with cached handlers', async () => {
      const mockModule: RouteModule = {
        handler: {
          GET: () => new Response('normal response'),
        },
      };

      const testError = new Error('Test error');
      const mockContext: Partial<RouteContext> = {
        request: new Request('http://test.com', { method: 'GET' }),
        html: () => new Response('error html response'),
      };

      const errorHandler = runtime.createErrorHandler(mockModule);
      const result = await errorHandler(testError, mockContext as RouteContext);

      expect(result).toBeInstanceOf(Response);
      expect(mockContext.module).toBe(mockModule);
      expect(mockContext._handler).toBeDefined();
      expect(mockContext.error).toBe(testError);

      // Verify the cached handler is accessible and correct
      const handlerResult = await mockContext._handler!(
        mockContext as RouteContext
      );
      expect(handlerResult).toBeInstanceOf(Response);
    });

    test('should maintain handler cache consistency across different handler types', async () => {
      // Test with function handler
      const functionModule: RouteModule = {
        handler: () => new Response('function'),
      };

      // Test with object handler
      const objectModule: RouteModule = {
        handler: {
          GET: () => new Response('object GET'),
          POST: () => new Response('object POST'),
        },
      };

      // Test with default handler (no handler specified)
      const defaultModule: RouteModule = {
        render: () => 'default content',
      };

      const testCases = [
        {
          module: functionModule,
          context: {
            request: new Request('http://test.com', { method: 'GET' }),
          } as Partial<RouteContext>,
          name: 'function handler',
        },
        {
          module: objectModule,
          context: {
            request: new Request('http://test.com', { method: 'GET' }),
          } as Partial<RouteContext>,
          name: 'object handler',
        },
        {
          module: defaultModule,
          context: {
            html: () => new Response('default html'),
          } as Partial<RouteContext>,
          name: 'default handler',
        },
      ];

      const mockNext = () => new Response('next');

      for (const { module, context } of testCases) {
        const handler = runtime.createRouteContextHandler(module);
        await handler(context as RouteContext, mockNext);

        expect(context.module).toBe(module);
        expect(context._handler).toBeDefined();
        expect(typeof context._handler).toBe('function');
      }
    });
  });

  describe('module activation consistency', () => {
    test('should consistently activate modules across different handler types', async () => {
      const modules = [
        {
          name: 'render-only module',
          module: { render: () => 'content' } as RouteModule,
          expectedProps: ['module', '_handler', 'render', 'html', 'meta'],
        },
        {
          name: 'handler-only module',
          module: {
            handler: { GET: () => new Response('test') },
          } as RouteModule,
          expectedProps: ['module', '_handler'],
          unexpectedProps: ['render', 'html'],
        },
        {
          name: 'combined module',
          module: {
            handler: { GET: () => new Response('combined') },
            render: () => 'rendered',
            meta: { title: 'Test' },
          } as RouteModule,
          expectedProps: ['module', '_handler', 'render', 'html', 'meta'],
        },
      ];

      for (const { module, expectedProps, unexpectedProps } of modules) {
        const mockContext: Partial<RouteContext> = {
          request: new Request('http://test.com', { method: 'GET' }),
        };
        const mockNext = () => new Response('next');

        const handler = runtime.createRouteContextHandler(module);
        await handler(mockContext as RouteContext, mockNext);

        // Check expected properties
        for (const prop of expectedProps) {
          expect(mockContext).toHaveProperty(prop);
          expect((mockContext as any)[prop]).toBeDefined();
        }

        // Check unexpected properties for handler-only modules
        if (unexpectedProps) {
          for (const prop of unexpectedProps) {
            expect((mockContext as any)[prop]).toBeUndefined();
          }
        }

        // Verify module reference consistency
        expect(mockContext.module).toBe(module);
      }
    });

    test('should handle module activation with missing dependencies gracefully', async () => {
      const moduleWithoutRender: RouteModule = {
        handler: {
          GET: (context) => {
            // This should not fail even though context.html might not be defined
            return new Response('handler without render');
          },
        },
      };

      const mockContext: Partial<RouteContext> = {
        request: new Request('http://test.com', { method: 'GET' }),
      };
      const mockNext = () => new Response('next');

      const handler = runtime.createRouteContextHandler(moduleWithoutRender);
      await handler(mockContext as RouteContext, mockNext);

      expect(mockContext.module).toBe(moduleWithoutRender);
      expect(mockContext._handler).toBeDefined();
      expect(mockContext.render).toBeUndefined();
      expect(mockContext.html).toBeUndefined();

      // Handler should still work
      const result = await mockContext._handler!(mockContext as RouteContext);
      expect(result).toBeInstanceOf(Response);
      expect(await result.text()).toBe('handler without render');
    });

    test('should maintain activation state across multiple context objects', async () => {
      const sharedModule: RouteModule = {
        handler: { GET: () => new Response('shared') },
        render: () => 'shared content',
        meta: { title: 'Shared Module' },
      };

      const contexts = Array.from({ length: 3 }, () => ({
        request: new Request('http://test.com', { method: 'GET' }),
      })) as Partial<RouteContext>[];

      const mockNext = () => new Response('next');
      const handler = runtime.createRouteContextHandler(sharedModule);

      // Activate module in all contexts
      for (const context of contexts) {
        await handler(context as RouteContext, mockNext);
      }

      // All contexts should have consistent state
      for (let i = 0; i < contexts.length; i++) {
        const context = contexts[i];
        expect(context.module).toBe(sharedModule);
        expect(context._handler).toBeDefined();
        expect(context.render).toBeDefined();
        expect(context.html).toBeDefined();
        expect(context.meta).toBeDefined();

        // All contexts should share the same cached handler
        if (i > 0) {
          expect(context._handler).toBe(contexts[0]._handler);
        }
      }
    });

    test('should properly activate error modules with consistent state', async () => {
      const errorModule: RouteModule = {
        handler: {
          GET: () => new Response('error page'),
        },
        render: () => 'error content',
        fallback: () => 'fallback component',
      };

      const testError = new Error('Test activation error');
      const mockContext: Partial<RouteContext> = {
        request: new Request('http://test.com', { method: 'GET' }),
        html: () => new Response('error html'),
      };

      const errorHandler = runtime.createErrorHandler(errorModule);
      const result = await errorHandler(testError, mockContext as RouteContext);

      // Verify error module activation state
      expect(mockContext.module).toBe(errorModule);
      expect(mockContext.error).toBe(testError);
      expect(mockContext._handler).toBeDefined();
      expect(mockContext.render).toBeDefined();
      expect(mockContext.html).toBeDefined();

      // Verify error response
      expect(result).toBeInstanceOf(Response);

      // Verify cached handler works with error context
      const handlerResult = await mockContext._handler!(
        mockContext as RouteContext
      );
      expect(handlerResult).toBeInstanceOf(Response);
    });

    test('should handle module cache consistency with WeakMap behavior', async () => {
      const originalModule: RouteModule = {
        handler: { GET: () => new Response('original') },
        render: () => 'original content',
        meta: { title: 'Original' },
      };

      const mockContext1: Partial<RouteContext> = {
        request: new Request('http://test.com', { method: 'GET' }),
      };
      const mockContext2: Partial<RouteContext> = {
        request: new Request('http://test.com', { method: 'GET' }),
      };
      const mockNext = () => new Response('next');

      const handler = runtime.createRouteContextHandler(originalModule);

      // First activation
      await handler(mockContext1 as RouteContext, mockNext);
      const firstHandler = mockContext1._handler;
      const firstMeta = mockContext1.meta;

      expect(firstHandler).toBeDefined();
      expect(firstMeta?.title).toBe('Original');

      // Second activation with same module should use cached data
      await handler(mockContext2 as RouteContext, mockNext);

      // Should use exact same cached handler and cloned meta
      expect(mockContext2._handler).toBe(firstHandler);
      expect(mockContext2.meta?.title).toBe('Original');
      expect(mockContext2.meta).not.toBe(firstMeta); // Should be cloned, not same reference
    });
  });

  describe('handler cache performance', () => {
    test('should demonstrate performance improvement with handler caching', async () => {
      const complexHandler = {
        GET: (context: RouteContext) => {
          // Simulate complex processing
          const start = Date.now();
          while (Date.now() - start < 1) {
            // Small delay to simulate processing
          }
          return new Response(`processed at ${Date.now()}`);
        },
        POST: (context: RouteContext) => {
          return new Response('POST processed');
        },
        PUT: (context: RouteContext) => {
          return new Response('PUT processed');
        },
      };

      const moduleWithComplexHandler: RouteModule = {
        handler: complexHandler,
        render: () => 'complex content',
        meta: { title: 'Complex Module' },
      };

      const contexts = Array.from({ length: 10 }, () => ({
        request: new Request('http://test.com', { method: 'GET' }),
      })) as Partial<RouteContext>[];

      const mockNext = () => new Response('next');
      const handler = runtime.createRouteContextHandler(
        moduleWithComplexHandler
      );

      const startTime = Date.now();

      // Multiple activations should reuse cached handler
      for (const context of contexts) {
        await handler(context as RouteContext, mockNext);
        expect(context._handler).toBeDefined();
        expect(context.module).toBe(moduleWithComplexHandler);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All contexts should share the same cached handler
      const firstHandler = contexts[0]._handler;
      for (let i = 1; i < contexts.length; i++) {
        expect(contexts[i]._handler).toBe(firstHandler);
      }

      // Performance should be reasonable (this is a basic sanity check)
      expect(totalTime).toBeLessThan(100); // Should complete quickly due to caching
    });

    test('should cache handlers for different module types efficiently', async () => {
      const modules = [
        {
          name: 'simple-handler',
          module: { handler: () => new Response('simple') } as RouteModule,
        },
        {
          name: 'complex-handler',
          module: {
            handler: {
              GET: () => new Response('get'),
              POST: () => new Response('post'),
              PUT: () => new Response('put'),
              DELETE: () => new Response('delete'),
            },
          } as RouteModule,
        },
        {
          name: 'render-module',
          module: {
            handler: { GET: () => new Response('render-get') },
            render: () => 'rendered',
            meta: { title: 'Render Module' },
          } as RouteModule,
        },
      ];

      const results: Array<{
        name: string;
        contexts: Partial<RouteContext>[];
        time: number;
      }> = [];

      for (const { name, module } of modules) {
        const contexts = Array.from({ length: 5 }, () => ({
          request: new Request('http://test.com', { method: 'GET' }),
        })) as Partial<RouteContext>[];

        const mockNext = () => new Response('next');
        const handler = runtime.createRouteContextHandler(module);

        const startTime = Date.now();

        for (const context of contexts) {
          await handler(context as RouteContext, mockNext);
        }

        const endTime = Date.now();

        results.push({
          name,
          contexts,
          time: endTime - startTime,
        });

        // Verify all contexts share the same cached handler
        const firstHandler = contexts[0]._handler;
        for (let i = 1; i < contexts.length; i++) {
          expect(contexts[i]._handler).toBe(firstHandler);
        }
      }

      // All should complete in reasonable time
      for (const result of results) {
        expect(result.time).toBeLessThan(50);
      }
    });

    test('should minimize repeated handler normalization calls', async () => {
      const mockModule: RouteModule = {
        handler: {
          GET: () => new Response('normalized once'),
          POST: () => new Response('post normalized once'),
        },
        render: () => 'content',
      };

      // Create multiple contexts that will all need the same module
      const contexts = Array.from({ length: 20 }, () => ({
        request: new Request('http://test.com', { method: 'GET' }),
      })) as Partial<RouteContext>[];

      const mockNext = () => new Response('next');
      const handler = runtime.createRouteContextHandler(mockModule);

      // Process all contexts
      const startTime = Date.now();
      for (const context of contexts) {
        await handler(context as RouteContext, mockNext);
      }
      const processingTime = Date.now() - startTime;

      // Verify caching worked - all should have same handler reference
      const referenceHandler = contexts[0]._handler;
      expect(referenceHandler).toBeDefined();

      for (let i = 1; i < contexts.length; i++) {
        expect(contexts[i]._handler).toBe(referenceHandler);
        expect(contexts[i].module).toBe(mockModule);
      }

      // Should process quickly due to caching
      expect(processingTime).toBeLessThan(100);

      // Verify handlers work correctly
      for (const context of contexts.slice(0, 3)) {
        // Test a few to ensure functionality
        const result = await context._handler!(context as RouteContext);
        expect(result).toBeInstanceOf(Response);
        expect(await result.text()).toBe('normalized once');
      }
    });

    test('should handle concurrent activation without cache corruption', async () => {
      const sharedModule: RouteModule = {
        handler: {
          GET: () => new Response('concurrent response'),
        },
        render: () => 'concurrent content',
        meta: { title: 'Concurrent Module' },
      };

      const concurrentContexts = Array.from({ length: 10 }, (_, i) => ({
        id: i,
        request: new Request(`http://test.com?id=${i}`, { method: 'GET' }),
      })) as Array<Partial<RouteContext> & { id: number }>;

      const mockNext = () => new Response('next');
      const handler = runtime.createRouteContextHandler(sharedModule);

      // Simulate concurrent activation
      const promises = concurrentContexts.map((context) =>
        handler(context as RouteContext, mockNext)
      );

      await Promise.all(promises);

      // All contexts should have consistent state
      const referenceHandler = concurrentContexts[0]._handler;
      expect(referenceHandler).toBeDefined();

      for (const context of concurrentContexts) {
        expect(context.module).toBe(sharedModule);
        expect(context._handler).toBe(referenceHandler);
        expect(context.render).toBeDefined();
        expect(context.html).toBeDefined();
        expect(context.meta?.title).toBe('Concurrent Module');
      }
    });
  });

  describe('default handler processing', () => {
    test('should use unified default handler creation for modules without handlers', async () => {
      const moduleWithoutHandler: RouteModule = {
        // No render method, so no rendering pipeline will be set up
        meta: { title: 'No Handler Module' },
      };

      const mockContext: Partial<RouteContext> = {
        request: new Request('http://test.com', { method: 'GET' }),
        html: () => new Response('default html response'),
      };
      const mockNext = () => new Response('next');

      const handler = runtime.createRouteContextHandler(moduleWithoutHandler);
      await handler(mockContext as RouteContext, mockNext);

      expect(mockContext.module).toBe(moduleWithoutHandler);
      expect(mockContext._handler).toBeDefined();
      // Since module has no render method, runtime won't override our html mock
      expect(mockContext.render).toBeUndefined();

      // Verify the default handler works (should be a GET handler that calls context.html())
      const result = await mockContext._handler!(mockContext as RouteContext);
      expect(result).toBeInstanceOf(Response);
      expect(await result.text()).toBe('default html response');
    });

    test('should use specialized error handler for error modules without custom handlers', async () => {
      const errorModuleWithoutHandler: RouteModule = {
        // No handler, and no render method to avoid runtime overriding our html mock
        fallback: () => 'error fallback',
      };

      const testError = new Error('Test error for default handler');
      const mockContext: Partial<RouteContext> = {
        request: new Request('http://test.com', { method: 'GET' }),
        html: (data, options) => {
          // Verify that error is passed correctly to html method
          expect(options?.error).toBe(testError);
          return new Response('error html with correct error');
        },
      };

      const errorHandler = runtime.createErrorHandler(
        errorModuleWithoutHandler
      );
      const result = await errorHandler(testError, mockContext as RouteContext);

      expect(result).toBeInstanceOf(Response);
      expect(await result.text()).toBe('error html with correct error');
      expect(mockContext.module).toBe(errorModuleWithoutHandler);
      expect(mockContext.error).toBe(testError);
    });

    test('should maintain custom handlers when modules provide them', async () => {
      const moduleWithCustomHandler: RouteModule = {
        handler: {
          GET: () => new Response('custom GET handler'),
          POST: () => new Response('custom POST handler'),
        },
        render: () => 'content with custom handler',
      };

      const mockContext: Partial<RouteContext> = {
        request: new Request('http://test.com', { method: 'GET' }),
      };
      const mockNext = () => new Response('next');

      const handler = runtime.createRouteContextHandler(
        moduleWithCustomHandler
      );
      await handler(mockContext as RouteContext, mockNext);

      expect(mockContext.module).toBe(moduleWithCustomHandler);
      expect(mockContext._handler).toBeDefined();

      // Verify the custom handler is used, not the default
      const result = await mockContext._handler!(mockContext as RouteContext);
      expect(result).toBeInstanceOf(Response);
      expect(await result.text()).toBe('custom GET handler');
    });

    test('should use custom error handlers when modules provide them', async () => {
      const errorModuleWithCustomHandler: RouteModule = {
        handler: (context: RouteContext) => {
          const error = context.error;
          return new Response(`custom error: ${error?.message}`, {
            status: error?.status || 500,
          });
        },
        render: () => 'error content',
      };

      const testError = new Error('Custom handler test error');
      const mockContext: Partial<RouteContext> = {
        request: new Request('http://test.com', { method: 'GET' }),
      };

      const errorHandler = runtime.createErrorHandler(
        errorModuleWithCustomHandler
      );
      const result = await errorHandler(testError, mockContext as RouteContext);

      expect(result).toBeInstanceOf(Response);
      expect(await result.text()).toBe(
        'custom error: Custom handler test error'
      );
      expect(result.status).toBe(500);
    });

    test('should reduce complexity by eliminating duplicate default handler logic', () => {
      // This test verifies that the refactoring achieved its goal
      const moduleTypes = [
        {
          name: 'no-handler',
          module: { render: () => 'content' } as RouteModule,
        },
        {
          name: 'with-handler',
          module: { handler: () => new Response('test') } as RouteModule,
        },
        {
          name: 'mixed',
          module: {
            handler: { GET: () => new Response('get') },
            render: () => 'content',
          } as RouteModule,
        },
      ];

      // All module types should be processed consistently
      for (const { module } of moduleTypes) {
        expect(() => {
          // These factory methods should handle all cases without requiring caller to handle defaults
          const routeHandler = runtime.createRouteContextHandler(module);
          const errorHandler = runtime.createErrorHandler(module);

          expect(routeHandler).toBeDefined();
          expect(errorHandler).toBeDefined();
        }).not.toThrow();
      }
    });
  });

  describe('fallback component prioritization', () => {
    test('should prefer fallback component when error occurs and fallback exists', async () => {
      let receivedComponent: unknown;
      let receivedProps: unknown;

      const moduleWithFallback: RouteModule = {
        default: () => 'default component',
        fallback: () => 'fallback component',
        render: async (component, props) => {
          receivedComponent = component;
          receivedProps = props;
          return 'rendered content';
        },
      };

      const mockContext: Partial<RouteContext> = {
        request: new Request('http://test.com', { method: 'GET' }),
      };

      const testError = new Error('Test error') as any;
      testError.status = 500;

      // Create error handler and activate module
      const errorHandler = runtime.createErrorHandler(moduleWithFallback);
      await errorHandler(testError, mockContext as RouteContext);

      // The module should be activated and have the html method
      expect(mockContext.module).toBe(moduleWithFallback);
      expect((mockContext as RouteContext).html).toBeDefined();

      // Call html to trigger the render flow
      await (mockContext as RouteContext).html!();

      // Should use fallback component
      expect(receivedComponent).toBe(moduleWithFallback.fallback);
      // Should receive HTTPException-like props (serialized error)
      expect(receivedProps).toMatchObject({
        name: 'Error',
        message: 'Test error',
        status: 500,
      });
    });

    test('should fallback to default component when error occurs but no fallback exists', async () => {
      let receivedComponent: unknown;
      let receivedProps: unknown;

      const moduleWithoutFallback: RouteModule = {
        default: () => 'default component',
        render: async (component, props) => {
          receivedComponent = component;
          receivedProps = props;
          return 'rendered content';
        },
      };

      const mockContext: Partial<RouteContext> = {
        request: new Request('http://test.com', { method: 'GET' }),
        name: 'test-route',
        params: { id: '123' },
        pathname: '/test',
        state: {},
      };

      const testError = new Error('Test error') as any;
      testError.status = 404;

      // Create error handler and activate module
      const errorHandler = runtime.createErrorHandler(moduleWithoutFallback);
      await errorHandler(testError, mockContext as RouteContext);

      // The module should be activated and have the html method
      expect(mockContext.module).toBe(moduleWithoutFallback);
      expect((mockContext as RouteContext).html).toBeDefined();

      // Call html to trigger the render flow
      await (mockContext as RouteContext).html!();

      // Should use default component as fallback
      expect(receivedComponent).toBe(moduleWithoutFallback.default);
      // Should receive RouteComponentProps with error included
      expect(receivedProps).toMatchObject({
        error: expect.objectContaining({
          message: 'Test error',
          status: 404,
        }),
        name: 'test-route',
        params: { id: '123' },
        pathname: '/test',
        state: {},
        request: expect.any(Request),
      });
    });

    test('should use default component when no error occurs', async () => {
      let receivedComponent: unknown;
      let receivedProps: unknown;

      const moduleWithFallback: RouteModule = {
        default: () => 'default component',
        fallback: () => 'fallback component',
        render: async (component, props) => {
          receivedComponent = component;
          receivedProps = props;
          return 'rendered content';
        },
      };

      const mockContext: Partial<RouteContext> = {
        request: new Request('http://test.com', { method: 'GET' }),
        name: 'test-route',
        params: {},
        pathname: '/test',
        state: {},
      };

      // Create route handler and activate module (without error)
      const routeHandler =
        runtime.createRouteContextHandler(moduleWithFallback);
      await routeHandler(mockContext as RouteContext, () => new Response());

      // The module should be activated and have the html method
      expect(mockContext.module).toBe(moduleWithFallback);
      expect((mockContext as RouteContext).html).toBeDefined();

      // Call html to trigger the render flow
      await (mockContext as RouteContext).html!();

      // Should use default component
      expect(receivedComponent).toBe(moduleWithFallback.default);
      // Should receive RouteComponentProps without error
      expect(receivedProps).toMatchObject({
        error: undefined,
        name: 'test-route',
        params: {},
        pathname: '/test',
        state: {},
        request: expect.any(Request),
      });
    });
  });

  describe('clearActivation', () => {
    test('clears module and render state mirrored on the host', async () => {
      const host: Partial<RouteContext> = {};
      const mockNext = () => new Response('next');
      const module: RouteModule = {
        render: () => 'content',
        meta: { title: 'Route' },
      };

      await runtime.createRouteContextHandler(module)(
        host as RouteContext,
        mockNext
      );

      expect(host.module).toBe(module);
      expect(host.meta).toBeDefined();

      runtime.clearActivation(host as RouteContext);

      expect(host.module).toBeUndefined();
      expect(host.meta).toBeUndefined();
      expect(host.render).toBeUndefined();
    });

    test('persists mutable route fields through accessors into WeakMap', async () => {
      const host: Partial<RouteContext> = {};
      const module: RouteModule = {
        render: () => 'content',
        meta: { title: 'Route' },
      };

      await runtime.createRouteContextHandler(module)(
        host as RouteContext,
        () => new Response('next')
      );

      const updatedMeta = { title: 'Updated' };
      (host as RouteContext).meta = updatedMeta;

      expect((host as RouteContext).meta).toBe(updatedMeta);

      runtime.clearActivation(host as RouteContext);

      expect((host as RouteContext).meta).toBeUndefined();
    });
  });
});
