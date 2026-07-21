import type { ServerRenderOptions } from '@web-widget/schema';
import { WebWidgetRenderer } from './server-renderer';

function count(value: string, pattern: string): number {
  return value.split(pattern).length - 1;
}

describe('ServerWebWidgetRenderer Shadow DOM SSR', () => {
  it('shares an id between server render options and client markup', async () => {
    let renderId: string | undefined;
    const renderer = new WebWidgetRenderer(
      async () => ({
        default: {},
        render: async (
          _component: unknown,
          _data: unknown,
          options: ServerRenderOptions
        ) => {
          renderId = options.id;
          return '<p>identified</p>';
        },
      }),
      { import: '/assets/identified.js' }
    );

    const html = await renderer.renderOuterHTMLToString();
    const id = html.match(/<web-widget[^>]*\sid="([^"]+)"/)?.[1];

    expect(id).to.be.a('string').and.not.equal('');
    expect(id).to.match(/^w[0-9a-z]+$/);
    expect(renderId).to.equal(id);
  });

  it('preserves a user-provided widget id', async () => {
    let renderId: string | undefined;
    const renderer = new WebWidgetRenderer(
      async () => ({
        default: {},
        render: async (
          _component: unknown,
          _data: unknown,
          options: ServerRenderOptions
        ) => {
          renderId = options.id;
          return '<p>identified</p>';
        },
      }),
      { id: 'account-summary', import: '/assets/identified.js' }
    );

    const html = await renderer.renderOuterHTMLToString();

    expect(html).to.match(/<web-widget[^>]*\sid="account-summary"/);
    expect(renderId).to.equal('account-summary');
  });

  it('serializes the native slot attribute on the widget host', async () => {
    const renderer = new WebWidgetRenderer(
      async () => ({
        default: {},
        render: async () => '<p>action</p>',
      }),
      {
        import: '/assets/action.js',
        renderStage: 'server',
        slot: 'actions',
      }
    );

    const html = await renderer.renderOuterHTMLToString();

    expect(html).to.match(/<web-widget[^>]*\sslot="actions"/);
  });

  it('serializes app HTML once inside a declarative shadow mount root', async () => {
    const renderer = new WebWidgetRenderer(
      async () => ({
        default: {},
        meta: {
          style: [
            { id: 'legacy', content: '.legacy{color:red}' },
            { id: 'component', content: '.component{color:green}' },
          ],
          link: [
            {
              id: 'theme',
              href: './theme.css',
              media: 'screen',
              rel: 'stylesheet',
            },
          ],
        },
        render: async () =>
          '<section class="component"><slot name="label"></slot></section>',
      }),
      {
        import: '/assets/counter.js',
        meta: {
          style: [{ id: 'option', content: '.option{color:blue}' }],
        },
        root: 'shadow',
      }
    );

    const html = await renderer.renderOuterHTMLToString({
      children: '<span slot="label">Label</span>',
    });

    expect(count(html, '<section class="component">')).to.equal(1);
    expect(html).to.contain('<template shadowrootmode="open">');
    expect(html).to.contain('<web-widget-root style="display:contents">');
    expect(html).to.match(
      /<style data-web-widget-style="legacy"[^>]*>\.legacy\{color:red\}<\/style>/
    );
    expect(html).to.match(
      /<style data-web-widget-style="component"[^>]*>\.component\{color:green\}<\/style>/
    );
    expect(html).to.match(
      /<style data-web-widget-style="option"[^>]*>\.option\{color:blue\}<\/style>/
    );
    expect(html).to.match(
      /<link data-web-widget-style="theme" href="\/assets\/theme\.css"[^>]*media="screen" rel="stylesheet" \/>/
    );
    expect(html).to.contain('</template><span slot="label">Label</span>');
    expect(html).not.to.contain('contextmeta');
    expect(html).not.to.contain('attachShadowRoots');
    expect(html).not.to.contain('slot="web-widget-pending"');
  });

  it('is parsed by the browser with native named slot assignment', async () => {
    const renderer = new WebWidgetRenderer(
      async () => ({
        default: {},
        meta: {
          style: [{ id: 'shell', content: ':host{display:block}' }],
        },
        render: async () => '<header><slot name="title"></slot></header>',
      }),
      {
        import: '/assets/panel.js',
        root: 'shadow',
        renderStage: 'server',
      }
    );
    const iframe = document.createElement('iframe');
    iframe.srcdoc = await renderer.renderOuterHTMLToString({
      children: '<h2 id="light-title" slot="title">Native slot</h2>',
    });
    document.body.appendChild(iframe);
    await new Promise<void>((resolve) =>
      iframe.addEventListener('load', () => resolve(), { once: true })
    );

    const host = iframe.contentDocument!.querySelector('web-widget')!;
    const root = host.shadowRoot!;
    const slot = root.querySelector<HTMLSlotElement>('slot[name="title"]')!;

    expect(root.host).to.equal(host);
    expect(root.querySelector('[data-web-widget-style="shell"]')).not.to.equal(
      null
    );
    expect(slot.assignedElements()[0]?.id).to.equal('light-title');
    expect(getComputedStyle(host).display).to.equal('block');
    iframe.remove();
  });

  it('preserves nested declarative Shadow DOM boundaries without scripts', async () => {
    const nested =
      '<web-widget id="inner"><template shadowrootmode="open">' +
      '<style>:host{display:block}</style><p id="nested-content">nested</p>' +
      '</template></web-widget>';
    const renderer = new WebWidgetRenderer(
      async () => ({
        default: {},
        render: async () => `<section>${nested}</section>`,
      }),
      { import: '/assets/outer.js', root: 'shadow' }
    );
    const iframe = document.createElement('iframe');
    iframe.srcdoc = await renderer.renderOuterHTMLToString();
    document.body.appendChild(iframe);
    await new Promise<void>((resolve) =>
      iframe.addEventListener('load', () => resolve(), { once: true })
    );

    const outer = iframe.contentDocument!.querySelector('web-widget')!;
    const inner = outer.shadowRoot!.querySelector('#inner')!;
    expect(
      inner.shadowRoot!.querySelector('#nested-content')!.textContent
    ).to.equal('nested');
    expect(iframe.contentDocument!.scripts).to.have.length(0);
    iframe.remove();
  });

  it('renders under a strict CSP using a shadow-local external stylesheet', async () => {
    const css = encodeURIComponent(':host{display:block}p{color:rgb(1 2 3)}');
    const renderer = new WebWidgetRenderer(
      async () => ({
        default: {},
        meta: {
          link: [
            {
              id: 'strict-csp-style',
              href: `data:text/css,${css}`,
              rel: 'stylesheet',
            },
          ],
        },
        render: async () => '<p id="strict-csp-content">strict CSP</p>',
      }),
      { import: '/assets/csp.js', root: 'shadow' }
    );
    const html = await renderer.renderOuterHTMLToString();
    const iframe = document.createElement('iframe');
    iframe.srcdoc =
      `<meta http-equiv="Content-Security-Policy" ` +
      `content="default-src 'none'; style-src data:">` +
      html;
    document.body.appendChild(iframe);
    await new Promise<void>((resolve) =>
      iframe.addEventListener('load', () => resolve(), { once: true })
    );

    const host = iframe.contentDocument!.querySelector('web-widget')!;
    const content = host.shadowRoot!.querySelector('#strict-csp-content')!;
    expect(content.textContent).to.equal('strict CSP');
    expect(getComputedStyle(content).color).to.equal('rgb(1, 2, 3)');
    expect(iframe.contentDocument!.scripts).to.have.length(0);
    iframe.remove();
  });

  it('keeps light rendering backward compatible', async () => {
    const renderer = new WebWidgetRenderer(
      async () => ({
        default: {},
        meta: { style: [{ content: '.unused{}' }] },
        render: async () => '<p>light</p>',
      }),
      { import: '/assets/light.js', root: 'light' }
    );

    const html = await renderer.renderOuterHTMLToString();

    expect(html).to.contain('><p>light</p></web-widget>');
    expect(html).not.to.contain('shadowrootmode');
    expect(html).not.to.contain('.unused{}');
  });

  it('rejects render-time children for a light root', async () => {
    const renderer = new WebWidgetRenderer(
      async () => ({
        default: {},
        render: async () => '<p>light</p>',
      }),
      { import: '/assets/light.js' }
    );

    let error: unknown;
    try {
      await renderer.renderInnerHTMLToString({ children: '<p>invalid</p>' });
    } catch (cause) {
      error = cause;
    }

    expect(error)
      .to.be.an('error')
      .with.property(
        'message',
        `Rendering content in a slot requires "options.root = 'shadow'".`
      );
  });

  it('renders children without changing renderer identity or state', async () => {
    const renderer = new WebWidgetRenderer(
      async () => ({
        default: {},
        render: async () => '<slot name="content"></slot>',
      }),
      {
        import: '/assets/reusable.js',
        root: 'shadow',
        renderStage: 'server',
      }
    );
    const id = renderer.attributes.id;

    const first = await renderer.renderOuterHTMLToString({
      children: '<p slot="content">first</p>',
    });
    const second = await renderer.renderOuterHTMLToString({
      children: '<p slot="content">second</p>',
    });

    expect(renderer.attributes.id).to.equal(id);
    expect(first).to.contain(`id="${id}"`);
    expect(first).to.contain('<p slot="content">first</p>');
    expect(first).not.to.contain('second');
    expect(second).to.contain(`id="${id}"`);
    expect(second).to.contain('<p slot="content">second</p>');
    expect(second).not.to.contain('first');
  });

  it('omits shared light and auto defaults from SSR attributes', async () => {
    const renderer = new WebWidgetRenderer(
      async () => ({
        default: {},
        render: async () => '<p>defaults</p>',
      }),
      { import: '/assets/defaults.js' }
    );

    const html = await renderer.renderOuterHTMLToString();

    expect(html).not.to.contain('loading=');
    expect(html).not.to.contain('root=');
    expect(html).to.contain('><p>defaults</p></web-widget>');
    expect(html).not.to.contain('shadowrootmode');
  });

  it('keeps an explicit shadow root while omitting its auto loading default', async () => {
    const renderer = new WebWidgetRenderer(
      async () => ({
        default: {},
        render: async () => '<p>shadow defaults</p>',
      }),
      { import: '/assets/shadow-defaults.js', root: 'shadow', loading: 'auto' }
    );

    const html = await renderer.renderOuterHTMLToString();

    expect(html).to.match(/<web-widget[^>]*\sroot="shadow"/);
    expect(html).not.to.contain('loading=');
  });

  it('emits an empty non-recovering shadow boundary for client-only widgets', async () => {
    let loaded = false;
    const renderer = new WebWidgetRenderer(
      async () => {
        loaded = true;
        return {};
      },
      {
        import: '/assets/client.js',
        renderStage: 'client',
        root: 'shadow',
      }
    );

    const html = await renderer.renderOuterHTMLToString();

    expect(loaded).to.equal(false);
    expect(html).to.contain('<template shadowrootmode="open">');
    expect(html).to.contain('<web-widget-root style="display:contents">');
    expect(html).not.to.contain('slot="web-widget-pending"');
    expect(html).not.to.contain('recovering');
  });

  it('serializes the pending boundary and slot only when requested', async () => {
    const renderer = new WebWidgetRenderer(async () => ({}), {
      import: '/assets/client.js',
      renderStage: 'client',
      root: 'shadow',
    });

    const html = await renderer.renderOuterHTMLToString({
      pendingHTML: '<p>Loading</p>',
    });

    expect(html).to.contain('<slot name="web-widget-pending"></slot>');
    expect(html).to.contain(
      '<div aria-busy="true" slot="web-widget-pending" style="display:contents"><p>Loading</p></div>'
    );
  });

  it('serializes container styles for client-only shadow widgets', async () => {
    const renderer = new WebWidgetRenderer(async () => ({}), {
      import: '/assets/client.js',
      meta: {
        style: [{ id: 'client-shell', content: ':host{display:block}' }],
      },
      renderStage: 'client',
      root: 'shadow',
    });

    const html = await renderer.renderOuterHTMLToString();

    expect(html).to.contain(
      '<style data-web-widget-style="client-shell" >:host{display:block}</style>'
    );
  });
});
