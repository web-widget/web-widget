/**
 * Minimal Vite stub for Jest. Vite 8 ships ESM-only; ts-jest cannot load the real package.
 */
export function normalizePath(filename: string): string {
  return filename.replace(/\\/g, '/');
}

export function isCSSRequest(id: string): boolean {
  return /\.css(?:$|\?)/.test(id);
}

export function isRunnableDevEnvironment(
  environment: unknown
): environment is { runner: unknown } {
  return (
    typeof environment === 'object' &&
    environment !== null &&
    'runner' in environment
  );
}
