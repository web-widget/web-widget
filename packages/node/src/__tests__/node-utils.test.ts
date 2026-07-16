import { PassThrough, Readable } from 'node:stream';
import primitives from '@edge-runtime/primitives';
import { describe, expect, it } from 'vitest';

import { buildToReadableStream } from '../incoming-request';
import {
  buildToFetchEvent,
  buildToHeaders,
  mergeIntoServerResponse,
  toOutgoingHeaders,
  type BuildDependencies,
} from '../node-utils';

const dependencies: BuildDependencies = {
  Headers,
  ReadableStream,
  Request,
  Uint8Array,
  FetchEvent: primitives.FetchEvent,
};

describe('headers', () => {
  it('maps simple and multiple incoming header values', () => {
    const headers = buildToHeaders(dependencies)({
      'content-type': 'image/jpeg',
      'x-multiple': ['value1', 'value2', 'value3'],
      ignored: undefined,
    });
    expect(Object.fromEntries(headers)).toEqual({
      'content-type': 'image/jpeg',
      'x-multiple': 'value1, value2, value3',
    });
  });

  it('preserves separate set-cookie values in outgoing headers', () => {
    const headers = new Headers({ 'set-cookie': 'value1' });
    headers.append('set-cookie', 'value2');
    headers.append('set-cookie', 'value3');
    expect(toOutgoingHeaders(headers)).toEqual({
      'set-cookie': ['value1', 'value2', 'value3'],
    });
  });

  it('merges outgoing headers into a server response', () => {
    const response = new PassThrough() as PassThrough & {
      setHeader(name: string, value: string | string[]): void;
    };
    const values = new Map<string, string | string[]>();
    response.setHeader = (name, value) => void values.set(name, value);
    mergeIntoServerResponse(
      { foo: 'bar', skipped: undefined },
      response as never
    );
    expect(Object.fromEntries(values)).toEqual({ foo: 'bar' });
  });
});

describe('streams', () => {
  it('converts a Node readable into a web ReadableStream', async () => {
    const stream = buildToReadableStream(dependencies)(
      Readable.from([Buffer.from('hello'), Buffer.from(' world')])
    );
    expect(await new Response(stream).text()).toBe('hello world');
  });
});

describe('fetch event', () => {
  it('contains the request and supports waitUntil', async () => {
    const request = new Request('https://example.com');
    const event = buildToFetchEvent(dependencies)(request);
    expect(event).toBeInstanceOf(primitives.FetchEvent);
    expect(event.request).toBe(request);
    event.waitUntil(Promise.resolve());
    await Promise.all(event.awaiting);
  });
});
