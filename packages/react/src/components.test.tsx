import { createElement } from 'react';
import { container, resolveFallback } from './components';

// Mock the WebWidgetRenderer to avoid needing the full widget runtime.
jest.mock('@web-widget/web-widget', () => {
  return {
    WebWidgetRenderer: class {
      localName = 'web-widget';
      attributes: Record<string, string> = {};
      constructor(_loader: unknown, options: { name?: string }) {
        if (options.name) {
          this.attributes.name = options.name;
        }
      }
      async renderInnerHTMLToString() {
        return '<div>widget content</div>';
      }
    },
  };
});

describe('resolveFallback', () => {
  test('undefined fallback resolves to undefined for both', () => {
    const { loadingFallback, errorFallback } = resolveFallback(undefined);
    expect(loadingFallback).toBeUndefined();
    expect(errorFallback).toBeUndefined();
  });

  test('ReactNode fallback is used for both loading and error', () => {
    const spinner = createElement('div', null, 'Loading');
    const { loadingFallback, errorFallback } = resolveFallback(spinner);
    expect(loadingFallback).toBe(spinner);
    expect(errorFallback).toBe(spinner);
  });

  test('object with only loading uses loading for both', () => {
    const spinner = createElement('div', null, 'Loading');
    const { loadingFallback, errorFallback } = resolveFallback({
      loading: spinner,
    });
    expect(loadingFallback).toBe(spinner);
    expect(errorFallback).toBe(spinner);
  });

  test('object with only error uses undefined for loading', () => {
    const errorUI = createElement('div', null, 'Error');
    const { loadingFallback, errorFallback } = resolveFallback({
      error: errorUI,
    });
    expect(loadingFallback).toBeUndefined();
    expect(errorFallback).toBe(errorUI);
  });

  test('object with both loading and error uses them independently', () => {
    const spinner = createElement('div', null, 'Loading');
    const errorUI = createElement('div', null, 'Error');
    const { loadingFallback, errorFallback } = resolveFallback({
      loading: spinner,
      error: errorUI,
    });
    expect(loadingFallback).toBe(spinner);
    expect(errorFallback).toBe(errorUI);
  });
});

describe('container', () => {
  const mockLoader = (() =>
    Promise.resolve({
      default: () => createElement('div', null, 'hello'),
    })) as any;

  test('returns a valid memoized component', () => {
    const Widget = container(mockLoader, { name: 'TestWidget' });
    expect(Widget).toBeDefined();
    expect(typeof Widget).toBe('object');
  });
});
