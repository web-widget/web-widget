import { expect } from '@esm-bundle/chai';
import { installWidgetStyles } from './styles';

const nextMutation = () => new Promise((resolve) => setTimeout(resolve));

describe('widget style registry', () => {
  it('preserves SSR CSS when the client transfers only its style id', () => {
    const host = document.createElement('div');
    const root = host.attachShadow({ mode: 'open' });
    const ssrStyle = document.createElement('style');
    ssrStyle.setAttribute('data-web-widget-style', '/src/counter.css');
    ssrStyle.textContent = '.count{color:red}';
    const mountRoot = document.createElement('main');
    root.append(ssrStyle, mountRoot);

    installWidgetStyles(root, [{ id: '/src/counter.css' }], mountRoot);

    expect(root.querySelector('style')).to.equal(ssrStyle);
    expect(ssrStyle.textContent).to.equal('.count{color:red}');
  });

  it('does not adopt application-owned style markers below the mount root', () => {
    const host = document.createElement('div');
    const root = host.attachShadow({ mode: 'open' });
    const mountRoot = root.appendChild(document.createElement('main'));
    mountRoot.innerHTML =
      '<style data-web-widget-style="shared">.application{color:red}</style>';

    installWidgetStyles(
      root,
      [{ id: 'shared', content: '.boundary{color:green}' }],
      mountRoot
    );

    expect(root.children[0].localName).to.equal('style');
    expect(root.children[0].textContent).to.equal('.boundary{color:green}');
    expect(mountRoot.querySelector('style')?.textContent).to.equal(
      '.application{color:red}'
    );
  });

  it('preserves SSR-only override order during hydration', () => {
    const host = document.createElement('div');
    const root = host.attachShadow({ mode: 'open' });
    const moduleStyle = document.createElement('style');
    moduleStyle.setAttribute('data-web-widget-style', 'module');
    moduleStyle.textContent = '.probe{color:red}';
    const overrideStyle = document.createElement('style');
    overrideStyle.setAttribute('data-web-widget-style', 'override');
    overrideStyle.textContent = '.probe{color:green}';
    const mountRoot = document.createElement('main');
    root.append(moduleStyle, overrideStyle, mountRoot);

    installWidgetStyles(
      root,
      [{ id: 'module', content: '.probe{color:blue}' }],
      mountRoot
    );

    expect(Array.from(root.children)).to.deep.equal([
      moduleStyle,
      overrideStyle,
      mountRoot,
    ]);
  });

  it('inserts client module styles before client-only SSR overrides', () => {
    const host = document.createElement('div');
    const root = host.attachShadow({ mode: 'open' });
    const overrideStyle = document.createElement('style');
    overrideStyle.setAttribute('data-web-widget-style', 'override');
    const mountRoot = document.createElement('main');
    root.append(overrideStyle, mountRoot);

    installWidgetStyles(
      root,
      [{ id: 'module', content: '.probe{color:blue}' }],
      mountRoot
    );

    expect(root.children[0].getAttribute('data-web-widget-style')).to.equal(
      'module'
    );
    expect(root.children[1]).to.equal(overrideStyle);
  });

  it('broadcasts a Vite CSS update to every registered ShadowRoot', async () => {
    const hosts = [
      document.createElement('div'),
      document.createElement('div'),
    ];
    const roots = hosts.map((host) => host.attachShadow({ mode: 'open' }));
    const mountRoots = roots.map((root) =>
      root.appendChild(document.createElement('main'))
    );
    const descriptor = {
      id: '/src/counter.css',
      content: '.count{color:red}',
    };

    roots.forEach((root, index) =>
      installWidgetStyles(root, [descriptor], mountRoots[index])
    );
    const identities = roots.map((root) => root);

    const viteStyle = document.createElement('style');
    viteStyle.setAttribute('data-vite-dev-id', descriptor.id);
    viteStyle.textContent = descriptor.content;
    document.head.appendChild(viteStyle);
    await nextMutation();

    expect(viteStyle.isConnected).to.equal(false);
    viteStyle.textContent = '.count{color:blue}';
    await nextMutation();

    roots.forEach((root, index) => {
      expect(root).to.equal(identities[index]);
      expect(
        root.querySelector('style[data-web-widget-style]')?.textContent
      ).to.equal('.count{color:blue}');
    });
  });
});
