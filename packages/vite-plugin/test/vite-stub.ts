/**
 * Minimal Vite stub for Jest. Vite 8 ships ESM-only; ts-jest cannot load the real package.
 */
export function normalizePath(filename: string): string {
  return filename.replace(/\\/g, '/');
}
