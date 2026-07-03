// @see https://github.com/vitest-dev/vitest/blob/45a0f88437ffdb2d55bf65c2ae7cff65f41bd757/packages/vitest/src/integrations/env/utils.ts#L80-L83
['window', 'self', 'top', 'parent'].forEach((key) => {
  Reflect.deleteProperty(globalThis, key);
});
