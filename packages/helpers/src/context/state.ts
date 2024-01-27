import { useContext } from "./context";

const ERROR = Symbol.for("error");
type PromiseState<T> = Promise<T> & {
  [ERROR]: T | Error;
};

export async function useWidgetAsyncState<T>(
  key: string,
  handler: () => T | Promise<T>
): Promise<T> {
  const cache = useAllWidgetState();

  let state = cache[key];

  if (state) {
    return state;
  }

  state = cache[key] = handler();

  if (state instanceof Promise) {
    return state.then((result) => {
      cache[key] = result;
      return result;
    });
  }

  return state;
}

export function useWidgetSyncState<T>(
  key: string,
  handler: () => T | Promise<T>
): T {
  const cache = useAllWidgetState();
  let state = cache[key];

  if (state) {
    if (state instanceof Promise) {
      const error = (state as PromiseState<T>)[ERROR];
      if (error) {
        throw error;
      } else {
        throw state;
      }
    }
    return state;
  }

  state = cache[key] = handler();

  if (state instanceof Promise) {
    throw state.then(
      (result) => {
        cache[key] = result;
      },
      (error) => {
        state[ERROR] = error;
      }
    );
  }

  return state;
}

export const useAllWidgetState = () => {
  const ctx = useContext();

  if (!ctx) {
    throw new Error(`[@web-widget/helpers/context] Instance unavailable.`);
  }

  return (ctx.body ??= {});
};
