/**
 * @fileoverview Runtime URL rewrite utilities
 */
import { createHttpError } from '@web-widget/helpers/error';
import type { Context } from './context';
import type { Router } from './router';
import type { MiddlewareHandler, MiddlewareNext } from './types';

/** Default maximum nested rewrite depth per request. */
export const DEFAULT_MAX_REWRITE_DEPTH = 10;

/** Route pattern for app-wide middleware registered via `app.use('*', ...)`. */
export const GLOBAL_ROUTE_PATTERN = '*';

/** @internal Per-request rewrite tracking (stored in WeakMap, not on `context.state`). */
export interface RewriteState {
  /** Handlers already run on the initial (external) route match — skipped on rewrite. */
  readonly _initialExecutedHandlers: WeakSet<MiddlewareHandler>;
  /** Whether any handler from the initial chain has been recorded. */
  _hasRecordedInitialHandlers: boolean;
  _depth: number;
  /** Destinations visited in the current rewrite branch (stack + set for O(1) lookup). */
  readonly _rewriteStack: string[];
  readonly _rewriteVisited: Set<string>;
  _nextCompleted: boolean;
  _rewriteCalled: boolean;
}

const rewriteStateByContext = new WeakMap<Context, RewriteState>();

export function getRewriteState(context: Context): RewriteState {
  let state = rewriteStateByContext.get(context);
  if (!state) {
    state = {
      _initialExecutedHandlers: new WeakSet(),
      _hasRecordedInitialHandlers: false,
      _depth: 0,
      _rewriteStack: [],
      _rewriteVisited: new Set(),
      _nextCompleted: false,
      _rewriteCalled: false,
    };
    rewriteStateByContext.set(context, state);
  }
  return state;
}

export function hasExplicitSearch(destination: string | URL): boolean {
  if (typeof destination === 'string') {
    const queryIndex = destination.indexOf('?');
    return queryIndex !== -1;
  }
  return destination.search !== '';
}

/**
 * Resolve rewrite destination: same-origin only; merge query per RFC.
 */
export function resolveRewriteDestination(
  destination: string | URL,
  request: Request
): URL {
  const base = new URL(request.url);
  const resolved =
    destination instanceof URL
      ? new URL(destination)
      : new URL(destination, base);

  if (resolved.origin !== base.origin) {
    throw createHttpError(
      400,
      'Rewrite destination must be same-origin or relative'
    );
  }

  if (!hasExplicitSearch(destination)) {
    resolved.search = base.search;
  }

  return resolved;
}

export function rewritePathKey(url: URL): string {
  return url.pathname + url.search;
}

export function assertRewriteAllowed(state: RewriteState): void {
  if (state._nextCompleted) {
    throw createHttpError(
      500,
      'Cannot rewrite() after next() has completed in the same handler'
    );
  }
  if (state._rewriteCalled) {
    throw createHttpError(
      500,
      'Cannot call rewrite() or next() again after rewrite() in the same handler'
    );
  }
}

export function trackInitialExecutedHandler(
  state: RewriteState,
  handler: MiddlewareHandler
): void {
  state._initialExecutedHandlers.add(handler);
  state._hasRecordedInitialHandlers = true;
}

export function createGuardedNext(
  state: RewriteState,
  next: MiddlewareNext
): MiddlewareNext {
  return async () => {
    if (state._rewriteCalled) {
      throw createHttpError(
        500,
        'Cannot call next() after rewrite() in the same handler'
      );
    }
    const response = await next();
    state._nextCompleted = true;
    return response;
  };
}

export function pushRewriteDestination(
  state: RewriteState,
  pathKey: string
): void {
  if (state._rewriteVisited.has(pathKey)) {
    throw createHttpError(508, 'Rewrite loop detected');
  }
  state._rewriteStack.push(pathKey);
  state._rewriteVisited.add(pathKey);
}

export function popRewriteDestination(state: RewriteState): void {
  const pathKey = state._rewriteStack.pop();
  if (pathKey) {
    state._rewriteVisited.delete(pathKey);
  }
}

/**
 * Skip only global (`*`) handlers already run on the initial external match.
 * Route-scoped handlers for the rewrite target must still run (incl. cycle targets).
 */
export function filterHandlersForRewrite<T extends MiddlewareHandler>(
  handlers: ReturnType<Router<T>['match']>,
  state: RewriteState
): ReturnType<Router<T>['match']> {
  if (!state._hasRecordedInitialHandlers) {
    return handlers;
  }
  const executed = state._initialExecutedHandlers;
  const filtered: ReturnType<Router<T>['match']> = [];
  for (let i = 0; i < handlers.length; i++) {
    const entry = handlers[i];
    const pattern = entry[2];
    if (pattern === GLOBAL_ROUTE_PATTERN && executed.has(entry[0])) {
      continue;
    }
    filtered.push(entry);
  }
  return filtered;
}
