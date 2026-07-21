import { reportError } from '../platform/report-error';

export class WebWidgetError extends Error {
  name = 'WebWidgetError';
  constructor(moduleName: string, message: string, cause?: unknown) {
    super(`WebWidgetError: ${moduleName}: ${message}`, { cause });
  }
}

export function reportWebWidgetError(moduleName: string, error: unknown) {
  let reportedError: Error;
  if (error instanceof WebWidgetError) {
    reportedError = error;
  } else if (error instanceof Error) {
    reportedError = new WebWidgetError(moduleName, error.message, error);
  } else if (typeof error === 'string') {
    reportedError = new WebWidgetError(moduleName, error);
  } else {
    reportedError = new WebWidgetError(moduleName, 'Unknown error', error);
  }
  reportError(reportedError);
}
