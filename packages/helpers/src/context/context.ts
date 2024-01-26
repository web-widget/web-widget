import { createNamespace } from "unctx";

const IS_SERVER = typeof document === "undefined";

export interface WebWidgetContext {
  pathname?: string;
  params?: Record<string, string>;
  body: Record<string | symbol, any>;
}

let ctx;
function tryGetAsyncLocalStorage() {
  return (ctx ??= createNamespace<WebWidgetContext>({
    asyncContext: IS_SERVER && Reflect.has(globalThis, "AsyncLocalStorage"),
  }).get("@web-widget"));
}

export function createContext(
  options: WebWidgetContext & any
): WebWidgetContext {
  const ctx: WebWidgetContext = {
    pathname: "",
    params: Object.create(null),
    body: Object.create(null),
    ...options,
  };
  return ctx;
}

export function callContext<T extends (...args: any[]) => any>(
  data: WebWidgetContext,
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

export function useContext() {
  const ctx = tryGetAsyncLocalStorage();
  return ctx.tryUse();
}