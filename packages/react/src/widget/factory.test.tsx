import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { vi } from 'vitest';
import { prerenderToString } from '../server/react-dom';
import { resolveFallback } from './fallback';
import { createWidgetAdapter } from './factory';

const rendererMock = vi.hoisted(() => ({
  opaqueInnerHTML: undefined as string | undefined,
}));
const widget = createWidgetAdapter();

// Mock the WebWidgetRenderer to avoid needing the full widget runtime.
vi.mock('@web-widget/web-widget', () => {
  return {
    WebWidgetRenderer: class {
      localName = 'web-widget';
      opaqueInnerHTML = rendererMock.opaqueInnerHTML;
      pendingBoundary = {
        ariaBusy: true,
        display: 'contents',
        localName: 'div',
        slot: 'web-widget-pending',
      } as const;
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

describe('widget', () => {
  const mockLoader = (() =>
    Promise.resolve({
      default: () => createElement('div', null, 'hello'),
    })) as any;

  beforeEach(() => {
    rendererMock.opaqueInnerHTML = undefined;
  });

  test('returns a valid memoized component', () => {
    const Widget = widget(mockLoader, { name: 'TestWidget' });
    expect(Widget).toBeDefined();
    expect(typeof Widget).toBe('object');
  });

  test('renders clientOnly fallback using the renderer pending boundary', () => {
    const Widget = widget(mockLoader);
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
      '<div aria-busy="true" slot="web-widget-pending" style="display:contents"><div>pending</div></div>'
    );
  });

  test('uses widget.id for the host element', () => {
    const Widget = widget(mockLoader);
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

  test('renders opaque client content without a Suspense boundary', () => {
    rendererMock.opaqueInnerHTML = '<!--web-widget:placeholder-->';
    const Widget = widget(mockLoader);
    const output = renderToString(createElement(Widget));

    expect(output).toContain('<!--web-widget:placeholder-->');
    expect(output).not.toContain('<!--$-->');
  });

  test('renders same-adapter serverOnly widgets without a host', async () => {
    const NativeWidget = createWidgetAdapter()(
      async () => ({
        default: ({ label }: { label: string }) =>
          createElement('span', null, label),
      }),
      { native: true } as any
    );

    const output = await prerenderToString(
      createElement(NativeWidget, {
        label: 'server only',
        widget: { serverOnly: true },
      }),
      {}
    );

    expect(output).toContain('<span>server only</span>');
    expect(output).not.toContain('<web-widget');
  });

  test('rejects conflicting render modes before native rendering', async () => {
    const NativeWidget = createWidgetAdapter()(
      async () => ({
        default: () => createElement('span', null, 'native'),
      }),
      { native: true } as any
    );

    await expect(
      prerenderToString(
        createElement(NativeWidget, {
          widget: { serverOnly: true, clientOnly: true } as any,
        }),
        {}
      )
    ).rejects.toThrow('serverOnly and clientOnly cannot both be true.');
  });

  test('keeps the host for shadow serverOnly widgets', async () => {
    const ShadowWidget = createWidgetAdapter()(
      async () => ({
        default: () => createElement('span', null, 'shadow'),
      }),
      { root: 'shadow', native: true } as any
    );

    const output = await prerenderToString(
      createElement(ShadowWidget, { widget: { serverOnly: true } }),
      {}
    );

    expect(output).toContain('<web-widget');
  });

  test('keeps the host for foreign serverOnly widgets', async () => {
    const ForeignWidget = createWidgetAdapter()(async () => ({
      default: {},
      render: () => null,
    }));

    const output = await prerenderToString(
      createElement(ForeignWidget, { widget: { serverOnly: true } }),
      {}
    );

    expect(output).toContain('<web-widget');
  });
});
