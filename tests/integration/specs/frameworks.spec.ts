import { expect, test } from '../src/integration-test';

test.skip(
  process.env.TEST_MODE !== 'production',
  'Extended framework smoke runs in production'
);

for (const framework of ['preact', 'solid', 'svelte'] as const) {
  test(`${framework} completes hydration/recovery and one interaction`, async ({
    page,
    browserErrors,
  }) => {
    await page.goto('/');
    await page.evaluate(() => window.__hydrationReady);
    const host = page.locator(
      `web-widget[data-hydration-widget="${framework}"]`
    );
    const probe = host.locator('[data-hydration-probe]');
    await expect
      .poll(() =>
        host.evaluate(
          (element) => (element as HTMLElementTagNameMap['web-widget']).status
        )
      )
      .toBe('mounted');
    await expect(host.locator('[data-mount-root]')).toHaveCount(1);
    await host.locator('[data-hydration-increment]').click();
    const label = framework[0].toUpperCase() + framework.slice(1);
    await expect(probe).toHaveText(`${label} 1`);
    expect(await page.evaluate(() => window.__hydrationErrors.length)).toBe(0);
    expect(browserErrors.messages).toEqual([]);
    expect(browserErrors.resourceErrors).toEqual([]);
  });
}
