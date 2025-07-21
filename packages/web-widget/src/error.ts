export class WebWidgetError extends Error {
  name = 'WebWidgetError';
  constructor(moduleName: string, message: string, cause?: unknown) {
    super(`WebWidgetError: ${moduleName}: ${message}`, { cause });
  }
}
