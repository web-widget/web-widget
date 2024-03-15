import { AsyncLocalStorage } from 'node:async_hooks';

import primitives from '@edge-runtime/primitives';

if (!Reflect.get(global, 'DISABLE_INSTALL_MCA_SHIMS')) {
  for (const [key, value] of Object.entries(primitives)) {
    if (!(key in global)) {
      (global as any)[key] = value;
    }
  }
}

// @see https://github.com/unjs/unctx
Object.assign(global, {
  AsyncLocalStorage,
});
