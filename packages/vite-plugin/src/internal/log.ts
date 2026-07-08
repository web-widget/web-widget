/**
 * Centralized error logging for the vite-plugin package. Formats Error
 * instances with their stack trace and falls back to `console.error` for
 * non-Error values.
 *
 * @param message Short description of what failed.
 * @param error   The caught value to log.
 * @param scope   Package scope for the prefix (default: `@web-widget/vite-plugin`).
 */
export function logPluginError(
  message: string,
  error: unknown,
  scope: string = '@web-widget/vite-plugin'
): void {
  const prefix = `🚧 ${scope}: ${message}:`;
  if (error instanceof Error) {
    console.error(`${prefix} ${error.stack ?? error.message}`);
  } else {
    console.error(prefix, error);
  }
}

/**
 * Centralized warning logging for the vite-plugin package.
 *
 * @param message Warning message to display.
 * @param scope   Package scope for the prefix (default: `@web-widget/vite-plugin`).
 */
export function logPluginWarn(
  message: string,
  scope: string = '@web-widget/vite-plugin'
): void {
  console.warn(`🚧 ${scope}: ${message}`);
}
