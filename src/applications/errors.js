export function formatErrorMessage(model, error) {
  const prefix = `WebWidget applications[${model.name}] Error`;
  if (typeof error !== 'object') {
    error = new Error(error);
  }

  if (!error.message.includes(prefix)) {
    Reflect.defineProperty(error, 'message', {
      value: `${prefix}: ${error.message}`,
      writable: true,
      enumerable: false,
      configurable: true
    });
  }

  return error;
}
