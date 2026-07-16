import type {
  HTTPException,
  Meta,
  MiddlewareContext,
  RouteContext,
  RouteHandler,
  RouteModule,
  RouteRenderOptions,
  ServerRenderOptions,
} from '../types';

declare module '@web-widget/helpers' {
  interface RouteContext {
    /** @internal Cached handler for the active route module. */
    _handler?: RouteHandler;
  }
}

export interface RouteActivationState {
  module?: RouteModule;
  meta?: Meta;
  render?: RouteContext['render'];
  html?: RouteContext['html'];
  renderOptions?: RouteRenderOptions;
  renderer?: ServerRenderOptions;
  data?: unknown;
  error?: HTTPException;
  _handler?: RouteHandler;
}

const activations = new WeakMap<MiddlewareContext, RouteActivationState>();
const hostsWithAccessors = new WeakSet<MiddlewareContext>();

const ROUTE_HOST_KEYS = [
  'module',
  'meta',
  'render',
  'html',
  'renderOptions',
  'renderer',
  'data',
  'error',
  '_handler',
] as const satisfies ReadonlyArray<keyof RouteActivationState>;

const READONLY_ROUTE_KEYS = new Set<keyof RouteActivationState>([
  'module',
  'render',
  'html',
  '_handler',
]);

export function getRouteActivation(
  host: MiddlewareContext
): RouteActivationState | undefined {
  return activations.get(host);
}

export function ensureRouteActivation(
  host: MiddlewareContext
): RouteActivationState {
  ensureRouteAccessors(host);
  return activations.get(host)!;
}

export function hasRouteActivation(host: MiddlewareContext): boolean {
  if (activations.get(host)?.module !== undefined) {
    return true;
  }
  const descriptor = Object.getOwnPropertyDescriptor(host, 'module');
  return Boolean(
    descriptor && !descriptor.get && descriptor.value !== undefined
  );
}

function migrateOwnRouteProperties(host: MiddlewareContext): void {
  let state = activations.get(host);
  if (!state) {
    activations.set(host, (state = {}));
  }

  for (const key of ROUTE_HOST_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(host, key);
    if (descriptor && !descriptor.get && descriptor.value !== undefined) {
      (state as Record<string, unknown>)[key] = descriptor.value;
    }
  }
}

export function ensureRouteAccessors(host: MiddlewareContext): void {
  if (hostsWithAccessors.has(host)) {
    return;
  }
  migrateOwnRouteProperties(host);
  installRouteAccessors(host);
}

function installRouteAccessors(host: MiddlewareContext): void {
  hostsWithAccessors.add(host);

  for (const key of ROUTE_HOST_KEYS) {
    const descriptor: PropertyDescriptor = {
      configurable: true,
      enumerable: true,
      get() {
        return activations.get(host)?.[key];
      },
    };

    if (!READONLY_ROUTE_KEYS.has(key)) {
      descriptor.set = (value) => {
        const state = activations.get(host) ?? {};
        (state as Record<string, unknown>)[key] = value;
        activations.set(host, state);
      };
    }

    Object.defineProperty(host, key, descriptor);
  }
}

function removeRouteAccessors(host: MiddlewareContext): void {
  if (!hostsWithAccessors.has(host)) {
    return;
  }
  hostsWithAccessors.delete(host);

  for (const key of ROUTE_HOST_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(host, key);
    if (descriptor?.get) {
      Reflect.deleteProperty(host, key);
    }
  }
}

export function invalidateRouteActivation(host: MiddlewareContext): void {
  activations.delete(host);
  removeRouteAccessors(host);
}
