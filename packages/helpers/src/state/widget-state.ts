import { useContext } from '@web-widget/context';

const ERROR = Symbol.for('error');
type PromiseState<T> = Promise<T> & {
  [ERROR]: T | Error;
};

export async function useWidgetAsyncState<T>(
  key: string,
  handler: () => T | Promise<T>
): Promise<T> {
  const cache = useWidgetState();

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
  const cache = useWidgetState();
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
        (state as PromiseState<T>)[ERROR] = error;
      }
    );
  }

  return state;
}

export const useWidgetState = () => {
  const ctx = useContext();

  return ctx.widgetState;
};

/**
 * @deprecated use `useWidgetState` instead of `useAllWidgetState'
 */
export const useAllWidgetState = useWidgetState;
