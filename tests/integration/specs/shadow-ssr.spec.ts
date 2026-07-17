import { expect, test } from '../src/integration-test';

const coreAdapters = ['react', 'vue'] as const;
const extendedAdapters = ['preact', 'solid', 'svelte'] as const;

test('delivers declarative shadow boundaries in the raw document', async ({
  request,
}) => {
  const response = await request.get('/');
  const html = await response.text();

  expect(response.ok()).toBe(true);
  expect(html.match(/<template shadowrootmode="open">/g)).toHaveLength(5);
  expect(
    html.match(/<web-widget-root style="display:contents">/g)
  ).toHaveLength(5);
  expect(html.match(/slot="web-widget-pending"/g)).toHaveLength(5);
  expect(html.match(/slot="web-widget-state"/g)).toHaveLength(5);
  for (const adapter of [...coreAdapters, ...extendedAdapters]) {
    expect(html).toContain(`data-web-widget-style="shadow-${adapter}-module"`);
    expect(html).toContain(
      `data-web-widget-style="shadow-${adapter}-override"`
    );
  }
});

test('parses, recovers, styles, slots, and mounts shadow widgets', async ({
  page,
  browserErrors,
}) => {
  await page.goto('/');
  await page.evaluate(() => window.__hydrationReady);

  const adapters = [...coreAdapters, ...extendedAdapters];

  await expect(page.locator('[data-shadow-outside-probe]')).toHaveCSS(
    'color',
    'rgb(190, 10, 20)'
  );

  for (const adapter of adapters) {
    const host = page.locator(`web-widget[data-shadow-widget="${adapter}"]`);
    const probe = host.locator('[data-hydration-probe]');

    await expect
      .poll(() =>
        host.evaluate(
          (element) => (element as HTMLElementTagNameMap['web-widget']).status
        )
      )
      .toBe('mounted');
    await expect(host).not.toHaveAttribute('recovering');
    await expect(probe).toHaveCSS('color', 'rgb(30, 120, 70)');
    await expect(probe).toHaveCSS('--shadow-style-owner', 'override');

    const boundary = await host.evaluate((element, name) => {
      const widget = element as HTMLElementTagNameMap['web-widget'];
      const root = widget.shadowRoot!;
      const label = widget.querySelector<HTMLElement>(
        `[data-shadow-label="${name}"]`
      )!;
      const state = widget.querySelector<HTMLScriptElement>(
        `[data-shadow-state="${name}"]`
      )!;
      const container = root.querySelector('web-widget-root');
      const mountRoot = root.querySelector('[data-mount-root]');
      const probe = root.querySelector('[data-hydration-probe]');
      return {
        hasRoot: root instanceof ShadowRoot,
        identity: {
          container:
            container === window.__ssrNodes[`shadow:${name}:container`],
          host: widget === window.__ssrNodes[`shadow:${name}:host`],
          probe: probe === window.__ssrNodes[`shadow:${name}:probe`],
          root: mountRoot === window.__ssrNodes[`shadow:${name}:root`],
        },
        labelAssigned: label.assignedSlot?.getAttribute('name'),
        mountRoots: Array.from(root.children).filter(
          (child) => child.localName === 'web-widget-root'
        ).length,
        pending: widget.querySelectorAll('web-widget-pending').length,
        stateAssigned: state.assignedSlot !== null,
        styleOrder: Array.from(root.children)
          .filter((child) => child.hasAttribute('data-web-widget-style'))
          .map((style) => style.getAttribute('data-web-widget-style')),
        template: widget.querySelectorAll('template[shadowrootmode]').length,
      };
    }, adapter);

    expect(boundary).toMatchObject({
      hasRoot: true,
      labelAssigned: 'label',
      mountRoots: 1,
      pending: 0,
      stateAssigned: false,
      styleOrder: [`shadow-${adapter}-module`, `shadow-${adapter}-override`],
      template: 0,
    });
    if (adapter === 'react' || adapter === 'vue' || adapter === 'preact') {
      expect(boundary.identity).toEqual({
        container: true,
        host: true,
        probe: true,
        root: true,
      });
    }

    await host.locator('[data-hydration-increment]').click();
    const label = adapter[0].toUpperCase() + adapter.slice(1);
    await expect(probe).toHaveText(`${label} 1`);
    await host.evaluate(async (element) => {
      await (element as HTMLElementTagNameMap['web-widget']).update({});
    });
    await expect(probe).toHaveText(`${label} 1`);

    await host.evaluate(async (element) => {
      const widget = element as HTMLElementTagNameMap['web-widget'];
      await widget.unmount();
      await widget.unload();
    });
    await expect
      .poll(() =>
        host.evaluate(
          (element) => (element as HTMLElementTagNameMap['web-widget']).status
        )
      )
      .toBe('initial');
    await expect(host.locator('web-widget-root')).toHaveCount(1);
    await expect(host.locator('[data-mount-root]')).toHaveCount(0);
  }

  expect(await page.evaluate(() => window.__hydrationErrors.length)).toBe(0);
  expect(browserErrors.messages).toEqual([]);
  expect(browserErrors.resourceErrors).toEqual([]);
});
