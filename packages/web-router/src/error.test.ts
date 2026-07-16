import {
  createFallbackResolver,
  getErrorStatus,
  normalizeHTTPException,
} from './error';
import type { ModuleRuntime } from './module';
import type { RouteModule } from './types';

describe('fallback resolution', () => {
  test('selects exact, status-family, and default modules', () => {
    const badRequest = {} as RouteModule;
    const notFound = {} as RouteModule;
    const serverError = {} as RouteModule;
    const teapot = {} as RouteModule;
    const defaultModule = {} as RouteModule;
    const createErrorHandler = vi.fn((module: RouteModule) =>
      vi.fn().mockName(String(module))
    );
    const runtime = { createErrorHandler } as unknown as ModuleRuntime;
    const resolve = createFallbackResolver(
      [
        { status: 400, module: badRequest },
        { status: 404, module: notFound },
        { status: 418, module: teapot },
        { status: 500, module: serverError },
      ],
      runtime,
      defaultModule
    );

    expect(resolve(418)).toBe(resolve(418));
    expect(resolve(401)).toBe(resolve(400));
    expect(resolve(502)).toBe(resolve(500));
    expect(resolve(399)).toBe(resolve(200));
    expect(createErrorHandler).toHaveBeenCalledTimes(4);
    expect(createErrorHandler).toHaveBeenNthCalledWith(1, teapot);
    expect(createErrorHandler).toHaveBeenNthCalledWith(2, badRequest);
    expect(createErrorHandler).toHaveBeenNthCalledWith(3, serverError);
    expect(createErrorHandler).toHaveBeenNthCalledWith(4, defaultModule);
  });

  test('uses 404 as the legacy fallback when 400 is absent', () => {
    const notFound = {} as RouteModule;
    const defaultModule = {} as RouteModule;
    const handler = vi.fn();
    const runtime = {
      createErrorHandler: vi.fn(() => handler),
    } as unknown as ModuleRuntime;
    const resolve = createFallbackResolver(
      [{ status: 404, module: notFound }],
      runtime,
      defaultModule
    );

    expect(resolve(403)).toBe(handler);
    expect(runtime.createErrorHandler).toHaveBeenCalledWith(notFound);
  });
});

describe('error normalization', () => {
  test('preserves Error instances and their stack', async () => {
    const original = new Error('boom');

    await expect(normalizeHTTPException(original)).resolves.toBe(original);
  });

  test('extracts message and stack from a JSON Response', async () => {
    const response = Response.json(
      { message: 'invalid input', stack: 'Error: invalid input' },
      { status: 422 }
    );

    const error = await normalizeHTTPException(response);

    expect(error).toMatchObject({
      message: 'invalid input',
      stack: 'Error: invalid input',
      status: 422,
      cause: response,
    });
  });

  test('handles a consumed Response without failing normalization', async () => {
    const response = new Response('already consumed', {
      status: 503,
      statusText: 'Service Unavailable',
    });
    await response.text();

    const error = await normalizeHTTPException(response);

    expect(error).toMatchObject({
      message: 'Service Unavailable',
      status: 503,
      cause: response,
    });
  });

  test('falls back to 500 for a non-error Response status', async () => {
    const response = new Response('not an error');

    const error = await normalizeHTTPException(response);

    expect(error.status).toBe(500);
    expect(error.message).toBe('not an error');
  });

  test('serializes circular and bigint object errors safely', async () => {
    const thrown: Record<string, unknown> = { value: 1n };
    thrown.self = thrown;

    const error = await normalizeHTTPException(thrown);

    expect(error.status).toBe(500);
    expect(error.message).toBe('{"value":"1","self":"[Circular]"}');
    expect(error.cause).toBe(thrown);
  });

  test('handles hostile property access and string conversion', async () => {
    const thrown = new Proxy(
      {},
      {
        get() {
          throw new Error('property access failed');
        },
      }
    );

    const error = await normalizeHTTPException(thrown);

    expect(error).toMatchObject({ status: 500, message: 'Unknown error' });
    expect(error.cause).toBe(thrown);
  });

  test.each([
    [null, 'Unknown error: null'],
    [undefined, 'Unknown error: undefined'],
    ['boom', 'Unknown error: boom'],
  ])('normalizes primitive %s', async (thrown, message) => {
    const error = await normalizeHTTPException(thrown);

    expect(error).toMatchObject({ status: 500, message, cause: thrown });
  });

  test('reads only integer error statuses in the HTTP error range', () => {
    expect(getErrorStatus({ status: 404 })).toBe(404);
    expect(getErrorStatus({ status: 399 })).toBe(500);
    expect(getErrorStatus({ status: 404.5 })).toBe(500);
    expect(getErrorStatus({ status: '404' })).toBe(500);
  });
});
