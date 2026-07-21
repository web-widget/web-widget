import { createElement, Suspense, useId } from 'react';
import { testAdapterConformance } from '@web-widget/schema/testing';
import { vi } from 'vitest';

import * as adapter from './adapter.server';
import { ReactServerRenderModeContext } from './server/context';
const { render } = adapter;

// Mock dependencies to avoid ESM workspace package loading issues in Jest.
vi.mock('@web-widget/helpers', () => ({
  defineServerRender: (fn: any) => fn,
}));

vi.mock('@web-widget/helpers/state', () => ({
  useWidgetSyncState: () => ({}),
}));

vi.mock('@web-widget/web-widget', () => ({
  WebWidgetRenderer: class {
    localName = 'web-widget';
    attributes: Record<string, string> = { id: 'slot-conformance' };
    constructor(_loader: unknown, options: { slot?: string }) {
      if (options.slot) this.attributes.slot = options.slot;
    }
    async renderInnerHTMLToString({ children = '' } = {}) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      return `<template shadowrootmode="open"><slot name="label">SHADOW_SLOT_MARKER</slot></template>${children}`;
    }
  },
}));

vi.mock('./server/react-dom', async () => {
  const ReactDOMServer =
    await vi.importActual<typeof import('react-dom/server')>(
      'react-dom/server'
    );
  return {
    renderToReadableStream: ReactDOMServer.renderToReadableStream,
    prerenderToString: async (
      node: React.ReactNode,
      options: Parameters<typeof ReactDOMServer.renderToString>[1]
    ) => {
      const stream = await ReactDOMServer.renderToReadableStream(node, options);
      await stream.allReady;
      return new Response(stream).text();
    },
  };
});

const ConformanceComponent = ({ message }: { message: string }) =>
  createElement('p', null, message);
const SlottedWidget = adapter.widget(async () => ({}), {
  root: 'shadow',
});
const SlotConformanceComponent = () =>
  createElement(
    SlottedWidget,
    { slot: 'adapter-actions' },
    createElement('span', { slot: 'label' }, 'LIGHT_SLOT_MARKER')
  );

testAdapterConformance({
  runner: { describe, test, expect },
  adapter: {
    name: 'react-server',
    server: {
      module: adapter,
      component: ConformanceComponent as any,
      data: { message: 'Hello' },
      progressive: 'stream',
      slots: {
        async render() {
          return adapter.render(
            SlotConformanceComponent,
            {},
            {
              progressive: false,
            }
          ) as Promise<string>;
        },
        hostSlot: 'adapter-actions',
        shadowMarker: 'SHADOW_SLOT_MARKER',
        lightMarker: 'LIGHT_SLOT_MARKER',
      },
      assertRendered(_result, { text }) {
        expect(text).toContain('Hello');
      },
    },
  },
});

describe('render (server)', () => {
  test('uses the widget id as the React identifier prefix', async () => {
    const Component = () => {
      const id = useId();
      return createElement('div', { id });
    };

    const result = await render(
      Component,
      {},
      {
        id: 'w7',
        progressive: false,
      }
    );

    expect(result).toContain('id="_w7R_0_"');
  });

  test('shell error in non-progressive mode rejects (enables 500)', async () => {
    const ThrowingComponent = () => {
      throw new Error('render failed');
    };

    // Non-progressive mode: shell errors cause prerenderToString to reject,
    // which propagates to the framework's error handler (e.g. _500 route).
    await expect(
      render(ThrowingComponent, {}, { progressive: false })
    ).rejects.toThrow('render failed');
  });

  test('shell error in progressive mode rejects (enables 500)', async () => {
    const ThrowingComponent = () => {
      throw new Error('shell render failed');
    };

    // Progressive mode: per React docs, shell errors cause
    // renderToReadableStream to reject, enabling the framework to
    // return a 500 fallback response.
    await expect(
      render(ThrowingComponent, {}, { progressive: true })
    ).rejects.toThrow('shell render failed');
  });

  test('non-shell error in progressive mode does not reject', async () => {
    const LazyContent = () => {
      throw new Error('content error');
    };
    const Component = () =>
      createElement(
        'div',
        null,
        createElement(
          Suspense,
          { fallback: 'Loading' },
          createElement(LazyContent)
        )
      );

    // Errors inside <Suspense> are recoverable — React emits the fallback
    // and retries on the client. The render should resolve successfully.
    const result = await render(Component, {}, { progressive: true });
    expect(result).toBeInstanceOf(ReadableStream);

    const decoder = new TextDecoder();
    let html = '';
    // @ts-ignore
    for await (const chunk of result as ReadableStream) {
      html += decoder.decode(chunk, { stream: true });
    }
    expect(html).toContain('Loading');
  });

  test('async component is supported', async () => {
    const AsyncComponent = async () =>
      createElement('div', null, 'Async Content');

    const result = await render(AsyncComponent, {}, { progressive: false });
    expect(result).toContain('Async Content');
  });

  test('non-progressive Suspense SSR waits without emitting replacement scripts', async () => {
    const AsyncComponent = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      return createElement('div', null, 'Async Suspense Content');
    };
    const Component = () =>
      createElement(
        Suspense,
        { fallback: createElement('span', null, 'Loading') },
        createElement(AsyncComponent)
      );

    const result = await render(Component, {}, { progressive: false });

    expect(result).toContain('Async Suspense Content');
    expect(result).not.toContain('$RC(');
    expect(result).not.toContain('Loading');
  });

  test('provides progressive mode to nested Widget rendering', async () => {
    const result = await render(
      () =>
        createElement(ReactServerRenderModeContext.Consumer, {
          children: (mode) => String(mode),
        }),
      {},
      { progressive: true }
    );
    let html = '';
    for await (const chunk of result as ReadableStream<Uint8Array>) {
      html += new TextDecoder().decode(chunk);
    }

    expect(html).toContain('progressive');
  });
});
