/**
 * @fileoverview Public router types and the compiled URLPattern router.
 */

import type { Router } from './base';
import { URLPatternRouter } from './url-pattern';

// Export base types and interfaces
export type { Router, Result, Params } from './base';
export { METHOD_NAME_ALL, METHODS, UnsupportedPathError } from './base';

export { URLPatternRouter } from './url-pattern';

/** Create the compiled URLPattern router used by the application. */
export function createRouter<T>(): Router<T> {
  return new URLPatternRouter<T>();
}
