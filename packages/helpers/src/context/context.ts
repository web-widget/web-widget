import { createNamespace } from 'unctx';
import type { MiddlewareContext } from '@web-widget/schema';

const IS_SERVER = typeof document === 'undefined';
export const exposedToClient = Symbol.for('exposedToClient');

function toJSON(this: any) {
  const exposed = this[exposedToClient];
  if (exposed) {
    return pick(this, exposed);
  }
  return {};
}

export function allowExposedToClient(
  object: any,
  allow: string[],
  replace?: boolean
) {
  if (replace) {
    // eslint-disable-next-line no-param-reassign
    object[exposedToClient] = allow;
  } else {
    // eslint-disable-next-line no-param-reassign
    object[exposedToClient] = [...(object[exposedToClient] ?? []), ...allow];
  }
}

export interface Context extends Partial<MiddlewareContext> {
  pathname: string;
  params: Record<string, string>;
  state: Record<string | symbol, any>;
  widgetState: Record<string | symbol, any>;
  [exposedToClient]?: string[];
  toJSON?: () => any;
}

let ctx;
function tryGetAsyncLocalStorage() {
  return (ctx ??= createNamespace<Context>({
    asyncContext: IS_SERVER && Reflect.has(globalThis, 'AsyncLocalStorage'),
  }).get('@web-widget'));
}

export function createContext(options: Partial<MiddlewareContext>): Context {
  const ctx: Context = {
    pathname: '',
    params: Object.create(null),
    widgetState: Object.create(null),
    [exposedToClient]: ['pathname', 'params', 'state'],
    ...(IS_SERVER ? { toJSON } : {}),
    ...options,
    state: IS_SERVER
      ? {
          ...options.state,
          toJSON,
        }
      : options.state ?? {},
  };

  return ctx;
}

function pick(object: Record<string, any>, keys: string[]): any {
  const newObject = {};
  for (const key of keys) {
    (newObject as any)[key] = object[key];
  }
  return newObject;
}

export function callContext<T extends (...args: any[]) => any>(
  data: Context,
  setup: T,
  args?: Parameters<T>
) {
  const ctx = tryGetAsyncLocalStorage();
  const fn: () => ReturnType<T> = () =>
    args ? setup(...(args as Parameters<T>)) : setup();
  if (IS_SERVER) {
    return ctx.call(data, fn);
  } else {
    ctx.set(data);
    return fn();
  }
}

export function useTryContext() {
  const ctx = tryGetAsyncLocalStorage();
  return ctx.tryUse() as Context | undefined;
}

export function useContext() {
  const ctx = tryGetAsyncLocalStorage();
  return ctx.use() as Context;
}
