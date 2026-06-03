import { describe, expect, test } from 'vitest';
import { Context } from './context';
import { getRewriteState } from './rewrite';
import { runMatchedStack } from './stack';
import type { MiddlewareHandler } from './types';

describe('runMatchedStack', () => {
  describe('context binding', () => {
    test('sets params and pathname when a handler is entered', async () => {
      const context = new Context(new Request('http://localhost/v1/x'));
      const seen: string[] = [];

      const run = runMatchedStack([
        [
          async (ctx) => {
            seen.push(`${ctx.pathname}:${ctx.params.id}`);
            return new Response('ok');
          },
          { id: '42' },
          '/v1/:id',
        ],
      ]);

      const res = await run(context, () => new Response('404'));
      expect(res.status).toBe(200);
      expect(seen).toEqual(['/v1/:id:42']);
    });
  });

  describe('rewrite integration', () => {
    test('records handlers that were actually entered on the initial stack', async () => {
      const context = new Context(new Request('http://localhost/'));
      const state = getRewriteState(context);
      const global: MiddlewareHandler = async (_ctx, next) => next();
      const route: MiddlewareHandler = async () => new Response('route');

      const run = runMatchedStack(
        [
          [global, {}, '*'],
          [route, { id: '1' }, '/:id'],
        ],
        { rewriteState: state, recordInitialHandlers: true }
      );

      await run(context, () => new Response('404'));

      expect(state._hasRecordedInitialHandlers).toBe(true);
      expect(state._initialExecutedHandlers.has(global)).toBe(true);
      expect(state._initialExecutedHandlers.has(route)).toBe(true);
    });

    test('forbids next() after rewrite() in the same handler frame', async () => {
      const context = new Context(new Request('http://localhost/'));
      const state = getRewriteState(context);
      state._rewriteCalled = true;

      const run = runMatchedStack(
        [[async (_ctx, next) => await next(), {}, '*']],
        { rewriteState: state }
      );

      await expect(run(context, () => new Response('404'))).rejects.toThrow(
        /after rewrite/i
      );
    });
  });
});
