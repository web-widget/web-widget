import { useContext } from '@web-widget/context';

export function useRouteState<T extends Record<string, any>>(): T {
  const ctx = useContext();

  return ctx.state as T;
}
