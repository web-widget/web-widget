/**
 * @fileoverview Router Base Types and Interfaces
 */

export const METHOD_NAME_ALL = 'ALL' as const;
export const METHODS = [
  'get',
  'post',
  'put',
  'delete',
  'options',
  'patch',
  'head',
] as const;

export interface Router<T> {
  add(method: string, pathname: string, handler: T): void;
  match(method: string, pathname: string): Result<T>;
}

export type Params = Record<string, string>;

export function decodePathParam(value: string): string {
  return value.indexOf('%') === -1 ? value : decodeURIComponent(value);
}

/**
 * Router result type
 *
 * @example
 * ```typescript
 * const result: Result<Handler> = [
 *   [handler, { id: '123' }, '/users/:id'],
 *   [handler2, { id: '123', name: 'john' }, '/users/:id/:name']
 * ];
 * ```
 */
export type Result<T> = [T, Params, string][];

export class UnsupportedPathError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'UnsupportedPathError';
  }
}
