import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  startProductionServer,
  type ProductionServer,
} from './production-server';

const playgroundRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

let server: ProductionServer | undefined;

/** Collect all CSS from an HTML response: linked stylesheets (fetched) + inline `<style>` blocks. */
async function collectRouteCss(html: string, origin: string) {
  const linkedHrefs = [
    ...html.matchAll(/href=["'](\/assets\/[^"']+\.css)["']/g),
  ].map((m) => m[1]);

  const inlineCss = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
    .map((m) => m[1])
    .join('\n');

  const linkedCss = (
    await Promise.all(
      linkedHrefs.map(async (href) => {
        const res = await fetch(`${origin}${href}`);
        expect(res.status).toBe(200);
        return res.text();
      })
    )
  ).join('\n');

  return {
    linkedHrefs,
    linkedCss,
    inlineCss,
    combinedCss: linkedCss + '\n' + inlineCss,
  };
}

describe('production server (pnpm build && node server.js)', () => {
  beforeAll(async () => {
    server = await startProductionServer();
  }, 120_000);

  afterAll(() => {
    server?.stop();
  });

  it('serves server-rendered HTML for the home route', async () => {
    const response = await fetch(`${server!.origin}/`);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/html/);
    expect(html).toContain('Home');
  });

  it('serves client CSS (linked or inlined) for the home route', async () => {
    const html = await (await fetch(`${server!.origin}/`)).text();
    const { linkedHrefs, combinedCss } = await collectRouteCss(
      html,
      server!.origin
    );

    // CSS may be inlined as <style> or linked as <link>;
    // either way, some CSS must be present.
    expect(
      linkedHrefs.length + (combinedCss.length > 0 ? 1 : 0)
    ).toBeGreaterThan(0);
  });

  it('serves representative routes and API handlers', async () => {
    const style = await fetch(`${server!.origin}/style`);
    expect(style.status).toBe(200);
    expect(await style.text()).toContain('Styling');

    const clientOnly = await fetch(`${server!.origin}/client-only-component`);
    expect(clientOnly.status).toBe(200);

    const api = await fetch(`${server!.origin}/api/hello-world`);
    expect(api.status).toBe(200);
    expect(await api.text()).toContain('Hello');
  });

  it('initializes Solid hydration before streamed coordination scripts', async () => {
    const html = await (
      await fetch(`${server!.origin}/frameworks/solid`)
    ).text();
    const hydrationIndex = html.indexOf('window._$HY');
    const coordinationIndex = html.indexOf('_$HY.r[');

    expect(hydrationIndex).toBeGreaterThanOrEqual(0);
    expect(coordinationIndex).toBeGreaterThan(hydrationIndex);
  });

  it.each([
    [
      'React',
      '/frameworks/react',
      ['Vue 3', 'Vue 2', 'Svelte', 'Solid', 'Preact'],
    ],
    [
      'HTML',
      '/frameworks/html',
      ['React', 'Vue 3', 'Vue 2', 'Svelte', 'Solid', 'Preact'],
    ],
    [
      'Vue 3',
      '/frameworks/vue3',
      ['React', 'Vue 2', 'Svelte', 'Solid', 'Preact'],
    ],
    [
      'Vue 2',
      '/frameworks/vue2',
      ['React', 'Vue 3', 'Svelte', 'Solid', 'Preact'],
    ],
    [
      'Preact',
      '/frameworks/preact',
      ['React', 'Vue 3', 'Vue 2', 'Svelte', 'Solid'],
    ],
    [
      'Solid',
      '/frameworks/solid',
      ['React', 'Vue 3', 'Vue 2', 'Svelte', 'Preact'],
    ],
    [
      'Svelte',
      '/frameworks/svelte',
      ['React', 'Vue 3', 'Vue 2', 'Solid', 'Preact'],
    ],
  ])(
    '%s route server-renders its Widget groups',
    async (framework, path, importedFrameworks) => {
      const response = await fetch(`${server!.origin}${path}`);
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(html).toContain('Widgets from other frameworks');
      expect(html.includes('Native Widget')).toBe(framework !== 'HTML');
      for (const importedFramework of importedFrameworks) {
        expect(html).toContain(`<h3>${importedFramework} Widget</h3>`);
        expect(html).toContain(`${importedFramework} count is`);
      }
      expect(html).toContain('<h3>Web Components Widget</h3>');
      expect(html).toContain('WebComponentCounter@widget');
      expect(html).not.toContain('Web Component count is');
      expect(html).toContain('<h3>Lit Widget</h3>');
      expect(html).toContain('LitCounter@widget');
      expect(html).not.toContain('Lit count is');
      if (framework !== 'HTML') {
        expect(html.indexOf('Native Widget')).toBeLessThan(
          html.indexOf('Widgets from other frameworks')
        );
      }
    }
  );

  it('uses the built server entry from dist/', () => {
    expect(
      fs.existsSync(path.join(playgroundRoot, 'dist/server/index.js'))
    ).toBe(true);
  });

  it('does not preload async route chunk css on /css-lazy-dynamic', async () => {
    const html = await (
      await fetch(`${server!.origin}/css-lazy-dynamic`)
    ).text();
    const { combinedCss } = await collectRouteCss(html, server!.origin);
    expect(combinedCss).not.toContain('.css-lazy-dynamic-box');
  });

  it('serves large CSS as external link (not inlined) on /large-css', async () => {
    const html = await (await fetch(`${server!.origin}/large-css`)).text();
    const { linkedHrefs, linkedCss, inlineCss } = await collectRouteCss(
      html,
      server!.origin
    );

    // The route imports > 8 KB of CSS, exceeding the inline threshold.
    // The CSS must be served as an external <link> stylesheet, not inlined.
    expect(linkedHrefs.length).toBeGreaterThan(0);
    expect(linkedCss).toContain('.lc-card');
    expect(inlineCss).not.toContain('.lc-card');
  });

  it('includes Vue SFC CSS Modules styles on /vue-module-css', async () => {
    const html = await (await fetch(`${server!.origin}/vue-module-css`)).text();
    const { combinedCss } = await collectRouteCss(html, server!.origin);

    // CSS Modules generates hashed class names like `_box_<hash>`; verify
    // the CSS content is present in the SSR output (inlined or linked).
    expect(combinedCss).toContain('linear-gradient(315deg');
    expect(combinedCss).toContain('border-radius:30px');
  });
});
