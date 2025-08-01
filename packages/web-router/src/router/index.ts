/**
 * @fileoverview Router Module Index
 * Export all router implementations and types
 */

// Import types for internal use
import type { Router } from './base';
import { URLPatternRouter } from './url-pattern';
import { RadixTreeRouter } from './radix-tree';

// Export base types and interfaces
export type { Router, Result, Params } from './base';
export {
  METHOD_NAME_ALL,
  METHODS,
  RouterUtils,
  CommonRouteValidation,
  UnsupportedPathError,
} from './base';

// Export router implementations
export { URLPatternRouter } from './url-pattern';
export { RadixTreeRouter } from './radix-tree';

// Export router types for configuration
export type RouterType = 'url-pattern' | 'radix-tree';

/**
 * Create a router instance based on the specified type
 */
export function createRouter<T>(type: RouterType): Router<T> {
  switch (type) {
    case 'url-pattern':
      return new URLPatternRouter<T>();
    case 'radix-tree':
      return new RadixTreeRouter<T>();
    default:
      throw new Error(`Unknown router type: ${type}`);
  }
}

/**
 * Get the default router type
 */
export function getDefaultRouterType(): RouterType {
  return 'url-pattern';
}

/**
 * Check if a router type is valid
 */
export function isValidRouterType(type: string): type is RouterType {
  return type === 'url-pattern' || type === 'radix-tree';
}
