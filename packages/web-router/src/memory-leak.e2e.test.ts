// @ts-nocheck
/**
 * @fileoverview E2E memory leak test — runs in a real Node.js process.
 *
 * Unlike the vitest cloudflare-pool tests, this test runs in plain Node (via
 * `vitest.e2e.config.ts` with `pool: 'forks'`), exercising the real
 * `Application.handler()` entry point through many iterations and asserting
 * that heap memory does not grow unbounded.
 *
 * It also writes before/after V8 heap snapshots that can be diffed in Chrome
 * DevTools (Memory tab → Compare), and includes WeakRef-based GC verification
 * tests that were relocated from `memory-leak.test.ts` (which runs in the
 * cloudflare pool where `globalThis.gc` is unavailable).
 *
 * Usage:
 *   pnpm --filter @web-widget/web-router test:memory-leak
 */
import { mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import v8 from 'node:v8';
import { afterAll, beforeAll, describe, test, expect } from 'vitest';
import 'urlpattern-polyfill';
import { callContext, context } from '@web-widget/context/server';
import { lifecycleCache, cacheProvider } from '@web-widget/lifecycle-cache';
import { Application } from './application';
import { Context } from './context';
import { ModuleRuntime } from './module';

// ─── Configuration ───────────────────────────────────────────────────────

const WARMUP_ITERATIONS = 200;
const MEASURE_ITERATIONS = 1000;
const HEAP_GROWTH_THRESHOLD_RATIO = 1.5; // max 50% growth
const HEAP_GROWTH_THRESHOLD_BYTES = 10 * 1024 * 1024; // or max 10MB absolute

const GC_AVAILABLE = typeof globalThis.gc === 'function';
const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_DIR = join(__dirname, '..', '.heap-snapshots');

// ─── Helpers ─────────────────────────────────────────────────────────────

function gc(): void {
  // V8's incremental GC may need multiple cycles to collect all generations.
  // Flush microtasks between cycles so .finally() callbacks run first.
  globalThis.gc!();
  globalThis.gc!();
}

async function gcAsync(): Promise<void> {
  // Let microtasks (e.g. .finally cleanup) drain before GC cycles
  await new Promise((r) => setTimeout(r, 0));
  gc();
  await new Promise((r) => setTimeout(r, 0));
  gc();
}

function heapUsed(): number {
  return process.memoryUsage().heapUsed;
}

function writeSnapshot(name: string): string {
  if (!existsSync(SNAPSHOT_DIR)) {
    mkdirSync(SNAPSHOT_DIR, { recursive: true });
  }
  const path = join(SNAPSHOT_DIR, `${name}.heapsnapshot`);
  v8.writeHeapSnapshot(path);
  return path;
}

function mockExecutionContext() {
  return {
    waitUntil: () => {},
    passThroughOnException: () => {},
  };
}

function mockLayoutModule() {
  return {
    default: () => 'layout',
    render: async () => '<html>rendered</html>',
  };
}

function mockRuntime(): ModuleRuntime {
  return new ModuleRuntime({
    layoutModule: mockLayoutModule() as never,
    defaultMeta: { title: 'E2E Leak Test' } as never,
    defaultBaseAsset: '/assets/',
    defaultRenderer: {} as never,
    onFallback: () => {},
    dev: false,
  });
}

function text(body: string, init?: ResponseInit): Response {
  return new Response(body, init);
}

// ─── App setup ───────────────────────────────────────────────────────────

function createApp(): Application {
  const runtime = mockRuntime();
  const app = new Application();
  app.useModuleRuntime(runtime);

  // Middleware: sets up callContext scope (needed for lifecycleCache).
  // Route handlers below rely on this middleware — they do NOT re-enter
  // callContext, to match real production usage.
  app.use('*', callContext);

  // Scenario 1: lifecycleCache usage
  app.get('/cache/:id', async (c) => {
    const id = c.params.id as string;
    const data = await cacheProvider(`item-${id}`, async () => ({
      id,
      timestamp: Date.now(),
      payload: 'x'.repeat(1024), // 1KB payload
    }));
    return new Response(JSON.stringify(data), {
      headers: { 'content-type': 'application/json' },
    });
  });

  // Scenario 2: rewrite
  app.use('/old/:path', (c) => {
    return c.rewrite(`/new/${c.params.path}`);
  });
  app.get('/new/:path', (c) => {
    return new Response(`new:${c.params.path}`);
  });

  // Scenario 3: rewrite with lifecycleCache state
  app.use('/rewrite-cache/:id', (c) => {
    lifecycleCache().set('pre-rewrite', 'value', true);
    return c.rewrite(`/cached-target/${c.params.id}`);
  });
  app.get('/cached-target/:id', (c) => {
    const val = lifecycleCache().get('pre-rewrite');
    return new Response(`cached:${val ?? 'missing'}:${c.params.id}`);
  });

  // Scenario 4: waitUntil with pending background tasks
  app.get('/waituntil/:id', (c) => {
    const id = c.params.id as string;
    c.waitUntil(
      new Promise<void>((resolve) => {
        // Simulate short background work
        setTimeout(resolve, 1);
      })
    );
    return new Response(`waituntil:${id}`);
  });

  // Scenario 5: ModuleRuntime route with activation
  const routeModule = {
    render: () => 'rendered-content',
    handler: { GET: (c) => c.html() },
  };
  app.use('/page/:id', runtime.createRouteHandler(routeModule));

  // Scenario 6: error + fallback (activation cleanup on error path)
  app.get('/error/:id', () => {
    throw new Error(`boom-${Date.now()}`);
  });

  return app;
}

interface Scenario {
  name: string;
  url: (i: number) => string;
}

const scenarios: Scenario[] = [
  { name: 'lifecycleCache', url: (i) => `http://localhost/cache/${i}` },
  { name: 'rewrite', url: (i) => `http://localhost/old/${i}` },
  { name: 'rewrite+cache', url: (i) => `http://localhost/rewrite-cache/${i}` },
  { name: 'waitUntil', url: (i) => `http://localhost/waituntil/${i}` },
  { name: 'activation', url: (i) => `http://localhost/page/${i}` },
  { name: 'error', url: (i) => `http://localhost/error/${i}` },
];

// ─── Load runner ─────────────────────────────────────────────────────────

async function runLoad(app: Application, iterations: number): Promise<void> {
  const ctx = mockExecutionContext();
  for (let i = 0; i < iterations; i++) {
    for (const scenario of scenarios) {
      const res = await app.handler(
        new Request(scenario.url(i)),
        {},
        ctx as never
      );
      // Drain the response body to release references
      if (res.body) {
        await res.text();
      }
    }
  }
}

async function measureHeap(
  app: Application,
  iterations: number,
  label: string
): Promise<number> {
  await runLoad(app, iterations);
  // Allow pending waitUntil timers/promises to settle
  await new Promise((r) => setTimeout(r, 100));
  gc();
  const used = heapUsed();
  console.log(`  [${label}] heapUsed = ${(used / 1024 / 1024).toFixed(2)} MB`);
  return used;
}

// ─── E2E heap growth tests ───────────────────────────────────────────────

describe.skipIf(!GC_AVAILABLE)('E2E memory leak (requires --expose-gc)', () => {
  let app: Application;

  beforeAll(() => {
    app = createApp();
  });

  afterAll(() => {
    console.log(`\n  Heap snapshots written to: ${SNAPSHOT_DIR}`);
    console.log(
      '  Compare in Chrome DevTools: Memory tab → "Compare" → select both .heapsnapshot files\n'
    );
  });

  test('heap does not grow unbounded across high-iteration load', async () => {
    // 1. Warmup: stabilize JIT, inline caches, and V8 internals
    console.log('Warmup phase...');
    await measureHeap(app, WARMUP_ITERATIONS, 'warmup');

    // 2. Baseline measurement
    console.log('Baseline measurement...');
    const baseline = await measureHeap(app, 50, 'baseline');

    // Write baseline heap snapshot for manual diffing
    const baselineSnapshot = writeSnapshot('baseline');
    console.log(`  Baseline snapshot: ${baselineSnapshot}`);

    // 3. Load phase: run many iterations
    console.log(
      `Load phase: ${MEASURE_ITERATIONS} iterations × ${scenarios.length} scenarios...`
    );
    await runLoad(app, MEASURE_ITERATIONS);
    await new Promise((r) => setTimeout(r, 200));

    // 4. Final measurement
    gc();
    const final = heapUsed();
    console.log(`  [final] heapUsed = ${(final / 1024 / 1024).toFixed(2)} MB`);

    const finalSnapshot = writeSnapshot('final');
    console.log(`  Final snapshot: ${finalSnapshot}`);

    // 5. Assertions
    const growth = final - baseline;
    const growthRatio = final / baseline;
    console.log('\nResults:');
    console.log(`  Baseline: ${(baseline / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Final:    ${(final / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Growth:   ${(growth / 1024).toFixed(0)} KB`);
    console.log(`  Ratio:    ${growthRatio.toFixed(2)}x`);

    expect(growthRatio).toBeLessThanOrEqual(HEAP_GROWTH_THRESHOLD_RATIO);
    expect(growth).toBeLessThanOrEqual(HEAP_GROWTH_THRESHOLD_BYTES);
  }, 60000); // 60s timeout for high-iteration load

  test('heap reaches steady state (no further growth on second round)', async () => {
    gc();
    const before = heapUsed();

    await runLoad(app, MEASURE_ITERATIONS);
    await new Promise((r) => setTimeout(r, 200));
    gc();

    const after = heapUsed();
    const growth = after - before;
    console.log(
      `  Steady-state growth: ${(growth / 1024).toFixed(0)} KB (${(before / 1024 / 1024).toFixed(2)} MB → ${(after / 1024 / 1024).toFixed(2)} MB)`
    );

    expect(growth).toBeLessThanOrEqual(HEAP_GROWTH_THRESHOLD_BYTES / 2);
  }, 60000);
});

// ─── GC verification tests (WeakRef-based) ───────────────────────────────
//
// These tests use WeakRef to verify that per-request objects are actually
// collectable by the garbage collector. They run in the e2e config where
// `globalThis.gc` is available via `execArgv: ['--expose-gc']`.

describe.skipIf(!GC_AVAILABLE)('GC verification (requires --expose-gc)', () => {
  test('Context is collectable after normal dispatch', async () => {
    const app = new Application();
    let contextRef: WeakRef<any> | undefined;

    app.use('*', (c: any, next: any) => {
      contextRef = new WeakRef(c);
      return next();
    });
    app.get('/hello', () => text('ok'));

    const res = await app.dispatch('http://localhost/hello');
    expect(res.status).toBe(200);

    await gcAsync();
    expect(contextRef!.deref()).toBeUndefined();
  });

  test('Context is collectable after rewrite dispatch', async () => {
    const app = new Application();
    let contextRef: WeakRef<any> | undefined;

    app.use('*', (c: any) => {
      contextRef = new WeakRef(c);
      return c.rewrite('/internal');
    });
    app.get('/internal', () => text('ok'));

    const res = await app.dispatch('http://localhost/v1/foo');
    expect(res.status).toBe(200);

    await gcAsync();
    expect(contextRef!.deref()).toBeUndefined();
  });

  test('Request objects created during rewrite are collectable', async () => {
    const app = new Application();
    const requestRefs: WeakRef<Request>[] = [];

    app.use('*', (c: any) => {
      requestRefs.push(new WeakRef(c.request));
      return c.rewrite('/internal');
    });
    app.get('/internal', (c: any) => {
      requestRefs.push(new WeakRef(c.request));
      return text('ok');
    });

    const res = await app.dispatch('http://localhost/v1/foo');
    expect(res.status).toBe(200);
    expect(requestRefs).toHaveLength(2);

    await gcAsync();
    // Both Request objects should be collected (no global retention)
    expect(requestRefs[0]!.deref()).toBeUndefined();
    expect(requestRefs[1]!.deref()).toBeUndefined();
  });

  test('lifecycleCache state is collectable after callContext scope', async () => {
    let stateRef: WeakRef<object> | undefined;

    await callContext({ state: {} } as never, () => {
      const cache = lifecycleCache();
      cache.set('key', 'value', true);
      stateRef = new WeakRef(context().state);
    });

    await gcAsync();
    expect(stateRef!.deref()).toBeUndefined();
  });

  test('Context with never-settling waitUntil is still collectable', async () => {
    // Even if a waitUntil promise never settles, the Context itself
    // should be collectable once no external references remain
    // (the pending task Set is an instance property, not global)
    let ctx: Context | undefined = new Context(
      new Request('http://localhost/'),
      {
        env: {},
        executionContext: mockExecutionContext() as never,
      }
    );

    // Register a promise that will never settle
    ctx.waitUntil(new Promise(() => {}));

    const ref = new WeakRef(ctx);
    // Drop our strong reference
    ctx = undefined;

    await gcAsync();
    // Context should be collectable despite the never-settling promise
    // because the promise is only held by the Context's internal Set
    expect(ref.deref()).toBeUndefined();
  });
});

// Always-running smoke test when GC is not available
describe.skipIf(GC_AVAILABLE)(
  'E2E memory leak (skipped: --expose-gc required)',
  () => {
    test('skip with guidance', () => {
      console.log(
        '  E2E memory leak tests require --expose-gc.\n' +
          '  Run with: pnpm --filter @web-widget/web-router test:memory-leak'
      );
      expect(true).toBe(true);
    });
  }
);
