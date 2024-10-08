import type { MiddlewareContext } from '@web-widget/schema';
import { tryGetAsyncLocalStorage } from './context';
import { SCRIPT_TYPE } from './constants';

type SafeSerializableContext = Pick<
  MiddlewareContext,
  'params' | 'pathname' | 'request' | 'state'
>;

export function createSafeSerializableContext(
  context: Partial<MiddlewareContext>
): SafeSerializableContext {
  return {
    params: Object.create(null),
    pathname: '',
    request: new Request(location.href, {
      method: 'GET', // TODO: Use the actual method.
      headers: {
        'user-agent': encodeURIComponent(navigator.userAgent),
        cookie: encodeURIComponent(document.cookie),
        host: location.host,
        origin: location.origin,
        referer: encodeURIComponent(document.referrer),
        'accept-language': encodeURIComponent(navigator.language),
      },
    }),
    state: Object.create(null),
    ...context,
  };
}

export function getSafeSerializableContext() {
  const stateElement = document.querySelector(`[type="${SCRIPT_TYPE}"]`);
  const context = stateElement
    ? JSON.parse(stateElement.textContent as string)
    : {};
  return createSafeSerializableContext(context);
}

export function callContext<T extends (...args: any[]) => any>(
  data: SafeSerializableContext,
  setup: T,
  args?: Parameters<T>
) {
  const ctx = tryGetAsyncLocalStorage<SafeSerializableContext>();
  const fn: () => ReturnType<T> = () =>
    args ? setup(...(args as Parameters<T>)) : setup();
  ctx.set(data);
  return fn();
}

export function context() {
  const ctx = tryGetAsyncLocalStorage();
  return ctx.use() as SafeSerializableContext;
}

/** @deprecated Use `context` instead. */
export const useContext = context;
