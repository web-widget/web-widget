import { expect } from '@esm-bundle/chai';
import { attachDeclarativeShadowRoots } from './polyfill';

describe('Declarative Shadow DOM polyfill', () => {
  it('attaches unprocessed declarative shadow roots recursively', () => {
    const host = document.createElement('div');
    host.innerHTML = `
      <template shadowrootmode="open">
        <p id="content">Shadow content</p>
        <span id="nested-host">
          <template shadowrootmode="open">
            <b id="nested-content">Nested content</b>
          </template>
        </span>
      </template>
    `;
    const attachShadow = host.attachShadow;
    document.body.appendChild(host);

    attachDeclarativeShadowRoots(host);

    expect(host.shadowRoot?.querySelector('#content')?.textContent).to.equal(
      'Shadow content'
    );
    const nestedHost = host.shadowRoot?.querySelector('#nested-host');
    expect(
      nestedHost?.shadowRoot?.querySelector('#nested-content')?.textContent
    ).to.equal('Nested content');
    expect(host.attachShadow).to.equal(attachShadow);
    expect(host.querySelector('template[shadowrootmode]')).to.equal(null);

    attachDeclarativeShadowRoots();
    host.remove();
  });

  it('ignores templates with an invalid mode', () => {
    const host = document.createElement('div');
    host.innerHTML = '<template shadowrootmode="invalid">content</template>';

    attachDeclarativeShadowRoots(host);

    expect(host.shadowRoot).to.equal(null);
    expect(host.querySelector('template')).not.to.equal(null);
  });

  it('provides ElementInternals with the polyfilled shadow root', () => {
    const host = document.createElement('div');
    Object.defineProperty(host, 'attachInternals', {
      configurable: true,
      value: undefined,
      writable: true,
    });
    host.innerHTML = '<template shadowrootmode="open">content</template>';

    attachDeclarativeShadowRoots(host);

    expect(host.attachInternals().shadowRoot).to.equal(host.shadowRoot);
  });

  it('delegates to an existing attachInternals implementation', () => {
    const host = document.createElement('div');
    const states = new Set<string>();
    const nativeInternals = { states };
    let receiver: HTMLElement | undefined;
    Object.defineProperty(host, 'attachInternals', {
      configurable: true,
      value(this: HTMLElement) {
        receiver = this;
        return nativeInternals;
      },
      writable: true,
    });
    host.innerHTML = '<template shadowrootmode="open">content</template>';

    attachDeclarativeShadowRoots(host);
    const internals = host.attachInternals();

    expect(receiver).to.equal(host);
    expect(internals).to.equal(nativeInternals);
    expect(internals.states).to.equal(states);
    expect(internals.shadowRoot).to.equal(host.shadowRoot);
  });
});
