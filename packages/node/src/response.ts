const RESPONSE_CACHE = Symbol.for('@web-widget/node.response-cache');

export interface CachedResponse {
  body: string | Uint8Array | Blob | ReadableStream | null;
  headerName?: string;
  headerValue?: string;
  headers?: HeadersInit;
  status: number;
  statusText?: string;
}

type ResponseWithCache = Response & {
  [RESPONSE_CACHE]?: CachedResponse;
};

let installed = false;

const HEADER_NAME = /^[!#$%&'*+\-.^`|~\w]+$/;

function toUnsignedShort(value: unknown): number {
  if (typeof value === 'bigint' || typeof value === 'symbol') {
    throw new TypeError('Status is not a number');
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number === 0) return 0;
  const integer = Math.trunc(number);
  return ((integer % 65536) + 65536) % 65536;
}

function toByteString(value: unknown, name: string): string {
  if (typeof value === 'symbol') {
    throw new TypeError(`${name} is not a valid ByteString`);
  }
  const result = value === undefined ? '' : String(value);
  for (let index = 0; index < result.length; index++) {
    if (result.charCodeAt(index) > 255) {
      throw new TypeError(`${name} is not a valid ByteString`);
    }
  }
  return result;
}

function normalizeHeaderValue(value: string, name: string): string {
  let start = 0;
  let end = value.length;
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code > 255)
      throw new TypeError('Header value is not a valid ByteString');
    if (code === 0 || code === 10 || code === 13) {
      throw new TypeError(`Invalid header value for ${name}`);
    }
    if (index === start && (code === 9 || code === 32)) start++;
  }
  while (end > start) {
    const code = value.charCodeAt(end - 1);
    if (code !== 9 && code !== 32) break;
    end--;
  }
  return start === 0 && end === value.length ? value : value.slice(start, end);
}

function snapshotCachedHeaders(
  headers: HeadersInit | undefined,
  cache: CachedResponse
): void {
  if (!headers) return;
  if (headers instanceof Headers || Array.isArray(headers)) {
    cache.headers = new Headers(headers);
    return;
  }
  if (Symbol.iterator in headers) {
    cache.headers = new Headers(headers);
    return;
  }

  const prototype = Object.getPrototypeOf(headers);
  if (prototype !== Object.prototype && prototype !== null) {
    cache.headers = new Headers(headers);
    return;
  }

  let firstName: string | undefined;
  let firstValue: string | undefined;
  let snapshot: Record<string, string> | undefined;
  for (const name in headers) {
    if (!Object.hasOwn(headers, name)) continue;
    const value = headers[name];
    if (typeof value !== 'string') {
      cache.headers = new Headers(headers);
      return;
    }
    if (!HEADER_NAME.test(name)) {
      throw new TypeError(`Invalid header name: ${name}`);
    }
    const normalizedName = name.toLowerCase();
    if (
      normalizedName === firstName ||
      (snapshot !== undefined && normalizedName in snapshot)
    ) {
      cache.headers = new Headers(headers);
      return;
    }
    const normalizedValue = normalizeHeaderValue(value, name);
    if (firstName === undefined) {
      firstName = normalizedName;
      firstValue = normalizedValue;
    } else {
      const headerSnapshot =
        snapshot ??
        Object.assign(Object.create(null), { [firstName]: firstValue! });
      snapshot = headerSnapshot;
      headerSnapshot[normalizedName] = normalizedValue;
    }
  }

  if (snapshot) cache.headers = snapshot;
  else if (firstName !== undefined) {
    cache.headerName = firstName;
    cache.headerValue = firstValue;
  }
}

export function getCachedResponse(
  response: Response
): CachedResponse | undefined {
  return (response as ResponseWithCache)[RESPONSE_CACHE];
}

export function installCachedResponse(): void {
  if (installed) return;
  installed = true;
  if (Reflect.get(globalThis, 'DISABLE_INSTALL_MCA_SHIMS')) return;

  const NativeResponse = globalThis.Response;
  const defaultContentType = 'text/plain;charset=UTF-8';
  const getNative = Symbol('getNativeResponse');

  class CachedWebResponse {
    #body: BodyInit | null;
    #init?: ResponseInit;
    #native?: Response;

    constructor(body: BodyInit | null = null, init?: ResponseInit) {
      const status =
        init?.status === undefined ? 200 : toUnsignedShort(init.status);
      if (status < 200 || status > 599) {
        throw new RangeError(
          'init["status"] must be in the range of 200 to 599, inclusive.'
        );
      }
      const statusText = toByteString(init?.statusText, 'statusText');
      if (/[^\t\x20-\x7e\x80-\xff]/.test(statusText)) {
        throw new TypeError('Invalid statusText');
      }
      if (
        body !== null &&
        (status === 204 || status === 205 || status === 304)
      ) {
        throw new TypeError(
          'Response constructor: Invalid response status code'
        );
      }

      if (
        body === null ||
        typeof body === 'string' ||
        body instanceof Uint8Array ||
        body instanceof Blob
      ) {
        const cachedBody =
          body instanceof Uint8Array ? new Uint8Array(body) : body;
        this.#body = cachedBody;
        const cache: CachedResponse = {
          body: cachedBody,
          status,
          statusText,
        };
        snapshotCachedHeaders(init?.headers, cache);
        (this as unknown as ResponseWithCache)[RESPONSE_CACHE] = cache;
      } else {
        const headers = new Headers(init?.headers);
        const normalizedInit = { ...init, headers, status, statusText };
        this.#body = body;
        this.#init = normalizedInit;
        this.#native = new NativeResponse(body, normalizedInit);
      }
    }

    [getNative](): Response {
      if (!this.#native) {
        const cache = (this as unknown as ResponseWithCache)[RESPONSE_CACHE];
        if (cache) {
          delete (this as unknown as ResponseWithCache)[RESPONSE_CACHE];
          this.#init = {
            headers:
              cache.headers ??
              (cache.headerName
                ? { [cache.headerName]: cache.headerValue! }
                : undefined),
            status: cache.status,
            statusText: cache.statusText,
          };
        }
        this.#native = new NativeResponse(this.#body, this.#init);
      }
      return this.#native;
    }

    get headers(): Headers {
      const cache = (this as unknown as ResponseWithCache)[RESPONSE_CACHE];
      if (!cache) return this[getNative]().headers;

      if (cache.headerName) {
        cache.headers = new Headers({
          [cache.headerName]: cache.headerValue!,
        });
        cache.headerName = undefined;
        cache.headerValue = undefined;
      } else if (!(cache.headers instanceof Headers)) {
        cache.headers = new Headers(cache.headers);
      }
      if (
        typeof cache.body === 'string' &&
        !cache.headers.has('content-type')
      ) {
        cache.headers.set('content-type', defaultContentType);
      }
      return cache.headers;
    }

    get status(): number {
      return (
        (this as unknown as ResponseWithCache)[RESPONSE_CACHE]?.status ??
        this[getNative]().status
      );
    }

    get ok(): boolean {
      const status = this.status;
      return status >= 200 && status < 300;
    }
  }

  for (const property of [
    'body',
    'bodyUsed',
    'redirected',
    'statusText',
    'type',
    'url',
  ] as const) {
    Object.defineProperty(CachedWebResponse.prototype, property, {
      get(this: CachedWebResponse) {
        return this[getNative]()[property];
      },
    });
  }

  for (const method of [
    'arrayBuffer',
    'blob',
    'bytes',
    'clone',
    'formData',
    'json',
    'text',
  ] as const) {
    if (
      typeof (NativeResponse.prototype as unknown as Record<string, unknown>)[
        method
      ] !== 'function'
    ) {
      continue;
    }
    Object.defineProperty(CachedWebResponse.prototype, method, {
      value(this: CachedWebResponse) {
        const native = this[getNative]();
        return (native[method] as () => unknown).call(native);
      },
    });
  }

  Object.defineProperty(CachedWebResponse, 'json', {
    value(data: unknown, init?: ResponseInit) {
      const body = JSON.stringify(data);
      if (body === undefined) {
        throw new TypeError('The data is not JSON serializable');
      }
      const headers = new Headers(init?.headers);
      if (!headers.has('content-type')) {
        headers.set('content-type', 'application/json');
      }
      return new CachedWebResponse(body, { ...init, headers });
    },
    configurable: true,
    writable: true,
  });

  Object.defineProperty(CachedWebResponse, Symbol.hasInstance, {
    value(value: unknown) {
      if (
        (typeof value !== 'object' || value === null) &&
        typeof value !== 'function'
      ) {
        return false;
      }
      return (
        Object.prototype.isPrototypeOf.call(NativeResponse.prototype, value) ||
        Object.prototype.isPrototypeOf.call(CachedWebResponse.prototype, value)
      );
    },
  });

  Object.setPrototypeOf(CachedWebResponse, NativeResponse);
  Object.setPrototypeOf(CachedWebResponse.prototype, NativeResponse.prototype);
  Object.defineProperty(CachedWebResponse, 'name', { value: 'Response' });
  globalThis.Response = CachedWebResponse as unknown as typeof Response;
}
