import { createHttpError } from '@web-widget/helpers/error';
import type { ModuleRuntime } from './module';
import type { HTTPException, RouteModule } from './types';

const DEFAULT_STATUS = 500;
const UNKNOWN_ERROR_MESSAGE = 'Unknown error';

type FallbackModule = RouteModule | (() => Promise<RouteModule>);
type ErrorHandler = ReturnType<ModuleRuntime['createErrorHandler']>;

interface FallbackDefinition {
  module: FallbackModule;
  status: number;
}

/** Return a usable HTTP error status without trusting arbitrary thrown values. */
export function getErrorStatus(error: unknown): number {
  if (!error || (typeof error !== 'object' && typeof error !== 'function')) {
    return DEFAULT_STATUS;
  }

  try {
    const status = Reflect.get(error, 'status');
    return typeof status === 'number' &&
      Number.isInteger(status) &&
      status >= 400 &&
      status < 600
      ? status
      : DEFAULT_STATUS;
  } catch {
    return DEFAULT_STATUS;
  }
}

/** Build a status-aware fallback resolver and cache each generated handler. */
export function createFallbackResolver(
  fallbacks: readonly FallbackDefinition[],
  runtime: ModuleRuntime,
  defaultModule: RouteModule
): (status: number) => ErrorHandler {
  const modules = new Map<number, FallbackModule>();
  for (const fallback of fallbacks) {
    modules.set(fallback.status, fallback.module);
  }

  const handlers = new Map<FallbackModule, ErrorHandler>();
  const getHandler = (module: FallbackModule) => {
    let handler = handlers.get(module);
    if (!handler) {
      handler = runtime.createErrorHandler(module);
      handlers.set(module, handler);
    }
    return handler;
  };

  return (status) => {
    let module = modules.get(status);

    if (!module && status >= 400 && status < 500) {
      module = modules.get(400) ?? modules.get(404);
    } else if (!module && status >= 500) {
      module = modules.get(500);
    }

    return getHandler(module ?? defaultModule);
  };
}

function safeStringify(value: unknown): string | undefined {
  try {
    const seen = new WeakSet<object>();
    return JSON.stringify(value, (_key, nestedValue) => {
      if (typeof nestedValue === 'bigint') {
        return nestedValue.toString();
      }
      if (nestedValue && typeof nestedValue === 'object') {
        if (seen.has(nestedValue)) {
          return '[Circular]';
        }
        seen.add(nestedValue);
      }
      return nestedValue;
    });
  } catch {
    return undefined;
  }
}

function safeString(value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value === undefined || value === null) {
    return fallback;
  }

  const serialized =
    typeof value === 'object' ? safeStringify(value) : undefined;
  if (serialized !== undefined) {
    return serialized;
  }

  try {
    return String(value);
  } catch {
    return fallback;
  }
}

function readProperty(value: object, key: PropertyKey): unknown {
  try {
    return Reflect.get(value, key);
  } catch {
    return undefined;
  }
}

function createNormalizedError(
  status: number,
  message: string,
  cause: unknown,
  stack?: string
): HTTPException {
  const properties = {
    cause,
    ...(stack ? { stack } : {}),
  };

  try {
    return createHttpError(status, message, properties);
  } catch {
    // The helpers package only accepts registered HTTP status codes. A custom
    // status must not be allowed to break the error boundary itself.
    return createHttpError(DEFAULT_STATUS, message, properties);
  }
}

async function normalizeResponse(error: Response): Promise<HTTPException> {
  const status = getErrorStatus(error);
  let message = error.statusText || UNKNOWN_ERROR_MESSAGE;
  let stack: string | undefined;

  try {
    const response = error.clone();
    const contentType = response.headers.get('content-type')?.toLowerCase();

    if (contentType?.includes('json')) {
      const body = await response.json();
      if (body && typeof body === 'object') {
        const bodyMessage =
          readProperty(body, 'message') ?? readProperty(body, 'error');
        message = safeString(bodyMessage, safeString(body, message));
        const bodyStack = readProperty(body, 'stack');
        stack =
          typeof bodyStack === 'string' && bodyStack ? bodyStack : undefined;
      }
    } else {
      message = (await response.text()) || message;
    }
  } catch {
    // A consumed or malformed response still carries useful status metadata.
  }

  return createNormalizedError(status, message, error, stack);
}

/** Normalize any JavaScript thrown value without throwing from the error path. */
export async function normalizeHTTPException(
  error: unknown
): Promise<HTTPException> {
  if (error instanceof Error) {
    return error;
  }

  if (error instanceof Response) {
    return normalizeResponse(error);
  }

  if (error && typeof error === 'object' && !Array.isArray(error)) {
    const status = getErrorStatus(error);
    const detail =
      readProperty(error, 'message') ?? readProperty(error, 'error');
    const message = safeString(
      detail,
      safeString(error, UNKNOWN_ERROR_MESSAGE)
    );
    return createNormalizedError(status, message, error);
  }

  let message: string;
  try {
    message = String(error);
  } catch {
    message = UNKNOWN_ERROR_MESSAGE;
  }
  return createNormalizedError(
    DEFAULT_STATUS,
    `${UNKNOWN_ERROR_MESSAGE}: ${message}`,
    error
  );
}
