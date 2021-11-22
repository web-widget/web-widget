import { NAME } from './symbols.js';

export function formatErrorMessage(view, error) {
  const prefix = `Web Widget application (${view[NAME]})`;
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
