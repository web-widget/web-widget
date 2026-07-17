import type { Page } from '@playwright/test';
import { expect, test } from '../src/integration-test';
import type { BrowserErrorProbe } from '../src/browser-errors';
import { mutateRouterSource, withRouterFixture } from '../src/router-fixture';

const production = process.env.TEST_MODE === 'production';
const adapters = [
  'react',
  'vue3',
  'vue2',
  'svelte',
  'solid',
  'preact',
] as const;

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
    const host = page.locator(
      `web-widget[name$="${adapter === 'vue3' ? 'Vue3Counter' : adapter === 'vue2' ? 'Vue2Counter' : `${adapter[0].toUpperCase()}${adapter.slice(1)}Counter`}"]`
    );
    const button = host.locator('button');
    await expect(host).not.toHaveAttribute('recovering');
    await expect(button).toHaveCSS('--widget-module-owner', 'module');
    await expect(button).toHaveCSS('--widget-module-version', '1');
    await expect(button).toHaveCSS('--route-button-leak', '');
    await expect(button).toHaveCSS('padding', '8px 20px');
  }
  await expect(page.locator('web-widget[name="Vue3Counter"] button')).toHaveCSS(
    '--vue-scoped-owner',
    'vue3'
  );
  await expect(page.locator('web-widget[name="Vue2Counter"] button')).toHaveCSS(
    '--vue-scoped-owner',
    'vue2'
  );
}

async function openStableDevPage(
  page: Page,
  url: string,
  browserErrors?: BrowserErrorProbe
) {
  // A cold multi-framework playground can make Vite's dependency optimizer
  // reload once after discovering client-only adapter dependencies.
  await page.goto(url);
  await expectShadowStyles(page);
  if (browserErrors) {
    browserErrors.messages.length = 0;
    browserErrors.resourceErrors.length = 0;
  }
  await page.reload();
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

        expect(templates).toHaveLength(6);
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
        expect(shadowTemplateFor(html, 'vue2')).toContain(
          '--vue-scoped-owner: vue2'
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

  test('keeps CSS Module hashes and Vue scoped CSS current through HMR and fresh SSR', async ({
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

        await mutateRouterSource(
          fixture,
          'routes/(css)/counter.module.css',
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
            `web-widget[name*="${adapter === 'vue3' ? 'Vue3' : adapter === 'vue2' ? 'Vue2' : adapter[0].toUpperCase() + adapter.slice(1)}"]`
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

        let html = await (
          await fetch(`${fixture.baseURL}/shadow-dom-ssr`)
        ).text();
        for (const template of shadowTemplates(html)) {
          expect(template).toContain('--widget-module-version: 2');
        }

        const beforeVueUpdate = documents;
        await mutateRouterSource(
          fixture,
          'routes/(vue3)/frameworks/vue3/Counter@widget.vue',
          (source) =>
            source.replace('--vue-scoped-version: 1', '--vue-scoped-version: 2')
        );
        await expect(
          page.locator('web-widget[name="Vue3Counter"] button')
        ).toHaveCSS('--vue-scoped-version', '2');
        await expect.poll(() => documents).toBe(beforeVueUpdate);

        html = await (await fetch(`${fixture.baseURL}/shadow-dom-ssr`)).text();
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

        expect(templates).toHaveLength(6);
        expect(documentCss).toContain('--route-css-owner:route');
        for (const template of templates) {
          expect(template).toContain('--widget-module-owner:module');
          expect(template).not.toContain('--route-button-leak:route');
        }
        expect(shadowTemplateFor(html, 'vue3')).toContain(
          '--vue-scoped-owner:vue3'
        );
        expect(shadowTemplateFor(html, 'vue2')).toContain(
          '--vue-scoped-owner:vue2'
        );

        await page.goto(`${fixture.baseURL}/shadow-dom-ssr`);
        await expectShadowStyles(page);
        expectNoUnexpectedBrowserErrors(browserErrors);
      },
      testInfo
    );
  });
});
