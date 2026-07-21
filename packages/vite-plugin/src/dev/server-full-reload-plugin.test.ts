import { describe, expect, test } from '@jest/globals';
import { shouldReloadClientForServerUpdate } from './server-full-reload-policy';

describe('shouldReloadClientForServerUpdate', () => {
  const clientModuleGraph = {
    getModulesByFile(file: string) {
      return file.includes('shared') ? new Set([{}]) : undefined;
    },
  };

  test('keeps HMR for ordinary modules shared with the client', () => {
    expect(
      shouldReloadClientForServerUpdate(
        [{ file: '/project/shared-widget.tsx' }],
        clientModuleGraph,
        false
      )
    ).toBe(false);
  });

  test('keeps HMR for CSS Modules shared with the client', () => {
    expect(
      shouldReloadClientForServerUpdate(
        [{ file: '/project/shared.module.css' }],
        clientModuleGraph,
        true
      )
    ).toBe(false);
  });

  test('reloads CSS Modules when custom class names may change', () => {
    expect(
      shouldReloadClientForServerUpdate(
        [{ file: '/project/shared.module.css' }],
        clientModuleGraph,
        false
      )
    ).toBe(true);
  });

  test('reloads for modules without a client counterpart', () => {
    expect(
      shouldReloadClientForServerUpdate(
        [{ file: '/project/server-only-route.ts' }],
        clientModuleGraph,
        true
      )
    ).toBe(true);
  });
});
