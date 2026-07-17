import { expect, test } from '../src/integration-test';
import { expectComputedStyle } from '../src/assertions';
import { cssCases } from '../src/cases';

test('delivers SSR probes and applies C01-C08 styles', async ({
  page,
  request,
  browserErrors,
}) => {
  const response = await request.get('/');
  const html = await response.text();

  expect(response.ok()).toBe(true);
  for (const entry of cssCases) {
    expect(html, `${entry.id} must be present in SSR HTML`).toContain(
      `data-case="${entry.id}"`
    );
  }
  expect(html).toContain('class="ww_route_probe" data-case="C02"');
  expect(html).toContain('class="ww_widget_probe" data-case="C06"');
  const vueScope = html.match(/data-case="C03"[^>]+(data-v-[\w-]+)/)?.[1];
  expect(vueScope).toBeTruthy();
  expect(html).toMatch(new RegExp(`data-case="C08"[^>]+${vueScope}`));

  await page.goto('/');
  for (const entry of cssCases) await expectComputedStyle(page, entry);
  const selectors = await page.evaluate(() =>
    [...document.styleSheets]
      .flatMap((sheet) => [...sheet.cssRules])
      .map((rule) => rule.cssText)
      .join('\n')
  );
  expect(selectors).toContain('.ww_route_probe');
  expect(selectors).toContain('.ww_widget_probe');
  expect(selectors).toMatch(/\[data-case=["']?C03["']?\]\[data-v-vue-matrix\]/);
  expect(selectors).toMatch(/\[data-case=["']?C08["']?\]\[data-v-vue-matrix\]/);
  expect(browserErrors.messages).toEqual([]);
  expect(browserErrors.resourceErrors).toEqual([]);
});

test('serves CSS sources and production stylesheet assets without duplicates', async ({
  page,
  request,
}) => {
  await page.goto('/');
  const stylesheets = await page
    .locator('link[rel="stylesheet"]')
    .evaluateAll((links) =>
      links.map((link) => (link as HTMLLinkElement).href)
    );
  expect(new Set(stylesheets).size).toBe(stylesheets.length);

  if (process.env.TEST_MODE === 'production') {
    expect(stylesheets.length).toBeGreaterThan(0);
    for (const url of stylesheets) {
      const response = await request.get(url);
      expect(response.ok()).toBe(true);
      expect(response.headers()['content-type']).toContain('text/css');
    }
  } else {
    for (const source of [
      '/src/cases/route/route-plain.css',
      '/src/cases/route/route.module.css',
      '/src/cases/widget/widget-plain.css',
      '/src/cases/widget/widget.module.css',
    ]) {
      expect((await request.get(source)).ok()).toBe(true);
    }
  }
});
