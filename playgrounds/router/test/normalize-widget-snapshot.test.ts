import { describe, expect, test } from 'vitest';
import {
  normalizeSolidWidgetSnapshot,
  normalizeWidgetIds,
} from './normalize-widget-snapshot';

describe('normalizeSolidWidgetSnapshot', () => {
  test('normalizes generated Widget IDs and derived Solid hydration keys', () => {
    const html =
      '<web-widget id="w2a"><button data-hk="w2a00"></button></web-widget>' +
      '<web-widget id="w2b"></web-widget>';

    expect(normalizeSolidWidgetSnapshot(html)).toBe(
      '<web-widget id="WIDGET_ID_0"><button data-hk="WIDGET_ID_000"></button></web-widget>' +
        '<web-widget id="WIDGET_ID_1"></web-widget>'
    );
  });

  test('preserves ordinary scripts and normalizes Solid runtime scripts', () => {
    const html =
      '<script>keep()</script>' +
      '<script>window._$HY={};$R[2]($R[1])</script>';

    expect(normalizeSolidWidgetSnapshot(html)).toBe(
      '<script>keep()</script><script>SOLID_RUNTIME</script>'
    );
  });
});

describe('normalizeWidgetIds', () => {
  test('normalizes generated IDs without changing scripts', () => {
    const html =
      '<web-widget id="w9"></web-widget>' +
      '<script>window.value = "w9"</script>';

    expect(normalizeWidgetIds(html)).toBe(
      '<web-widget id="WIDGET_ID_0"></web-widget>' +
        '<script>window.value = "WIDGET_ID_0"</script>'
    );
  });
});
