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

  it('serves linked client CSS assets from /assets', async () => {
    const html = await (await fetch(`${server!.origin}/`)).text();
    const stylesheets = [
      ...html.matchAll(/href=["'](\/assets\/[^"']+\.css)["']/g),
    ].map((match) => match[1]);

    expect(stylesheets.length).toBeGreaterThan(0);

    for (const href of stylesheets) {
      const cssResponse = await fetch(`${server!.origin}${href}`);
      expect(cssResponse.status).toBe(200);
      expect(cssResponse.headers.get('content-type')).toMatch(/css/i);
      expect((await cssResponse.text()).length).toBeGreaterThan(0);
    }
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

  it('uses the built server entry from dist/', () => {
    expect(
      fs.existsSync(path.join(playgroundRoot, 'dist/server/index.js'))
    ).toBe(true);
  });

  it('does not preload async route chunk css on /css-lazy-dynamic', async () => {
    const html = await (
      await fetch(`${server!.origin}/css-lazy-dynamic`)
    ).text();
    const stylesheets = [
      ...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/g),
    ].map((match) => match[0]);

    expect(stylesheets.length).toBeGreaterThan(0);

    const stylesheetContents = await Promise.all(
      stylesheets.map(async (tag) => {
        const hrefMatch = tag.match(/href=["']([^"']+)["']/);
        expect(hrefMatch).toBeTruthy();
        const href = hrefMatch![1];
        const response = await fetch(`${server!.origin}${href}`);
        expect(response.status).toBe(200);
        return response.text();
      })
    );

    const combinedCss = stylesheetContents.join('\n');
    expect(combinedCss).not.toContain('.css-lazy-dynamic-box');
  });
});
