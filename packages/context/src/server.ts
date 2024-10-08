import './global';
import type { MiddlewareContext, ScriptDescriptor } from '@web-widget/schema';
import { tryGetAsyncLocalStorage } from './context';
import { SCRIPT_TYPE, EXPOSED_TO_CLIENT } from './constants';
import { escapeJson } from '@web-widget/purify';
export const exposedToClient = EXPOSED_TO_CLIENT;

export function contextToScriptDescriptor(
  context: MiddlewareContext
): ScriptDescriptor {
  return {
    type: SCRIPT_TYPE,
    content: escapeJson(
      JSON.stringify({
        pathname: context.pathname,
        params: context.params,
      })
    ),
  };
}

export function callContext<T extends (...args: any[]) => any>(
  data: MiddlewareContext,
  setup: T,
  args?: Parameters<T>
) {
  const ctx = tryGetAsyncLocalStorage<MiddlewareContext>();
  const fn: () => ReturnType<T> = () =>
    args ? setup(...(args as Parameters<T>)) : setup();
  return ctx.call(data, fn);
}

export function context() {
  const ctx = tryGetAsyncLocalStorage();
  return ctx.use() as MiddlewareContext;
}

/** @deprecated Use `context` instead. */
export const useContext = context;
