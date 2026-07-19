import { expect, test } from '../src/integration-test';
import { mutateSource } from '../src/source-mutation';
import { withFixtureServer } from '../src/server-fixture';

test.describe.configure({ mode: 'serial' });

function expectOnlyAbortedResources(resourceErrors: string[]) {
  expect(
    resourceErrors.filter((message) => !message.endsWith('net::ERR_ABORTED'))
  ).toEqual([]);
}

async function blockInitialClient(page: import('@playwright/test').Page) {
  let released = false;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const block = async (route: import('@playwright/test').Route) => {
    if (!released) await gate;
    await route.continue();
  };
  await page.route('**/@vite/client', block);
  await page.route('**/src/entry.client.ts*', block);
  return () => {
    released = true;
    release();
  };
}

async function awaitHydration(page: import('@playwright/test').Page) {
  await expect
    .poll(() => page.evaluate(() => Boolean(window.__hydrationReady)))
    .toBe(true);
  await page.evaluate(() => window.__hydrationReady);
}

test('M01 reloads to a consistent CSS Module version when the HMR message is missed', async ({
  page,
  browserErrors,
}, testInfo) => {
  await withFixtureServer(async (server) => {
    let released = false;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const blockInitialModule = async (
      route: import('@playwright/test').Route
    ) => {
      if (!released) await gate;
      await route.continue();
    };
    await page.route('**/@vite/client', blockInitialModule);
    await page.route('**/src/entry.client.ts', blockInitialModule);

    let documents = 0;
    page.on('response', (response) => {
      if (response.request().resourceType() === 'document') documents++;
    });
    await page.goto(server.baseURL, { waitUntil: 'commit' });
    await expect(page.locator('[data-case="C02"]')).toHaveClass(
      'ww_route_probe'
    );
    await expect(page.locator('meta[name="module-version"]')).toHaveAttribute(
      'content',
      '0'
    );

    await mutateSource(server, 'src/cases/route/route.module.css', (source) =>
      source
        .replace('.probe {', '.probeNext {')
        .replace('34, 51, 68', '44, 61, 78')
    );
    released = true;
    release();

    await expect(
      page.locator('meta[name="module-version"]')
    ).not.toHaveAttribute('content', '0');
    await expect(page.locator('[data-case="C02"]')).toHaveClass(
      'ww_route_probeNext'
    );
    await awaitHydration(page);
    await expect(page.locator('[data-case="C02"]')).toHaveCSS(
      'color',
      'rgb(44, 61, 78)'
    );
    expect(documents).toBe(2);
    expect(await page.evaluate(() => window.__hydrationErrors.length)).toBe(0);
    expect(browserErrors.messages).toEqual([]);
    expectOnlyAbortedResources(browserErrors.resourceErrors);
  }, testInfo);
});

test('M02 reloads instead of hydrating an old React DOM with a new component', async ({
  page,
  browserErrors,
}, testInfo) => {
  await withFixtureServer(async (server) => {
    const release = await blockInitialClient(page);
    let documents = 0;
    page.on('response', (response) => {
      if (response.request().resourceType() === 'document') documents++;
    });
    await page.goto(server.baseURL, { waitUntil: 'commit' });
    await expect(
      page.locator(
        'web-widget[data-hydration-widget="react"] [data-hydration-probe="react"]'
      )
    ).toHaveText('React 0');
    await mutateSource(server, 'src/hydration/ReactWidget.tsx', (source) =>
      source.replace('React {count}', 'Updated React {count}')
    );
    release();

    await expect(
      page.locator(
        'web-widget[data-hydration-widget="react"] [data-hydration-probe="react"]'
      )
    ).toHaveText('Updated React 0');
    await awaitHydration(page);
    expect(documents).toBe(2);
    expect(await page.evaluate(() => window.__hydrationErrors.length)).toBe(0);
    expect(browserErrors.messages).toEqual([]);
    expectOnlyAbortedResources(browserErrors.resourceErrors);
  }, testInfo);
});

test('M03 rejects a cached client entry behind newer SSR', async ({
  page,
  request,
  browserErrors,
}, testInfo) => {
  await withFixtureServer(async (server) => {
    const cached = await request.get(`${server.baseURL}/src/entry.client.ts`);
    const cachedBody = await cached.body();
    await mutateSource(server, 'src/server-only-route.ts', (source) =>
      source.replace("ROUTE_VERSION = 'A'", "ROUTE_VERSION = 'B'")
    );

    let servedCachedEntry = false;
    await page.route('**/src/entry.client.ts*', async (route) => {
      if (!servedCachedEntry) {
        servedCachedEntry = true;
        await route.fulfill({
          body: cachedBody,
          contentType: 'application/javascript',
          status: 200,
        });
      } else {
        await route.continue();
      }
    });
    let documents = 0;
    page.on('response', (response) => {
      if (response.request().resourceType() === 'document') documents++;
    });
    await page.goto(server.baseURL);

    await expect(page.locator('meta[name="server-version"]')).toHaveAttribute(
      'content',
      'B'
    );
    await awaitHydration(page);
    expect(servedCachedEntry).toBe(true);
    expect(documents).toBe(2);
    expect(await page.evaluate(() => window.__hydrationErrors.length)).toBe(0);
    expect(browserErrors.messages).toEqual([]);
    expectOnlyAbortedResources(browserErrors.resourceErrors);
  }, testInfo);
});

test('M04 converges when an update lands between bootstrap and mount', async ({
  page,
  browserErrors,
}, testInfo) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('integration-race-complete')) return;
    window.__raceBeforeMount = new Promise<void>((resolve) => {
      window.__releaseRace = () => {
        sessionStorage.setItem('integration-race-complete', 'true');
        resolve();
      };
    });
  });
  await withFixtureServer(async (server) => {
    let documents = 0;
    page.on('response', (response) => {
      if (response.request().resourceType() === 'document') documents++;
    });
    await page.goto(server.baseURL, { waitUntil: 'domcontentloaded' });
    await expect
      .poll(() => page.evaluate(() => window.__raceWaiting ?? 0))
      .toBe(2);
    await mutateSource(server, 'src/hydration/ReactWidget.tsx', (source) =>
      source.replace('React {count}', 'Updated React {count}')
    );
    await page.evaluate(() => window.__releaseRace?.());

    const reactHost = page.locator('web-widget[data-hydration-widget="react"]');
    await expect(
      reactHost.locator('[data-hydration-probe="react"]')
    ).toHaveText('Updated React 0');
    await awaitHydration(page);
    await reactHost.locator('[data-hydration-increment="react"]').click();
    await expect(
      reactHost.locator('[data-hydration-probe="react"]')
    ).toHaveText('Updated React 1');
    expect(documents).toBe(2);
    await expect(
      page.locator('web-widget[data-hydration-widget="react"]')
    ).toHaveCount(1);
    expect(await page.evaluate(() => window.__hydrationErrors.length)).toBe(0);
    expect(browserErrors.messages).toEqual([]);
    expectOnlyAbortedResources(browserErrors.resourceErrors);
  }, testInfo);
});

test('M05 reloads an old SSR document before applying a new Vue SFC module', async ({
  page,
  browserErrors,
}, testInfo) => {
  await withFixtureServer(async (server) => {
    const release = await blockInitialClient(page);
    let documents = 0;
    page.on('response', (response) => {
      if (response.request().resourceType() === 'document') documents++;
    });
    await page.goto(server.baseURL, { waitUntil: 'commit' });
    await mutateSource(server, 'src/cases/vue/VueMatrix.vue', (source) =>
      source.replace('68, 85, 102', '78, 95, 112')
    );
    release();

    await expect(page.locator('[data-case="C04"]')).toHaveCSS(
      'color',
      'rgb(78, 95, 112)'
    );
    await awaitHydration(page);
    expect(documents).toBe(2);
    expect(await page.evaluate(() => window.__hydrationErrors.length)).toBe(0);
    expect(browserErrors.messages).toEqual([]);
    expectOnlyAbortedResources(browserErrors.resourceErrors);
  }, testInfo);
});
