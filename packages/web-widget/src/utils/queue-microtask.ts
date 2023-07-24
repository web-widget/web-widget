let promise;
export const queueMicrotask =
  typeof window.queueMicrotask === "function"
    ? window.queueMicrotask.bind(window)
    : // eslint-disable-next-line no-return-assign
      (callback) =>
        (promise || (promise = Promise.resolve()))
          .then(callback)
          .catch((error) =>
            setTimeout(() => {
              throw error;
            }, 0)
          );
