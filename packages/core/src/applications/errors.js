import { NAME } from './symbols.js';

export function formatErrorMessage(view, error) {
  const prefix = `WebWidget applications[${view[NAME]}]`;
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
