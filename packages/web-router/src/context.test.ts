import { describe, expect, test } from 'vitest';
import { Context } from './context';

describe('Context.waitUntil', () => {
  test('delegates promises to executionContext', () => {
    const delegated: Promise<unknown>[] = [];
    const context = new Context(new Request('http://localhost/'), {
      env: {},
      executionContext: {
        waitUntil: (promise) => {
          delegated.push(promise);
        },
        passThroughOnException: () => {},
      },
    });

    const task = Promise.resolve('done');
    context.waitUntil(task);

    expect(delegated).toEqual([task]);
  });

  test('tracks pending tasks until they settle', async () => {
    let resolveTask!: () => void;
    const task = new Promise<void>((resolve) => {
      resolveTask = resolve;
    });
    const context = new Context(new Request('http://localhost/'), {
      env: {},
      executionContext: {
        waitUntil: () => {},
        passThroughOnException: () => {},
      },
    });

    context.waitUntil(task);
    expect(context.getPendingBackgroundTasks()).toHaveLength(1);

    resolveTask();
    await task;
    expect(context.getPendingBackgroundTasks()).toHaveLength(0);
  });

  test('tracks multiple concurrent waitUntil tasks', async () => {
    const context = new Context(new Request('http://localhost/'), {
      env: {},
      executionContext: {
        waitUntil: () => {},
        passThroughOnException: () => {},
      },
    });

    let resolveFirst!: () => void;
    let resolveSecond!: () => void;
    const first = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });
    const second = new Promise<void>((resolve) => {
      resolveSecond = resolve;
    });

    context.waitUntil(first);
    context.waitUntil(second);
    expect(context.getPendingBackgroundTasks()).toHaveLength(2);

    resolveFirst();
    await first;
    expect(context.getPendingBackgroundTasks()).toHaveLength(1);

    resolveSecond();
    await second;
    expect(context.getPendingBackgroundTasks()).toHaveLength(0);
  });

  test('throws when executionContext is missing', () => {
    const context = new Context(new Request('http://localhost/'), { env: {} });
    expect(() => context.waitUntil(Promise.resolve())).toThrow(/FetchEvent/);
  });
});
