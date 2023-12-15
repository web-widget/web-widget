import { createNamespace, withAsyncContext } from "unctx";

export interface WebWidgetContext {
  pathname?: string;
  params?: Record<string, string>;
  body: Record<string, any>;
}

const isServer = typeof window === "undefined";
const ctx = /*@__PURE__*/ createNamespace<WebWidgetContext>({
  asyncContext: isServer && Reflect.has(globalThis, "AsyncLocalStorage"),
}).get("@web-widget");

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
  const fn: () => ReturnType<T> = () =>
    args ? setup(...(args as Parameters<T>)) : setup();
  if (isServer) {
    return ctx.call(data, fn);
  } else {
    ctx.set(data);
    return fn();
  }
}

export { withAsyncContext };

export function useContext() {
  return ctx.tryUse();
}
