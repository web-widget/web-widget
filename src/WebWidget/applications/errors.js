export function formatErrorMessage(model, error) {
  if (typeof error !== 'object') {
    error = new Error(error);
  }

  error.message = `WebWidget<${model.name}> Error: ${error.message}`;
  return error;
}
