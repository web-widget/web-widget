import type { Page } from '@playwright/test';
import { expect, test } from '../src/integration-test';
import type { BrowserErrorProbe } from '../src/browser-errors';
import { mutateRouterSource, withRouterFixture } from '../src/router-fixture';

const production = process.env.TEST_MODE === 'production';
const adapters = ['react', 'vue3'] as const;

function widgetName(adapter: (typeof adapters)[number]) {
  return adapter === 'vue3' ? 'VueCounter' : 'ReactCounter';
}

function waitForViteConnection(page: Page) {
  return page.waitForEvent('console', {
    predicate: (message) => message.text().includes('[vite] connected.'),
  });
}

function shadowTemplates(html: string) {
  return [
    ...html.matchAll(/<template shadowrootmode="open">([\s\S]*?)<\/template>/g),
  ].map((match) => match[1]);
}

function shadowTemplateFor(html: string, adapter: string) {
  return shadowTemplates(html).find((template) =>
    template.includes(`shadow-counter-${adapter}`)
  );
}

async function collectDocumentCss(html: string, baseURL: string) {
  const inline = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
    .map((match) => match[1])
    .join('\n');
  const links = [...html.matchAll(/href="([^"]+\.css)"/g)].map(
    (match) => match[1]
  );
  const linked = await Promise.all(
    links.map(async (href) => {
      const response = await fetch(new URL(href, baseURL));
      expect(response.ok).toBe(true);
      return response.text();
    })
  );
  return [inline, ...linked].join('\n');
}

async function expectShadowStyles(page: Page) {
  await expect(page.locator('[data-shadow-route-css-probe]')).toHaveCSS(
    '--route-css-owner',
    'route'
  );
  for (const adapter of adapters) {
    const host = page.locator(`web-widget[name="${widgetName(adapter)}"]`);
    const button = host.locator('button');
    await expect(host).not.toHaveAttribute('recovering');
    await expect(button).toHaveCSS('--widget-module-owner', 'module');
    await expect(button).toHaveCSS('--widget-module-version', '1');
    await expect(button).toHaveCSS('--route-button-leak', '');
    await expect(button).toHaveCSS('padding', '8px 20px');
  }
  await expect(page.locator('web-widget[name="VueCounter"] button')).toHaveCSS(
    '--vue-scoped-owner',
    'vue3'
  );
}

async function openStableDevPage(
  page: Page,
  url: string,
  browserErrors?: BrowserErrorProbe
) {
  const connected = waitForViteConnection(page);
  await page.goto(url);
  await connected;
  await page.waitForLoadState('networkidle');
  await expectShadowStyles(page);
  if (browserErrors) {
    browserErrors.messages.length = 0;
    browserErrors.resourceErrors.length = 0;
  }
  const reconnected = waitForViteConnection(page);
  await page.reload();
  await reconnected;
  await page.waitForLoadState('networkidle');
  await expectShadowStyles(page);
}

function expectNoUnexpectedBrowserErrors(browserErrors: BrowserErrorProbe) {
  expect(
    browserErrors.messages.filter(
      (message) => !message.includes('Lit is in dev mode')
    )
  ).toEqual([]);
  expect(
    browserErrors.resourceErrors.filter(
      (message) =>
        !(message.startsWith('HEAD ') && message.endsWith('net::ERR_ABORTED'))
    )
  ).toEqual([]);
}

test.describe('Vite Shadow SSR development pipeline', () => {
  test.skip(production, 'development-only coverage');
  test.describe.configure({ mode: 'serial' });

  test('keeps route CSS outside and aliased widget CSS inside every shadow root', async ({
    page,
    browserErrors,
  }, testInfo) => {
    await withRouterFixture(
      'dev',
      async (fixture) => {
        const responses: string[] = [];
        for (let request = 0; request < 2; request++) {
          responses.push(
            await (await fetch(`${fixture.baseURL}/shadow-dom-ssr`)).text()
          );
        }
        const html = responses[0];
        const templates = shadowTemplates(html);
        const documentCss = await collectDocumentCss(html, fixture.baseURL);

        expect(templates).toHaveLength(2);
        expect(documentCss).toContain('--route-css-owner: route');
        for (const response of responses) {
          expect(await collectDocumentCss(response, fixture.baseURL)).toContain(
            '--route-css-owner: route'
          );
        }
        for (const template of templates) {
          expect(template).toContain('--widget-module-owner: module');
          expect(template).not.toContain('--route-button-leak: route');
          expect(template).toMatch(/counter\.module\.css/);
        }
        expect(shadowTemplateFor(html, 'vue3')).toContain(
          '--vue-scoped-owner: vue3'
        );

        await openStableDevPage(
          page,
          `${fixture.baseURL}/shadow-dom-ssr`,
          browserErrors
        );
        expectNoUnexpectedBrowserErrors(browserErrors);
      },
      testInfo
    );
  });

  test('keeps CSS Module hashes current through HMR and fresh SSR', async ({
    page,
  }, testInfo) => {
    await withRouterFixture(
      'dev',
      async (fixture) => {
        let documents = 0;
        page.on('response', (response) => {
          if (response.request().resourceType() === 'document') documents++;
        });
        await openStableDevPage(page, `${fixture.baseURL}/shadow-dom-ssr`);
        const beforeCssUpdate = documents;
        const viteReconnected = waitForViteConnection(page);

        await mutateRouterSource(
          fixture,
          'styles/counter.module.css',
          (source) =>
            source
              .replace(
                '--widget-module-version: 1',
                '--widget-module-version: 2'
              )
              .replace('padding: 8px 20px', 'padding: 9px 20px')
        );
        for (const adapter of adapters) {
          const host = page.locator(
            `web-widget[name="${widgetName(adapter)}"]`
          );
          const button = host.locator('button');
          await expect(button).toHaveCSS('--widget-module-version', '2');
          await expect(button).toHaveCSS('padding', '9px 20px');
          expect(
            await host.evaluate((widget) => {
              const root = widget.shadowRoot!;
              const button = root.querySelector('button')!;
              const styles = Array.from(
                root.querySelectorAll<HTMLStyleElement>(
                  'style[data-web-widget-style]'
                )
              );
              return styles.some((style) =>
                style.textContent?.includes(`.${button.className}`)
              );
            })
          ).toBe(true);
        }
        await expect.poll(() => documents).toBe(beforeCssUpdate + 1);
        await viteReconnected;
        const html = await (
          await fetch(`${fixture.baseURL}/shadow-dom-ssr`)
        ).text();
        for (const template of shadowTemplates(html)) {
          expect(template).toContain('--widget-module-version: 2');
        }
      },
      testInfo
    );
  });

  test('keeps Vue scoped CSS current through HMR and fresh SSR', async ({
    page,
  }, testInfo) => {
    await withRouterFixture(
      'dev',
      async (fixture) => {
        let documents = 0;
        page.on('response', (response) => {
          if (response.request().resourceType() === 'document') documents++;
        });
        await openStableDevPage(page, `${fixture.baseURL}/shadow-dom-ssr`);

        const beforeVueUpdate = documents;
        await mutateRouterSource(
          fixture,
          'widgets/VueCounter@widget.vue',
          (source) =>
            source.replace('--vue-scoped-version: 1', '--vue-scoped-version: 2')
        );
        await expect(
          page.locator('web-widget[name="VueCounter"] button')
        ).toHaveCSS('--vue-scoped-version', '2', { timeout: 15_000 });
        await expect.poll(() => documents).toBe(beforeVueUpdate);

        const html = await (
          await fetch(`${fixture.baseURL}/shadow-dom-ssr`)
        ).text();
        expect(shadowTemplateFor(html, 'vue3')).toContain(
          '--vue-scoped-version: 2'
        );
      },
      testInfo
    );
  });
});

test.describe('Vite Shadow SSR production pipeline', () => {
  test.skip(!production, 'production-only coverage');

  test('builds route CSS separately and embeds module/scoped widget CSS', async ({
    page,
    browserErrors,
  }, testInfo) => {
    await withRouterFixture(
      'production',
      async (fixture) => {
        const html = await (
          await fetch(`${fixture.baseURL}/shadow-dom-ssr`)
        ).text();
        const templates = shadowTemplates(html);
        const documentCss = await collectDocumentCss(html, fixture.baseURL);

        expect(templates).toHaveLength(2);
        expect(documentCss).toContain('--route-css-owner:route');
        for (const template of templates) {
          expect(template).toContain('--widget-module-owner:module');
          expect(template).not.toContain('--route-button-leak:route');
        }
        expect(shadowTemplateFor(html, 'vue3')).toContain(
          '--vue-scoped-owner:vue3'
        );

        await page.goto(`${fixture.baseURL}/shadow-dom-ssr`);
        await expectShadowStyles(page);
        expectNoUnexpectedBrowserErrors(browserErrors);
      },
      testInfo
    );
  });
});
