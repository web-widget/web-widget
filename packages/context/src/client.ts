import type { MiddlewareContext } from '@web-widget/schema';
import { tryGetAsyncLocalStorage } from './context';
import { SCRIPT_ID } from './constants';

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
    request: new Request(location.href),
    state: Object.create(null),
    ...context,
  };
}

export function getSafeSerializableContext() {
  const stateElement = document.getElementById(SCRIPT_ID);
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
