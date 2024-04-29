import { context } from '@web-widget/context';

export function state<T extends Record<string, any>>(): T {
  const ctx = context();

  return ctx.state as T;
}

/** @deprecated Use `state` instead. */
export const useState = state;

/** @deprecated Use `state` instead. */
export const useRouteState = state;
