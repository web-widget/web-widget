import { queueMicrotask } from './queue-microtask';
export const reportError =
  typeof window.reportError === 'function'
    ? window.reportError.bind(window)
    : (error: any) => {
        queueMicrotask(() => {
          throw error;
        });
      };
