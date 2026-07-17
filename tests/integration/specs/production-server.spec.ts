import { expect, test } from '../src/integration-test';

test.skip(
  process.env.TEST_MODE !== 'production',
  'Production server protocol only applies to built assets'
);

test('serves built HTML with production security and cache headers', async ({
  request,
}) => {
  const response = await request.get('/');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('text/html');
  expect(response.headers()['cache-control']).toBe('no-cache');
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  expect(response.headers()['x-frame-options']).toBe('DENY');
  const requestId = response.headers()['x-request-id'];
  expect(requestId).toMatch(/^[0-9a-f-]{36}$/);
  const html = await response.text();
  expect(html).toContain('data-server-rendered="true"');
  expect(html).toContain('data-request-path="/"');
  expect(html).toContain(`data-request-id="${requestId}"`);
});

test('serves built scripts and styles with immutable asset caching', async ({
  page,
  request,
}) => {
  await page.goto('/');
  const urls = await page.evaluate(() =>
    [
      ...[...document.scripts].map((script) => script.src),
      ...[
        ...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
      ].map((link) => link.href),
    ].filter(Boolean)
  );
  expect(urls.length).toBeGreaterThan(0);

  for (const url of urls) {
    const response = await request.get(url);
    expect(response.status(), url).toBe(200);
    expect(response.headers()['cache-control'], url).toBe(
      'public, max-age=31536000, immutable'
    );
    expect(response.headers()['content-type'], url).toMatch(
      /text\/(css|javascript)/
    );
  }
});

test('renders known routes without masking missing documents or assets', async ({
  request,
}) => {
  const route = await request.get('/route-a');
  expect(route.status()).toBe(200);
  expect(route.headers()['content-type']).toContain('text/html');
  expect(await route.text()).toContain('data-request-path="/route-a"');

  const missingDocument = await request.get('/missing');
  expect(missingDocument.status()).toBe(404);
  expect(await missingDocument.text()).toContain('data-production-error="404"');

  const missingAsset = await request.get('/assets/missing.css');
  expect(missingAsset.status()).toBe(404);
  expect(await missingAsset.text()).toBe('Not Found');
});

test('executes production API, redirect, and error contracts', async ({
  request,
}) => {
  const api = await request.get('/api/status');
  expect(api.status()).toBe(200);
  expect(api.headers()['cache-control']).toBe('no-store');
  await expect(api.json()).resolves.toEqual({
    mode: 'production',
    renderer: 'server-entry',
  });

  const redirect = await request.get('/redirect', { maxRedirects: 0 });
  expect(redirect.status()).toBe(302);
  expect(redirect.headers().location).toBe('/route-a');

  const error = await request.get('/error');
  expect(error.status()).toBe(500);
  expect(await error.text()).toContain('data-production-error="500"');
});

test('hydrates SSR output from a dynamic production route', async ({
  page,
  browserErrors,
}) => {
  await page.goto('/route-a');
  const fixture = page.getByTestId('fixture');
  await expect(fixture).toHaveAttribute('data-request-path', '/route-a');
  await expect(fixture).toHaveAttribute('data-client-ready', 'true');
  await page.locator('[data-hydration-increment="react"]').click();
  await expect(page.locator('[data-hydration-probe="react"]')).toHaveText(
    'React 1'
  );
  expect(await page.evaluate(() => window.__hydrationErrors.length)).toBe(0);
  expect(browserErrors.messages).toEqual([]);
  expect(browserErrors.resourceErrors).toEqual([]);
});

test('rejects encoded traversal and unsupported methods', async ({
  request,
}) => {
  const traversal = await request.get('/%2e%2e/package.json');
  expect([403, 404]).toContain(traversal.status());

  const method = await request.post('/');
  expect(method.status()).toBe(405);
  expect(method.headers().allow).toBe('GET, HEAD');
});
