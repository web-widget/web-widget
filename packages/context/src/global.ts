import { AsyncLocalStorage } from 'node:async_hooks';

// @see https://github.com/unjs/unctx
Object.assign(globalThis, {
  AsyncLocalStorage,
});
