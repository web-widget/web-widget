import { getContext } from 'unctx';

const NAMESPACE = '@web-widget';
const IS_SERVER = typeof document === 'undefined';

export function tryGetAsyncLocalStorage<T>() {
  return getContext<T>(NAMESPACE, {
    asyncContext: IS_SERVER && Reflect.get(globalThis, 'AsyncLocalStorage'),
  });
}
