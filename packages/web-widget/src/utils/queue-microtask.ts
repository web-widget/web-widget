let promise: Promise<any>;
export const queueMicrotask =
  typeof window.queueMicrotask === "function"
    ? window.queueMicrotask.bind(window)
    : (callback: () => void) =>
        (promise || (promise = Promise.resolve()))
          .then(callback)
          .catch((error) =>
            setTimeout(() => {
              throw error;
            }, 0)
          );
