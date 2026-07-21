import { Writable } from 'node:stream';
import primitives from '@edge-runtime/primitives';
import { afterEach, describe, expect, it, vi } from 'vitest';

import NodeAdapter, { buildToNodeHandler, toServerResponse } from '../adapter';
import type { BuildDependencies } from '../node-utils';
import { installCachedResponse } from '../response';
import {
  runTestServer,
  serializeResponse,
  type TestServer,
} from './test-server';

type NodeRequestInit = RequestInit & { duplex?: 'half' };

const dependencies: BuildDependencies = {
  Headers,
  ReadableStream,
  Request: class extends Request {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      super(input, { duplex: 'half', ...init } as NodeRequestInit);
    }
  },
  Uint8Array,
  FetchEvent: primitives.FetchEvent,
};
installCachedResponse();
const transform = buildToNodeHandler(dependencies, {
  defaultOrigin: 'http://example.com',
});
let server: TestServer | undefined;

afterEach(async () => {
  vi.restoreAllMocks();
  await server?.close();
  server = undefined;
});

async function serve(handler: Parameters<typeof transform>[0]) {
  server = await runTestServer(transform(handler));
  return server;
}

describe('Node response conversion', () => {
  it('contains request conversion failures within the middleware request', async () => {
    const handler = vi.fn();
    const adapter = new NodeAdapter(
      { handler },
      { defaultOrigin: 'http://example.com' }
    );
    const response = {
      end: vi.fn(),
      finished: false,
      headersSent: false,
      setHeader: vi.fn(),
      socket: undefined,
      statusCode: 200,
      statusMessage: '',
      writableEnded: false,
    };
    const next = vi.fn();

    await (
      adapter.middleware as unknown as (
        request: unknown,
        response: unknown,
        next: () => void
      ) => Promise<void>
    )({ headers: {}, method: 'GET', url: 'http://[invalid' }, response, next);

    expect(handler).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(500);
    expect(response.end).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith();
  });

  it('uses the explicit web-router request source protocol', async () => {
    let receivedSource = false;
    const requestSourceHandler = Symbol.for(
      '@web-widget/web-router.request-source-handler'
    );
    const router = {
      handler() {
        throw new Error('Standard handler should not run');
      },
      [requestSourceHandler](source: { toRequest(): Request }) {
        receivedSource = !(source instanceof Request);
        const request = source.toRequest();
        return new Response(new Request(request).url);
      },
    };
    const adapter = new NodeAdapter(router, {
      defaultOrigin: 'http://example.com',
    });
    server = await runTestServer(adapter.handler);

    expect(await (await server.fetch('/source')).text()).toBe(
      `${server.url}/source`
    );
    expect(receivedSource).toBe(true);
  });

  it('observes rejected background tasks from the request source protocol', async () => {
    const error = new Error('background failed');
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const requestSourceHandler = Symbol.for(
      '@web-widget/web-router.request-source-handler'
    );
    const router = {
      handler() {
        throw new Error('Standard handler should not run');
      },
      [requestSourceHandler](
        _source: unknown,
        _env: unknown,
        context: { waitUntil(promise: Promise<unknown>): void }
      ) {
        context.waitUntil(Promise.reject(error));
        return new Response('OK');
      },
    };
    const adapter = new NodeAdapter(router, {
      defaultOrigin: 'http://example.com',
    });
    server = await runTestServer(adapter.handler);

    expect(await (await server.fetch('/background')).text()).toBe('OK');
    await new Promise((resolve) => setImmediate(resolve));
    expect(consoleError).toHaveBeenCalledWith('Background task failed.', error);
  });

  it('turns null and empty responses into empty HTTP responses', async () => {
    let current = await serve(() => null);
    expect(await serializeResponse(await current.fetch('/'))).toMatchObject({
      status: 200,
      statusText: 'OK',
      text: '',
    });
    await current.close();
    server = undefined;
    current = await serve(() => new Response(null));
    expect(await serializeResponse(await current.fetch('/'))).toMatchObject({
      status: 200,
      text: '',
    });
  });

  it('changes status, status text, and headers', async () => {
    const current = await serve(
      () =>
        new Response(null, {
          status: 201,
          statusText: 'CREATED',
          headers: { 'x-custom': '1' },
        })
    );
    expect(await serializeResponse(await current.fetch('/'))).toMatchObject({
      status: 201,
      statusText: 'CREATED',
      headers: { 'x-custom': '1' },
    });
  });

  it('returns text, JSON, and byte bodies', async () => {
    const cases: Array<[() => Response, string, string]> = [
      [() => new Response('OK'), 'OK', 'text/plain;charset=UTF-8'],
      [
        () => Response.json({ works: true }),
        '{"works":true}',
        'application/json',
      ],
      [() => new Response(new TextEncoder().encode('bytes')), 'bytes', ''],
    ];
    for (const [handler, text, contentType] of cases) {
      const current = await serve(handler);
      const response = await current.fetch('/');
      expect(await response.text()).toBe(text);
      if (contentType)
        expect(response.headers.get('content-type')).toBe(contentType);
      await current.close();
      server = undefined;
    }
  });

  it('snapshots mutable response bodies and headers', async () => {
    const body = new TextEncoder().encode('A');
    const headers = { 'X-Value': ' a ' };
    const current = await serve(() => {
      const response = new Response(body, { headers });
      body[0] = 'B'.charCodeAt(0);
      headers['X-Value'] = 'b';
      return response;
    });
    const response = await current.fetch('/');
    expect(await response.text()).toBe('A');
    expect(response.headers.get('x-value')).toBe('a');
  });

  it('validates cached response initialization eagerly', () => {
    expect(
      () => new Response('body', { headers: { 'invalid\nname': 'value' } })
    ).toThrow(TypeError);
    expect(() => new Response(null, { statusText: '\u4f60\u597d' })).toThrow(
      TypeError
    );
  });

  it('returns async and streaming responses', async () => {
    const current = await serve(
      async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode('hello'));
              controller.enqueue(new TextEncoder().encode(' world'));
              controller.close();
            },
          })
        )
    );
    expect(await (await current.fetch('/')).text()).toBe('hello world');
  });

  it('rejects the request when writing a streamed response throws', async () => {
    const error = new Error('write failed');
    const writable = new Writable({
      write(_chunk, _encoding, callback) {
        callback();
      },
    }) as Writable & {
      finished: boolean;
      headersSent: boolean;
      writeHead(status: number, headers: Record<string, string>): void;
    };
    writable.finished = false;
    writable.headersSent = false;
    writable.writeHead = () => {
      writable.headersSent = true;
    };
    writable.write = () => {
      throw error;
    };

    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1]));
      },
    });
    const response = {
      body,
      headers: new Headers(),
      status: 200,
      statusText: 'OK',
    } as Response;

    await expect(toServerResponse(response, writable as never)).rejects.toBe(
      error
    );
  });

  it('consumes incoming body and headers', async () => {
    const current = await serve(
      async (request) =>
        new Response(await request.text(), { headers: request.headers })
    );
    const response = await current.fetch('/', {
      method: 'POST',
      body: 'hello world',
      headers: { 'x-custom': 'foo' },
    });
    expect(await response.text()).toBe('hello world');
    expect(response.headers.get('x-custom')).toBe('foo');
  });

  it('interacts with waitUntil', async () => {
    let completed = false;
    const current = await serve((_request, _env, event) => {
      event.waitUntil(Promise.resolve().then(() => void (completed = true)));
      return new Response('OK');
    });
    expect(await (await current.fetch('/')).text()).toBe('OK');
    await new Promise((resolve) => setImmediate(resolve));
    expect(completed).toBe(true);
  });
});
