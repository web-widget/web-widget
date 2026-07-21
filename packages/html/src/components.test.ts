import { html, unsafeHTML } from './html';
import { widget, resolveFallback } from './components';
import { asHtmlWidget } from './adapter';

describe('resolveFallback', () => {
  test('HTML form — same fallback for pending and error', () => {
    const fb = html`<div>loading</div>`;
    const { pendingFallback, errorFallback } = resolveFallback(fb);
    expect(pendingFallback).toBe(fb);
    expect(errorFallback).toBe(fb);
  });

  test('object form with pending only — error defaults to pending', () => {
    const pending = html`<div>loading</div>`;
    const { pendingFallback, errorFallback } = resolveFallback({ pending });
    expect(pendingFallback).toBe(pending);
    expect(errorFallback).toBe(pending);
  });

  test('object form with both pending and error', () => {
    const pending = html`<div>loading</div>`;
    const error = html`<div>error</div>`;
    const { pendingFallback, errorFallback } = resolveFallback({
      pending,
      error,
    });
    expect(pendingFallback).toBe(pending);
    expect(errorFallback).toBe(error);
  });

  test('object form with error function', () => {
    const pending = html`<div>loading</div>`;
    const errorFn = (e: any) => html`<div>${e.message}</div>`;
    const { errorFallback } = resolveFallback({ pending, error: errorFn });
    expect(errorFallback).toBe(errorFn);
  });
});

describe('asHtmlWidget', () => {
  test('returns the same component as a callable', () => {
    const fn = () => {};
    const result = asHtmlWidget(fn);
    expect(result).toBe(fn);
    expect(typeof result).toBe('function');
  });

  test('result is callable and returns a promise', async () => {
    const component = async () => unsafeHTML('<div/>');
    const widget = asHtmlWidget<{ x: number }>(component);
    const result = await widget({ x: 1 });
    expect(result.toString()).toBe('<div/>');
  });
});

describe('widget', () => {
  test('renders clientOnly pending fallback inside web-widget', async () => {
    const Widget = widget(async () => ({}) as any, {
      import: '/Counter@widget.js',
      name: 'Counter',
    });
    const result = await Widget({
      widget: {
        clientOnly: true,
        fallback: { pending: html`<div>pending</div>` },
      },
    });
    const output = result.toString();

    expect(output).toContain('<web-widget');
    expect(output).toContain(
      '<div aria-busy="true" slot="web-widget-pending" style="display:contents"><div>pending</div></div>'
    );
  });

  test('renders children as light DOM for a shadow Widget', async () => {
    const Widget = widget(
      async () => ({
        default: {},
        render: async () => '<section><slot name="title"></slot></section>',
      }),
      {
        import: '/Panel@widget.js',
        root: 'shadow',
      }
    );
    const result = await Widget({
      children: html`<h2 slot="title">Account summary</h2>`,
    });
    const output = result.toString();

    expect(output).toContain('<template shadowrootmode="open">');
    expect(output).toContain(
      '</template><h2 slot="title">Account summary</h2>'
    );
    expect(output).not.toContain('contextdata');
  });
});
