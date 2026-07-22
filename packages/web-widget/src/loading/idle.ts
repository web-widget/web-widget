const supportRequestIdleCallback = 'requestIdleCallback' in window;

export const createIdleObserver = (
  element: Element,
  callback: () => void,
  options: IdleRequestOptions = { timeout: 1000 }
) => {
  let id: number;
  if (supportRequestIdleCallback) {
    id = requestIdleCallback(callback, options);
  } else {
    id = setTimeout(callback, 200);
  }

  const disconnect = () => {
    if (supportRequestIdleCallback) {
      cancelIdleCallback(id);
    } else {
      clearTimeout(id);
    }
  };

  return disconnect;
};
