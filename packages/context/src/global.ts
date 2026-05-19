let AsyncLocalStorage: unknown;

try {
  ({ AsyncLocalStorage } = await import('node:async_hooks'));
} catch {
  AsyncLocalStorage = undefined;
}

// @see https://github.com/unjs/unctx
Object.assign(globalThis, { AsyncLocalStorage });

export {};
