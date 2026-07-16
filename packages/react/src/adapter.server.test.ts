import { createElement, Suspense } from 'react';

import { render } from './adapter.server';

// Mock dependencies to avoid ESM workspace package loading issues in Jest.
jest.mock('@web-widget/helpers', () => ({
  defineServerRender: (fn: any) => fn,
}));

jest.mock('@web-widget/helpers/state', () => ({
  useWidgetSyncState: () => ({}),
}));

jest.mock('@web-widget/web-widget', () => ({
  WebWidgetRenderer: class {
    localName = 'web-widget';
    attributes: Record<string, string> = {};
    async renderInnerHTMLToString() {
      return '';
    }
  },
}));

jest.mock('./edge', () => {
  const ReactDOMServer = jest.requireActual('react-dom/server');
  return {
    renderToReadableStream: ReactDOMServer.renderToReadableStream,
    renderToString: (node: React.ReactNode) =>
      ReactDOMServer.renderToString(node),
  };
});

describe('render (server)', () => {
  const SimpleComponent = () => createElement('div', null, 'Hello World');

  test('non-progressive render returns HTML string', async () => {
    const result = await render(SimpleComponent, {}, { progressive: false });
    expect(typeof result).toBe('string');
    expect(result).toContain('Hello World');
  });

  test('progressive render returns ReadableStream', async () => {
    const result = await render(SimpleComponent, {}, { progressive: true });
    expect(result).toBeInstanceOf(ReadableStream);

    const decoder = new TextDecoder();
    let html = '';
    // @ts-ignore
    for await (const chunk of result as ReadableStream) {
      html += decoder.decode(chunk, { stream: true });
    }
    expect(html).toContain('Hello World');
  });

  test('missing component throws TypeError', async () => {
    await expect(
      render(null as any, {}, { progressive: false })
    ).rejects.toThrow(TypeError);
  });

  test('shell error in non-progressive mode rejects (enables 500)', async () => {
    const ThrowingComponent = () => {
      throw new Error('render failed');
    };

    // Non-progressive mode: shell errors cause renderToString to reject,
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
});
