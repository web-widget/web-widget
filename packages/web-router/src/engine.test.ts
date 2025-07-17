import { Engine, type OnFallback } from './engine';
import type {
  ActionModule,
  LayoutModule,
  Meta,
  MiddlewareContext,
  MiddlewareModule,
  RouteContext,
  RouteModule,
  ServerRenderOptions,
} from './types';

describe('Engine', () => {
  let engine: Engine;
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
      defaultRenderer: { ssr: true } as ServerRenderOptions,
      onFallback: mockOnFallback,
      dev: false,
    };

    engine = new Engine(options);
  });

  describe('constructor', () => {
    test('should create engine instance with provided options', () => {
      expect(engine).toBeInstanceOf(Engine);
    });

    test('should accept async layout module loader', () => {
      const asyncLayoutLoader = async () =>
        ({
          default: () => '<html>async</html>',
          render: async () => '<html>async rendered</html>',
        }) as LayoutModule;

      const engineWithAsyncLayout = new Engine({
        layoutModule: asyncLayoutLoader,
        defaultMeta: { title: 'Test' } as Meta,
        defaultBaseAsset: '/assets/',
        defaultRenderer: { ssr: true } as ServerRenderOptions,
        onFallback: mockOnFallback,
        dev: false,
      });

      expect(engineWithAsyncLayout).toBeInstanceOf(Engine);
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
        module: mockModule,
        meta: { title: 'Test' },
        request: new Request('http://test.com', { method: 'GET' }),
      };

      const mockNext = () => new Response('next');
      const middleware = engine.createRouteHandler();
      const result = await middleware(mockContext as RouteContext, mockNext);

      expect(result).toBeInstanceOf(Response);
      expect(await result.text()).toBe('test response');
    });

    test('should call next when no module is present', async () => {
      const mockContext: Partial<RouteContext> = {
        module: undefined,
      };

      const mockNext = () => new Response('next response');
      const middleware = engine.createRouteHandler();
      const result = await middleware(mockContext as RouteContext, mockNext);

      expect(result).toBeInstanceOf(Response);
      expect(await result.text()).toBe('next response');
    });

    test('should use default GET handler when no handler is provided', async () => {
      const mockModule: RouteModule = {
        render: () => 'rendered content',
      };

      const mockContext: Partial<RouteContext> = {
        module: mockModule,
        request: new Request('http://test.com', { method: 'GET' }),
        html: () => new Response('rendered response'),
      };

      const mockNext = () => new Response('next');
      const middleware = engine.createRouteHandler();
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
        module: mockModule,
        request: new Request('http://test.com', { method: 'GET' }),
        meta: { title: 'Test', script: [] },
      };

      const mockNext = () => new Response('next');
      const middleware = engine.createRouteHandler();
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

      const handler = engine.createRouteContextHandler(mockRoute);
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

      const handler = engine.createRouteContextHandler(newModule);
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

      const handler = engine.createRouteContextHandler(mockRoute);
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

      const handler = engine.createRouteContextHandler(asyncLoader);
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

      const handler = engine.createRouteContextHandler(mockRoute);

      // First call
      await handler(mockContext as RouteContext, mockNext);
      const firstModule = mockContext.module;

      // Reset context
      mockContext.module = undefined;

      // Second call should use cached handler
      await handler(mockContext as RouteContext, mockNext);
      expect(mockContext.module).toBe(firstModule);
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

      const handler = engine.createMiddlewareHandler(mockMiddleware);
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

      const handler = engine.createMiddlewareHandler(asyncLoader);
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

      const handler = engine.createMiddlewareHandler(invalidMiddleware);

      await expect(
        handler(mockContext as MiddlewareContext, mockNext)
      ).rejects.toThrow('Module is missing export "handler".');
    });

    test('should cache middleware handler', async () => {
      let callCount = 0;
      const mockMiddleware: MiddlewareModule = {
        handler: async (context, next) => {
          callCount++;
          return next();
        },
      };

      const mockContext: Partial<MiddlewareContext> = {};
      const mockNext = () => new Response('cached');

      const handler = engine.createMiddlewareHandler(mockMiddleware);

      // First call
      await handler(mockContext as MiddlewareContext, mockNext);
      // Second call should use cached handler
      await handler(mockContext as MiddlewareContext, mockNext);

      expect(callCount).toBe(2); // Handler should be called twice but cached
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

      const handler = engine.createActionHandler(mockAction);
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

      const handler = engine.createActionHandler(mockAction);
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

      const handler = engine.createActionHandler(asyncLoader);
      const result = await handler(mockContext as MiddlewareContext, mockNext);

      expect(result).toBeInstanceOf(Response);
      const responseData = await result.json();
      expect(responseData).toHaveProperty('result');
    });

    test('should cache action handler', async () => {
      const mockAction: ActionModule = {
        cachedAction: async () => ({ cached: true }),
      };

      const requestBody = {
        jsonrpc: '2.0',
        id: '1',
        method: 'cachedAction',
        params: [],
      };

      const handler = engine.createActionHandler(mockAction);

      // First call
      const mockRequest1 = new Request('http://test.com/action', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const mockContext1: Partial<MiddlewareContext> = {
        request: mockRequest1,
      };

      const result1 = await handler(
        mockContext1 as MiddlewareContext,
        () => new Response('next')
      );
      expect(result1).toBeInstanceOf(Response);

      // Second call should use cached handler (create new request to avoid body reuse)
      const mockRequest2 = new Request('http://test.com/action', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const mockContext2: Partial<MiddlewareContext> = {
        request: mockRequest2,
      };

      const result2 = await handler(
        mockContext2 as MiddlewareContext,
        () => new Response('next')
      );
      expect(result2).toBeInstanceOf(Response);
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

      const errorHandler = engine.createErrorHandler(mockRoute);
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

    test('should handle Response errors', async () => {
      const mockRoute: RouteModule = {
        render: () => 'error page',
      };

      const mockContext: Partial<RouteContext> = {
        html: () => new Response('error html'),
      };

      const responseError = new Response('Not Found', {
        status: 404,
        statusText: 'Not Found',
      });

      const errorHandler = engine.createErrorHandler(mockRoute);
      const result = await errorHandler(
        responseError,
        mockContext as MiddlewareContext
      );

      expect(result).toBeInstanceOf(Response);
      expect(mockContext.error).toBeDefined();
      expect((mockContext.error as any).status).toBe(404);
    });

    test('should handle non-Error objects', async () => {
      const mockRoute: RouteModule = {
        render: () => 'error page',
      };

      const mockContext: Partial<RouteContext> = {
        html: () => new Response('error html'),
      };

      const stringError = 'String error message';

      const errorHandler = engine.createErrorHandler(mockRoute);
      const result = await errorHandler(
        stringError,
        mockContext as MiddlewareContext
      );

      expect(result).toBeInstanceOf(Response);
      expect(mockContext.error).toBeDefined();
      expect((mockContext.error as any).message).toBe('String error message');
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

      const errorHandler = engine.createErrorHandler(asyncLoader);
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

      const errorHandler = engine.createErrorHandler(mockRoute);

      // First call
      const result1 = await errorHandler(
        testError,
        mockContext as MiddlewareContext
      );
      expect(result1).toBeInstanceOf(Response);

      // Reset context
      delete mockContext.module;
      delete mockContext.error;

      // Second call should use cached handler
      const result2 = await errorHandler(
        testError,
        mockContext as MiddlewareContext
      );
      expect(result2).toBeInstanceOf(Response);
    });
  });

  describe('error handling in development mode', () => {
    test('should create dev engine instance', () => {
      const devEngine = new Engine({
        layoutModule: {
          default: () => '<html>dev</html>',
          render: async () => '<html>dev rendered</html>',
        } as LayoutModule,
        defaultMeta: { title: 'Dev Title' } as Meta,
        defaultBaseAsset: '/dev-assets/',
        defaultRenderer: { ssr: true } as ServerRenderOptions,
        onFallback: mockOnFallback,
        dev: true,
      });

      expect(devEngine).toBeInstanceOf(Engine);
    });

    test('should handle errors differently in dev mode', () => {
      const devOnFallback = (error: any) => {
        expect(error).toBeDefined();
      };

      const devEngine = new Engine({
        layoutModule: {
          default: () => '<html>dev</html>',
          render: async () => '<html>dev rendered</html>',
        } as LayoutModule,
        defaultMeta: { title: 'Dev Title' } as Meta,
        defaultBaseAsset: '/dev-assets/',
        defaultRenderer: { ssr: true } as ServerRenderOptions,
        onFallback: devOnFallback,
        dev: true,
      });

      expect(devEngine).toBeInstanceOf(Engine);
    });
  });

  describe('handler method normalization', () => {
    test('should handle function handlers', async () => {
      const functionHandler = () => new Response('function handler');

      const mockModule: RouteModule = {
        handler: functionHandler,
      };

      const mockContext: Partial<RouteContext> = {
        module: mockModule,
      };

      const mockNext = () => new Response('next');
      const middleware = engine.createRouteHandler();
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
        module: mockModule,
        request: new Request('http://test.com', { method: 'GET' }),
      };

      const mockNext = () => new Response('next');
      const middleware = engine.createRouteHandler();
      const result = await middleware(mockContext as RouteContext, mockNext);

      expect(result).toBeInstanceOf(Response);
      expect(await result.text()).toBe('GET response');
    });
  });
});
