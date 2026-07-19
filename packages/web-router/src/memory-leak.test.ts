/**
 * @fileoverview Memory leak tests for lifecycleCache, context.rewrite(), and risky features.
 *
 * These tests verify that per-request objects (Context, Request, state, activations)
 * are properly cleaned up and do not leak across requests or accumulate globally.
 *
 * GC verification (WeakRef-based) tests live in `memory-leak.e2e.test.ts` which
 * runs in a real Node.js process with `--expose-gc`.
 *
 * @example
 * pnpm exec vitest run src/memory-leak.test.ts
 */
import { describe, test, expect } from 'vitest';
import { callContext } from '@web-widget/context/server';
import { lifecycleCache, cacheProvider } from '@web-widget/lifecycle-cache';
import { Application } from './application';
import { Context } from './context';
import { ModuleRuntime } from './module';
import type {
  LayoutModule,
  Meta,
  MiddlewareContext,
  RouteModule,
  ServerRenderOptions,
} from './types';

// ─── Helpers ─────────────────────────────────────────────────────────────

function text(body: string, init?: ResponseInit): Response {
  return new Response(body, init);
}

function createMockExecutionContext() {
  return {
    waitUntil: () => {},
    passThroughOnException: () => {},
  };
}

function createMockLayoutModule(): LayoutModule {
  return {
    default: () => 'layout',
    render: async () => '<html>rendered</html>',
  };
}

function createMockRuntime(): ModuleRuntime {
  return new ModuleRuntime({
    layoutModule: createMockLayoutModule(),
    defaultMeta: { title: 'Test' } as Meta,
    defaultBaseAsset: '/assets/',
    defaultRenderer: {} as ServerRenderOptions,
    onFallback: () => {},
    dev: false,
  });
}

// ─── lifecycleCache ──────────────────────────────────────────────────────

describe('Memory leak: lifecycleCache', () => {
  test('cache values do not leak across independent request scopes', () => {
    const state1: Record<string, unknown> = {};
    const state2: Record<string, unknown> = {};

    callContext({ state: state1 } as never, () => {
      lifecycleCache().set('key', 'value1', true);
    });

    callContext({ state: state2 } as never, () => {
      const cache = lifecycleCache();
      expect(cache.has('key')).toBe(false);
      expect(cache.get('key')).toBeUndefined();
    });

    // state1 retains the value (per-request), state2 does not
    expect(state1.key).toBe('value1');
    expect(state2.key).toBeUndefined();
  });

  test('cacheProvider caches resolved value, not the Promise', async () => {
    const state: Record<string, unknown> = {};

    await callContext({ state } as never, async () => {
      const result = await cacheProvider('test-key', async () => ({
        id: 42,
      }));
      expect(result).toEqual({ id: 42 });

      // After resolution, cache should hold the resolved value, not the Promise
      const cache = lifecycleCache<{ [k: string]: unknown }>();
      const cached = cache.get('^test-key');
      expect(cached).toEqual({ id: 42 });
      expect(cached).not.toBeInstanceOf(Promise);
    });
  });

  test('cacheProvider does not call handler twice on cache hit', async () => {
    const state: Record<string, unknown> = {};
    let callCount = 0;

    await callContext({ state } as never, async () => {
      await cacheProvider('counter', async () => {
        callCount++;
        return callCount;
      });
      await cacheProvider('counter', async () => {
        callCount++;
        return callCount;
      });
    });

    expect(callCount).toBe(1);
  });

  test('lifecycleCache with explicit state works without callContext scope', () => {
    const state: Record<string, unknown> = {};
    const cache = lifecycleCache(state);

    cache.set('x', 'y');
    expect(state.x).toBe('y');

    // Calling lifecycleCache() without state and without scope should throw
    // (no leaked global context)
    expect(() => lifecycleCache()).toThrow();
  });

  test('state objects from different contexts are not shared', () => {
    const ctx1 = new Context(new Request('http://localhost/1'), { env: {} });
    const ctx2 = new Context(new Request('http://localhost/2'), { env: {} });

    ctx1.state.key = 'value1';
    ctx2.state.key = 'value2';

    expect(ctx1.state.key).toBe('value1');
    expect(ctx2.state.key).toBe('value2');
    expect(ctx1.state).not.toBe(ctx2.state);
  });
});

// ─── context.rewrite() ───────────────────────────────────────────────────

describe('Memory leak: context.rewrite()', () => {
  test('rewrite does not accumulate handler executions across dispatches', async () => {
    let executionCount = 0;
    const app = new Application();

    app.use('*', (c, next) => {
      executionCount++;
      if (new URL(c.originalRequest.url).pathname.startsWith('/v1')) {
        return c.rewrite('/internal');
      }
      return next();
    });
    app.get('/internal', () => text('ok'));

    for (let i = 0; i < 5; i++) {
      executionCount = 0;
      const res = await app.dispatch(`http://localhost/v1/${i}`);
      expect(res.status).toBe(200);
      // Middleware runs once per dispatch; rewrite skips already-executed handlers
      expect(executionCount).toBe(1);
    }
  });

  test('rewrite clears module activation after dispatch', async () => {
    const runtime = createMockRuntime();
    let capturedContext: MiddlewareContext | undefined;

    const app = new Application();
    app.useModuleRuntime(runtime);

    app.use('*', (c) => {
      capturedContext = c;
      return c.rewrite('/target');
    });

    const routeModule: RouteModule = {
      render: () => 'content',
      handler: { GET: (c) => c.html!() },
    };
    app.use('/target', runtime.createRouteHandler(routeModule));

    const res = await app.dispatch('http://localhost/v1/foo');
    expect(res.status).toBe(200);
    expect(ModuleRuntime.hasActivation(capturedContext!)).toBe(false);
  });

  test('rewrite loop detection (visited set) does not persist across dispatches', async () => {
    const app = new Application();

    app.use('*', (c, next) => {
      const path = new URL(c.originalRequest.url).pathname;
      if (path === '/a') return c.rewrite('/b');
      return next();
    });
    app.get('/b', () => text('ok'));

    // Each dispatch should succeed — no accumulated loop detection state
    for (let i = 0; i < 3; i++) {
      const res = await app.dispatch('http://localhost/a');
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('ok');
    }
  });

  test('executedHandlers WeakSet does not skip handlers on subsequent dispatches', async () => {
    const log: string[] = [];
    const app = new Application();

    app.use('*', (_, next) => {
      log.push('global');
      return next();
    });
    app.use('/source', (c) => c.rewrite('/target'));
    app.get('/target', () => text('ok'));

    await app.dispatch('http://localhost/source');
    expect(log).toEqual(['global']);

    log.length = 0;
    await app.dispatch('http://localhost/source');
    // Global middleware should run again on the second dispatch
    expect(log).toEqual(['global']);
  });

  test('rewrite closure does not prevent state cleanup within a request', async () => {
    const app = new Application();
    app.use('*', callContext);

    app.use('*', (c) => {
      c.state.marker = 'set';
      return c.rewrite('/target');
    });
    app.get('/target', (c) => {
      return text(`marker=${c.state.marker ?? 'missing'}`);
    });

    const res = await app.dispatch('http://localhost/v1/foo');
    expect(res.status).toBe(200);
    // State set before rewrite should be visible in rewrite target
    expect(await res.text()).toBe('marker=set');
  });
});

// ─── Risky features ─────────────────────────────────────────────────────

describe('Memory leak: risky features', () => {
  // ── waitUntil pending task cleanup ──

  describe('waitUntil pending task cleanup', () => {
    test('settled promises are removed from pending set', async () => {
      const ctx = new Context(new Request('http://localhost/'), {
        env: {},
        executionContext: createMockExecutionContext() as never,
      });

      let resolve!: () => void;
      const task = new Promise<void>((r) => {
        resolve = r;
      });

      ctx.waitUntil(task);
      expect(ctx.getPendingBackgroundTasks()).toHaveLength(1);

      resolve();
      await task;

      expect(ctx.getPendingBackgroundTasks()).toHaveLength(0);
    });

    test('multiple waitUntil tasks are individually tracked and cleaned', async () => {
      const ctx = new Context(new Request('http://localhost/'), {
        env: {},
        executionContext: createMockExecutionContext() as never,
      });

      const resolvers: (() => void)[] = [];
      const tasks = Array.from(
        { length: 5 },
        () =>
          new Promise<void>((r) => {
            resolvers.push(r);
          })
      );

      tasks.forEach((t) => ctx.waitUntil(t));
      expect(ctx.getPendingBackgroundTasks()).toHaveLength(5);

      for (let i = 0; i < 5; i++) {
        resolvers[i]();
        await tasks[i];
        expect(ctx.getPendingBackgroundTasks()).toHaveLength(4 - i);
      }
    });

    test('rejected promises are still removed from pending set', async () => {
      const ctx = new Context(new Request('http://localhost/'), {
        env: {},
        executionContext: createMockExecutionContext() as never,
      });

      let rejectTask!: (e: unknown) => void;
      const task = new Promise<void>((_, reject) => {
        rejectTask = reject;
      });

      ctx.waitUntil(task);
      expect(ctx.getPendingBackgroundTasks()).toHaveLength(1);
      const tracked = ctx.getPendingBackgroundTasks()[0];

      const rejection = expect(task).rejects.toThrow('boom');

      rejectTask(new Error('boom'));

      await rejection;
      await expect(tracked).resolves.toBeUndefined();

      expect(ctx.getPendingBackgroundTasks()).toHaveLength(0);
    });
  });

  // ── ModuleRuntime activation cleanup ──

  describe('ModuleRuntime activation cleanup', () => {
    test('activation cleared after normal dispatch', async () => {
      const runtime = createMockRuntime();
      let capturedContext: MiddlewareContext | undefined;

      const app = new Application();
      app.useModuleRuntime(runtime);

      const routeModule: RouteModule = {
        render: () => 'content',
        handler: { GET: (c) => c.html!() },
      };
      app.use('*', (c, next) => {
        capturedContext = c;
        return next();
      });
      app.use('/page', runtime.createRouteHandler(routeModule));

      const res = await app.dispatch('http://localhost/page');
      expect(res.status).toBe(200);
      expect(ModuleRuntime.hasActivation(capturedContext!)).toBe(false);
    });

    test('activation cleared after error dispatch', async () => {
      const runtime = createMockRuntime();
      let capturedContext: MiddlewareContext | undefined;

      const app = new Application();
      app.useModuleRuntime(runtime);

      app.use('*', (c, next) => {
        capturedContext = c;
        return next();
      });
      app.get('/error', () => {
        throw new Error('boom');
      });

      const res = await app.dispatch('http://localhost/error');
      expect(res.status).toBe(500);
      expect(ModuleRuntime.hasActivation(capturedContext!)).toBe(false);
    });

    test('activation cleared after rewrite to non-render target', async () => {
      const runtime = createMockRuntime();
      let capturedContext: MiddlewareContext | undefined;

      const app = new Application();
      app.useModuleRuntime(runtime);

      app.use('*', (c) => {
        capturedContext = c;
        return c.rewrite('/plain');
      });
      app.get('/plain', () => new Response('plain'));

      const res = await app.dispatch('http://localhost/v1/foo');
      expect(res.status).toBe(200);
      expect(ModuleRuntime.hasActivation(capturedContext!)).toBe(false);
    });

    test('deferred activation cleanup runs after waitUntil tasks settle', async () => {
      const runtime = createMockRuntime();
      let capturedContext: MiddlewareContext | undefined;
      let resolveTask!: () => void;
      const backgroundTask = new Promise<void>((r) => {
        resolveTask = r;
      });

      const app = new Application();
      app.useModuleRuntime(runtime);

      const routeModule: RouteModule = {
        render: () => 'content',
        handler: {
          GET(c) {
            capturedContext = c;
            c.waitUntil(backgroundTask);
            return c.html!();
          },
        },
      };
      app.use('/page', runtime.createRouteHandler(routeModule));

      const res = await app.dispatch(
        'http://localhost/page',
        undefined,
        undefined,
        createMockExecutionContext()
      );
      expect(res.status).toBe(200);

      // While background task is pending, deferred cleanup has not run yet
      // (activation may still be present because cleanup waits for all tasks)
      resolveTask();
      await backgroundTask;
      // Give the deferred .finally() a tick to run
      await new Promise((r) => setTimeout(r, 10));

      expect(ModuleRuntime.hasActivation(capturedContext!)).toBe(false);
    });
  });

  // ── Rewrite + lifecycleCache interaction ──

  describe('rewrite does not leak lifecycleCache state across requests', () => {
    test('state from rewritten request does not appear in subsequent request', async () => {
      const app = new Application();
      app.use('*', callContext);

      app.use('*', (c, next) => {
        if (new URL(c.originalRequest.url).pathname === '/first') {
          c.state.requestId = 'first';
          return c.rewrite('/target');
        }
        return next();
      });
      app.get('/target', (c) => text(`id=${c.state.requestId ?? 'undefined'}`));

      const res1 = await app.dispatch('http://localhost/first');
      expect(await res1.text()).toBe('id=first');

      const res2 = await app.dispatch('http://localhost/target');
      // Second request should NOT see the first request's state
      expect(await res2.text()).toBe('id=undefined');
    });
  });
});
