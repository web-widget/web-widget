export function formatErrorMessage({ name }, error) {
  const prefix = `WebWidget applications[${name}]`;
  if (typeof error !== 'object') {
    error = new Error(error);
  }

  if (!error.message.includes(prefix)) {
    Reflect.defineProperty(error, 'message', {
      value: `${prefix}: ${error.message}`,
      writable: true,
      configurable: true
    });
  }

  return error;
}
