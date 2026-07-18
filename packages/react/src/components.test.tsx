import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { container, resolveFallback } from './components';

// Mock the WebWidgetRenderer to avoid needing the full widget runtime.
jest.mock('@web-widget/web-widget', () => {
  return {
    WebWidgetRenderer: class {
      localName = 'web-widget';
      pendingLocalName = 'web-widget-pending';
      attributes: Record<string, string> = {};
      constructor(_loader: unknown, options: { id?: string; name?: string }) {
        if (options.id) {
          this.attributes.id = options.id;
        }
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
    const { pendingFallback, errorFallback } = resolveFallback(undefined);
    expect(pendingFallback).toBeUndefined();
    expect(errorFallback).toBeUndefined();
  });

  test('ReactNode fallback is used for both pending and error', () => {
    const spinner = createElement('div', null, 'Loading');
    const { pendingFallback, errorFallback } = resolveFallback(spinner);
    expect(pendingFallback).toBe(spinner);
    expect(errorFallback).toBe(spinner);
  });

  test('object with only pending uses pending for both', () => {
    const spinner = createElement('div', null, 'Loading');
    const { pendingFallback, errorFallback } = resolveFallback({
      pending: spinner,
    });
    expect(pendingFallback).toBe(spinner);
    expect(errorFallback).toBe(spinner);
  });

  test('object with only error uses undefined for pending', () => {
    const errorUI = createElement('div', null, 'Error');
    const { pendingFallback, errorFallback } = resolveFallback({
      error: errorUI,
    });
    expect(pendingFallback).toBeUndefined();
    expect(errorFallback).toBe(errorUI);
  });

  test('object with both pending and error uses them independently', () => {
    const spinner = createElement('div', null, 'Loading');
    const errorUI = createElement('div', null, 'Error');
    const { pendingFallback, errorFallback } = resolveFallback({
      pending: spinner,
      error: errorUI,
    });
    expect(pendingFallback).toBe(spinner);
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

  test('renders clientOnly pending fallback inside web-widget', () => {
    const Widget = container(mockLoader);
    const output = renderToString(
      createElement(Widget, {
        widget: {
          clientOnly: true,
          fallback: { pending: createElement('div', null, 'pending') },
        },
      })
    );

    expect(output).toContain('<web-widget');
    expect(output).toContain(
      '<web-widget-pending aria-busy="true" style="display:contents"><div>pending</div></web-widget-pending>'
    );
  });

  test('uses widget.id for the host element', () => {
    const Widget = container(mockLoader);
    const output = renderToString(
      createElement(Widget, {
        widget: {
          id: 'profile-widget',
          clientOnly: true,
          fallback: { pending: createElement('div', null, 'pending') },
        },
      })
    );

    expect(output).toContain('<web-widget id="profile-widget"');
  });
});
