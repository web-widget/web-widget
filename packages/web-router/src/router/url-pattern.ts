/**
 * @fileoverview URLPattern Router Implementation
 * Router implementation using Web standard URLPattern API
 */

import type { Router, Result, Params } from './base';
import { METHOD_NAME_ALL, UnsupportedPathError } from './base';

type Route<T> = [URLPattern, string, T]; // [pattern, method, handler]

export class URLPatternRouter<T> implements Router<T> {
  #routes: Route<T>[] = [];

  add(method: string, pathname: string, handler: T) {
    let pattern;
    try {
      pattern = new URLPattern({ pathname });
    } catch (error) {
      throw new UnsupportedPathError((error as Error).message, {
        cause: error,
      });
    }
    this.#routes.push([pattern, method, handler]);
  }

  match(method: string, pathname: string): Result<T> {
    const handlers: [T, Params, string][] = [];

    for (const [pattern, routeMethod, handler] of this.#routes) {
      if (routeMethod === METHOD_NAME_ALL || routeMethod === method) {
        const match = pattern.exec({ pathname });
        if (match) {
          const params = Object.create(null) as Params;
          for (const key in match.pathname.groups) {
            const value = match.pathname.groups[key];

            // In Cloudflare Workers, optional parameters return empty string instead of undefined
            // We need to normalize this to undefined for consistency with Web standards
            if (value !== undefined && value !== '') {
              params[key] = decodeURIComponent(value);
            }
          }
          Object.freeze(params);
          handlers.push([handler, params, pattern.pathname]);
        }
      }
    }

    return handlers;
  }
}
