import { expect, test } from '../src/integration-test';
import { navigationIdentity } from '../src/assertions';
import { mutateSource } from '../src/source-mutation';
import { withFixtureServer } from '../src/server-fixture';

test.describe.configure({ mode: 'serial' });

async function ready(page: import('@playwright/test').Page) {
  await page.evaluate(() => window.__hydrationReady);
  await expect(
    page.locator('web-widget[data-hydration-widget="react"]')
  ).not.toHaveAttribute('recovering');
}

async function preserveState(page: import('@playwright/test').Page) {
  await page.getByTestId('increment').click();
  await expect(page.getByTestId('widget')).toHaveAttribute(
    'data-widget-state',
    '1'
  );
}

for (const scenario of [
  {
    id: 'U01',
    file: 'src/cases/route/route-plain.css',
    selector: '[data-case="C01"]',
    from: '17, 34, 51',
    to: '18, 35, 52',
    color: 'rgb(18, 35, 52)',
  },
  {
    id: 'U02',
    file: 'src/cases/widget/widget-plain.css',
    selector: '[data-case="C05"]',
    from: '85, 102, 119',
    to: '86, 103, 120',
    color: 'rgb(86, 103, 120)',
  },
] as const) {
  test(`${scenario.id} updates plain CSS with HMR`, async ({
    page,
  }, testInfo) => {
    await withFixtureServer(async (server) => {
      let loads = 0;
      page.on('load', () => loads++);
      await page.goto(server.baseURL);
      await ready(page);
      await preserveState(page);
      const navigation = await navigationIdentity(page);

      await mutateSource(server, scenario.file, (source) =>
        source.replace(scenario.from, scenario.to)
      );
      await expect(page.locator(scenario.selector)).toHaveCSS(
        'color',
        scenario.color
      );
      expect(await navigationIdentity(page)).toBe(navigation);
      expect(loads).toBe(1);
      expect(
        await page.evaluate(
          () =>
            document.querySelector('[data-hydration-widget="react"]') ===
            window.__ssrNodes['react:host']
        )
      ).toBe(true);
      await expect(page.getByTestId('widget')).toHaveAttribute(
        'data-widget-state',
        '1'
      );
    }, testInfo);
  });
}

test('U03 reloads once for CSS Modules', async ({ page }, testInfo) => {
  await withFixtureServer(async (server) => {
    let loads = 0;
    page.on('load', () => loads++);
    await page.goto(server.baseURL);
    await ready(page);
    await preserveState(page);
    const navigation = await navigationIdentity(page);
    await mutateSource(server, 'src/cases/route/route.module.css', (source) =>
      source.replace('34, 51, 68', '35, 52, 69')
    );
    await expect(page.locator('[data-case="C02"]')).toHaveCSS(
      'color',
      'rgb(35, 52, 69)'
    );
    await expect.poll(() => navigationIdentity(page)).not.toBe(navigation);
    expect(loads).toBe(2);
    await ready(page);
    expect(await page.evaluate(() => window.__hydrationErrors.length)).toBe(0);
  }, testInfo);
});

for (const scenario of [
  {
    id: 'U04',
    token: '51, 68, 85',
    next: '52, 69, 86',
    selector: '[data-case="C03"]',
  },
  {
    id: 'U05',
    token: '68, 85, 102',
    next: '69, 86, 103',
    selector: '[data-case="C04"]',
  },
] as const) {
  test(`${scenario.id} updates Vue SFC styles with HMR`, async ({
    page,
  }, testInfo) => {
    await withFixtureServer(async (server) => {
      let loads = 0;
      page.on('load', () => loads++);
      await page.goto(server.baseURL);
      await ready(page);
      await preserveState(page);
      const navigation = await navigationIdentity(page);
      await mutateSource(server, 'src/cases/vue/VueMatrix.vue', (source) =>
        source.replace(scenario.token, scenario.next)
      );
      await expect(page.locator(scenario.selector)).toHaveCSS(
        'color',
        `rgb(${scenario.next})`
      );
      expect(await navigationIdentity(page)).toBe(navigation);
      expect(loads).toBe(1);
      await expect(page.getByTestId('widget')).toHaveAttribute(
        'data-widget-state',
        '1'
      );
      expect(await page.evaluate(() => window.__hydrationErrors.length)).toBe(
        0
      );
    }, testInfo);
  });
}

test('U06 updates a shared Widget component and preserves framework state', async ({
  page,
}, testInfo) => {
  await withFixtureServer(async (server) => {
    let loads = 0;
    page.on('load', () => loads++);
    await page.goto(server.baseURL);
    await ready(page);
    const host = page.locator('web-widget[data-hydration-widget="react"]');
    const probe = host.locator('[data-hydration-probe="react"]');
    await host.locator('[data-hydration-increment="react"]').click();
    await expect(probe).toHaveText('React 1');
    const navigation = await navigationIdentity(page);
    await mutateSource(server, 'src/hydration/ReactWidget.tsx', (source) =>
      source.replace('React {count}', 'Updated React {count}')
    );
    await expect(probe).toHaveText('Updated React 1');
    expect(await navigationIdentity(page)).toBe(navigation);
    expect(loads).toBe(1);
    expect(await page.evaluate(() => window.__hydrationErrors.length)).toBe(0);
  }, testInfo);
});

for (const scenario of [
  {
    id: 'U07',
    file: 'src/server-only-route.ts',
    mutate: (source: string) =>
      source.replace("ROUTE_VERSION = 'A'", "ROUTE_VERSION = 'B'"),
    verify: async (page: import('@playwright/test').Page) =>
      expect(page.locator('meta[name="server-version"]')).toHaveAttribute(
        'content',
        'B'
      ),
  },
  {
    id: 'U08',
    file: 'src/route-structure.json',
    mutate: (source: string) => source.replace('/route-a', '/route-b'),
    verify: async (page: import('@playwright/test').Page) =>
      expect(page.locator('[data-route-structure]')).toHaveAttribute(
        'data-route-structure',
        '/route-b'
      ),
  },
] as const) {
  test(`${scenario.id} reloads once for server-owned structure`, async ({
    page,
  }, testInfo) => {
    await withFixtureServer(async (server) => {
      let loads = 0;
      page.on('load', () => loads++);
      await page.goto(server.baseURL);
      await ready(page);
      const navigation = await navigationIdentity(page);
      await mutateSource(server, scenario.file, scenario.mutate);
      await scenario.verify(page);
      await ready(page);
      expect(await navigationIdentity(page)).not.toBe(navigation);
      expect(loads).toBe(2);
      expect(await page.evaluate(() => window.__hydrationErrors.length)).toBe(
        0
      );
    }, testInfo);
  });
}
