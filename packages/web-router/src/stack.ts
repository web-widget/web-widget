/**
 * @fileoverview Run matched route handler stacks with lazy execution (no per-handler wrapping).
 */
import type { Context } from './context';
import type { Result } from './router/base';
import {
  createGuardedNext,
  trackInitialExecutedHandler,
  type RewriteState,
} from './rewrite';
import type {
  MiddlewareHandler,
  MiddlewareNext,
  NotFoundHandler,
} from './types';

export type MatchedStack = Result<MiddlewareHandler>;

export interface RunMatchedStackOptions {
  rewriteState?: RewriteState;
  /** Record handlers for rewrite global-middleware filtering (initial external chain only). */
  recordInitialHandlers?: boolean;
}

export type MatchedStackRunner = (
  context: Context,
  notFound: NotFoundHandler
) => Promise<Response>;

/**
 * Build a runner for router match tuples (handler, params, pattern).
 *
 * Guards and context binding run only when a handler is actually entered,
 * unlike `compose(..., each)` which maps the full list up front.
 */
export function runMatchedStack(
  matched: MatchedStack,
  options: RunMatchedStackOptions = {}
): MatchedStackRunner {
  const { rewriteState, recordInitialHandlers = false } = options;

  return (context, notFound) => {
    let index = -1;
    return runAt(0);

    async function runAt(i: number): Promise<Response> {
      if (i <= index) {
        throw new Error('next() called multiple times.');
      }
      index = i;

      if (i < matched.length) {
        const [handler, params, pathname] = matched[i];
        context.params = params;
        context.pathname = pathname;

        if (recordInitialHandlers && rewriteState) {
          trackInitialExecutedHandler(rewriteState, handler);
        }

        const advance: MiddlewareNext = () => runAt(i + 1);
        const next: MiddlewareNext = rewriteState
          ? createGuardedNext(rewriteState, advance)
          : advance;

        return await handler(context, next);
      }

      if (i === matched.length) {
        return notFound(context);
      }

      return new Response(null, {
        status: 404,
        statusText: 'Not Found',
      });
    }
  };
}
