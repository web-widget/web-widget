import type { IncomingMessage } from 'node:http';
import primitives from '@edge-runtime/primitives';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildToRequest, computeRequestOrigin } from '../incoming-request';
import type { BuildDependencies } from '../node-utils';
import { runTestServer, type TestServer } from './test-server';

type NodeRequestInit = RequestInit & { duplex?: 'half' };

const dependencies: BuildDependencies = {
  Headers,
  ReadableStream,
  Request,
  Uint8Array,
  FetchEvent: primitives.FetchEvent,
};
const toRequest = buildToRequest(dependencies);
const requests = new Map<string, Request>();
const requestBodies = new Map<string, string>();
let server: TestServer;

beforeAll(async () => {
  server = await runTestServer(async (incoming, response) => {
    const id = incoming.headers['x-request-id'];
    if (typeof id !== 'string') {
      response.writeHead(400).end('Invalid Request Id.');
      return;
    }
    const request = toRequest(incoming, { defaultOrigin: server.url });
    requests.set(id, request);
    if (request.body) requestBodies.set(id, await request.text());
    response.end();
  });
});

afterAll(() => server.close());

describe('Node request conversion', () => {
  it('maps URL input and headers', async () => {
    const input = `${server.url}/hi/there?foo=bar`;
    const request = await mapRequest(input, {
      headers: { 'x-hi': 'there', 'x-multiple': 'value1, value2' },
    });
    expect(request.url).toBe(input);
    expect(request.headers.get('x-hi')).toBe('there');
    expect(request.headers.get('x-multiple')).toBe('value1, value2');
  });

  it('uses the default origin and retains paths beginning with //', async () => {
    expect((await mapRequest(`${server.url}/`)).url).toBe(`${server.url}/`);
    expect((await mapRequest(`${server.url}//foo`)).url).toBe(
      `${server.url}//foo`
    );
    expect((await mapRequest(`${server.url}//caf%C3%A9`)).url).toBe(
      `${server.url}//caf%C3%A9`
    );
  });

  it('uses the Host header as the origin', async () => {
    expect(computeRequestOrigin({ host: 'example.com' }, server.url)).toBe(
      'http://example.com'
    );
    expect(computeRequestOrigin({ host: 'example.com:443' }, server.url)).toBe(
      'https://example.com:443'
    );
    const incoming = {
      headers: { host: 'EXAMPLE.COM:80' },
      method: 'GET',
      url: '/canonical',
    } as IncomingMessage;
    expect(toRequest(incoming, { defaultOrigin: server.url }).url).toBe(
      'http://example.com/canonical'
    );
  });

  it('provides a genuine Request to standard Request consumers', async () => {
    const request = await mapRequest(`${server.url}/request-info`);
    const copy = new Request(request);

    expect(copy.url).toBe(request.url);
    expect((await fetch(request)).status).toBe(200);
  });

  it('reads request bodies as text and chunks only once', async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('Hello '));
        controller.enqueue(new TextEncoder().encode('World'));
        controller.close();
      },
    });
    const request = await mapRequest(server.url, {
      method: 'POST',
      body,
      duplex: 'half',
    } as NodeRequestInit);
    expect(request.method).toBe('POST');
    expect(requestBodies.get(request.headers.get('x-request-id')!)).toBe(
      'Hello World'
    );
    expect(request.bodyUsed).toBe(true);
    await expect(request.text()).rejects.toThrow(
      /Body is unusable|body used already/i
    );
  });
});

async function mapRequest(input: string, init: RequestInit = {}) {
  const id = crypto.randomUUID();
  const headers = new Headers(init.headers);
  headers.set('x-request-id', id);
  const response = await fetch(input, { ...init, headers });
  expect(response.status, await response.clone().text()).toBe(200);
  const request = requests.get(id);
  expect(request).toBeDefined();
  return request!;
}
