import { expect, test } from '../src/integration-test';

for (const adapter of ['react', 'vue'] as const) {
  test(`${adapter} preserves SSR identity and supports interaction and lifecycle`, async ({
    page,
    browserErrors,
  }) => {
    await page.goto('/');
    await page.evaluate(() => window.__hydrationReady);

    const host = page.locator(`web-widget[data-hydration-widget="${adapter}"]`);
    const root = host.locator('[data-mount-root]');
    const probe = host.locator('[data-hydration-probe]');
    await expect
      .poll(() =>
        host.evaluate(
          (element) => (element as HTMLElementTagNameMap['web-widget']).status
        )
      )
      .toBe('mounted');
    await expect(host).not.toHaveAttribute('recovering');
    await expect(root).toHaveCount(1);
    await expect(probe).toHaveCSS('--hydration-token', 'ready');
    await expect(probe).toHaveCSS(
      'color',
      adapter === 'react' ? 'rgb(21, 61, 101)' : 'rgb(101, 61, 21)'
    );

    expect(
      await page.evaluate((name) => {
        const currentHost = document.querySelector(
          `[data-hydration-widget="${name}"]`
        )!;
        return {
          host: currentHost === window.__ssrNodes[`${name}:host`],
          root:
            currentHost.querySelector('[data-mount-root]') ===
            window.__ssrNodes[`${name}:root`],
          probe:
            currentHost.querySelector('[data-hydration-probe]') ===
            window.__ssrNodes[`${name}:probe`],
        };
      }, adapter)
    ).toEqual({ host: true, root: true, probe: true });

    await host.locator('[data-hydration-increment]').click();
    await expect(probe).toHaveText(adapter === 'react' ? 'React 1' : 'Vue 1');
    await page.evaluate(async (name) => {
      const widget = document.querySelector<
        HTMLElementTagNameMap['web-widget']
      >(`web-widget[data-hydration-widget="${name}"]`)!;
      await widget.update({});
    }, adapter);
    await expect(probe).toHaveText(adapter === 'react' ? 'React 1' : 'Vue 1');

    expect(await page.evaluate(() => window.__hydrationErrors.length)).toBe(0);
    expect(browserErrors.messages).toEqual([]);
    expect(browserErrors.resourceErrors).toEqual([]);

    await page.evaluate(async (name) => {
      const widget = document.querySelector<
        HTMLElementTagNameMap['web-widget']
      >(`web-widget[data-hydration-widget="${name}"]`)!;
      await widget.unmount();
      await widget.unload();
    }, adapter);
    await expect
      .poll(() =>
        host.evaluate(
          (element) => (element as HTMLElementTagNameMap['web-widget']).status
        )
      )
      .toBe('initial');
    await expect(root).toHaveCount(0);
  });
}
