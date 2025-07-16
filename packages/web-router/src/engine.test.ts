import { Engine, type OnFallback } from './engine';
import type {
  LayoutModule,
  Meta,
  MiddlewareContext,
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

  describe('processRoute', () => {
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
      const middleware = await engine.processRoute();
      const result = await middleware(mockContext as RouteContext, mockNext);

      expect(result).toBeInstanceOf(Response);
      expect(await result.text()).toBe('test response');
    });

    test('should call next when no module is present', async () => {
      const mockContext: Partial<RouteContext> = {
        module: undefined,
      };

      const mockNext = () => new Response('next response');
      const middleware = await engine.processRoute();
      const result = await middleware(mockContext as RouteContext, mockNext);

      expect(result).toBeInstanceOf(Response);
      expect(await result.text()).toBe('next response');
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

      const handler = await engine.createRouteContextHandler(mockRoute);
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

      const handler = await engine.createRouteContextHandler(newModule);
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

      const handler = await engine.createRouteContextHandler(mockRoute);
      await handler(mockContext as RouteContext, mockNext);

      expect(mockContext.module).toBe(mockRoute);
      expect(mockContext.meta).toBeUndefined();
      expect(mockContext.render).toBeUndefined();
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

      const errorHandler = await engine.createErrorHandler(mockRoute);
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
  });
});
