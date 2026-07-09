/**
 * Log severity level for the vite-plugin package.
 */
export type LogLevel = 'error' | 'warn' | 'info';

const LEVEL_ICONS: Record<LogLevel, string> = {
  error: '✖',
  warn: '⚠',
  info: 'ℹ',
};

/**
 * Centralized logger for the vite-plugin package. Formats the message with a
 * per-level icon and scope prefix, attaches `Error` stack traces when present,
 * and dispatches to the matching `console` stream.
 *
 * @param level   Severity — controls icon and console stream.
 * @param message Short description of what happened.
 * @param error   Optional caught value; `Error` instances print their stack.
 * @param scope   Package scope for the prefix (default: `@web-widget/vite-plugin`).
 */
export function logPlugin(
  level: LogLevel,
  message: string,
  error?: unknown,
  scope: string = '@web-widget/vite-plugin'
): void {
  const prefix = `${LEVEL_ICONS[level]} ${scope}: ${message}`;
  if (error !== undefined) {
    if (error instanceof Error) {
      console[level](`${prefix}: ${error.stack ?? error.message}`);
    } else {
      console[level](prefix, error);
    }
  } else {
    console[level](prefix);
  }
}
