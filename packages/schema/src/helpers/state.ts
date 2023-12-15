import { useContext } from "./context";

export function useWidgetState<T>(key: string, handler: () => T): T;
export function useWidgetState<T>(
  key: string,
  handler: () => Promise<T>
): Promise<T>;
export function useWidgetState<T>(key: string, handler: () => T | Promise<T>) {
  const store = useAllState();
  let state = store[key];

  if (state) {
    return state as T;
  }

  state = handler();

  if (state instanceof Promise) {
    return state.then((state) => {
      store[key] = state;
      return state as T;
    });
  } else {
    store[key] = state;
    return state as T;
  }
}

export const useAllState = () => {
  const ctx = useContext();

  if (!ctx) {
    throw new Error(`Instance unavailable.`);
  }

  return (ctx.body ??= {});
};
