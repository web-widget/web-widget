import type {
  IncomingHttpHeaders,
  IncomingMessage,
  OutgoingHttpHeaders,
  ServerResponse,
} from 'node:http';
import type primitives from '@edge-runtime/primitives';

export interface BuildDependencies {
  Headers: typeof Headers;
  ReadableStream: typeof ReadableStream;
  Request: typeof Request;
  Uint8Array: typeof Uint8Array;
  FetchEvent: typeof primitives.FetchEvent;
}

export interface RequestOptions {
  defaultOrigin: string;
}

export type NodeHandler = (
  req: IncomingMessage,
  res: ServerResponse
) => Promise<void> | void;

export type EdgeFetchEvent = InstanceType<BuildDependencies['FetchEvent']>;

export function buildToFetchEvent(dependencies: BuildDependencies) {
  return function toFetchEvent(request: Request): EdgeFetchEvent {
    return new dependencies.FetchEvent(request);
  };
}

export function buildToHeaders({ Headers: HeadersCtor }: BuildDependencies) {
  return function toHeaders(nodeHeaders: IncomingHttpHeaders): Headers {
    const headers = new HeadersCtor();
    for (const [key, value] of Object.entries(nodeHeaders)) {
      const values = Array.isArray(value) ? value : [value];
      for (const item of values) {
        if (item !== undefined) headers.append(key, item);
      }
    }
    return headers;
  };
}

export function toOutgoingHeaders(headers?: Headers): OutgoingHttpHeaders {
  const output: OutgoingHttpHeaders = {};
  if (!headers) return output;

  const setCookies = headers.getSetCookie?.();
  for (const [name, value] of headers) {
    output[name] =
      name === 'set-cookie' && setCookies?.length ? setCookies : value;
  }
  return output;
}

export function mergeIntoServerResponse(
  headers: OutgoingHttpHeaders,
  serverResponse: ServerResponse
): void {
  for (const [name, value] of Object.entries(headers)) {
    if (value !== undefined) serverResponse.setHeader(name, value);
  }
}
