import { describe, expect, test } from 'vitest';
import { normalizeProductionBody } from './normalize-production-snapshot';

describe('normalizeProductionBody', () => {
  test('strips content hashes from @widget asset paths', () => {
    const html =
      '<web-widget import="/assets/_components_.Counter@widget-u_LIu1LW.js" name="ReactCounter"></web-widget>';
    expect(normalizeProductionBody(html)).toContain(
      'import="/assets/_components_.Counter@widget.js"'
    );
    expect(normalizeProductionBody(html)).not.toContain('u_LIu1LW');
  });

  test('strips content hashes from @widget asset paths with source extension', () => {
    const html =
      '<web-widget import="/assets/_components_.Counter@widget.tsx-BuRddFH-.js" name="ReactCounter"></web-widget>';
    expect(normalizeProductionBody(html)).toContain(
      'import="/assets/_components_.Counter@widget.tsx.js"'
    );
    expect(normalizeProductionBody(html)).not.toContain('BuRddFH');
  });

  test('strips hashes from nested route asset paths', () => {
    const html =
      'import="/assets/_vue3_.vue3-import-widgets.ImportWidgets@widget-Dtsvmhnj.js"';
    expect(normalizeProductionBody(html)).toContain('ImportWidgets@widget.js');
  });
});
