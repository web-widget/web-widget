export function formatErrorMessage(model, error) {
  const prefix = `WebWidget applications[${model.name}] Error`;
  if (typeof error !== 'object') {
    error = new Error(error);
  }

  if (!error.message.includes(prefix)) {
    error.message = `${prefix}: ${error.message}`;
  }

  return error;
}
