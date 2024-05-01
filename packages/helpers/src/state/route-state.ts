import { context } from '@web-widget/context';

/** @deprecated Use `import { lifecycleCache } from '@web-widget/helpers/cache'` instead. */
export function useRouteState<T extends Record<string, any>>(): T {
  const ctx = context();

  return ctx.state as T;
}
