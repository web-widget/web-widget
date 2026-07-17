import { expect, test } from '../src/integration-test';
import {
  expectComputedStyle,
  expectWidgetState,
  navigationIdentity,
  widgetState,
} from '../src/assertions';
import { integrationCases } from '../src/cases';

test('serves and boots the standalone integration fixture', async ({
  page,
  request,
  browserErrors,
}) => {
  const response = await request.get('/');

  expect(response.ok()).toBe(true);
  await expect(response.text()).resolves.toContain(
    'data-server-rendered="true"'
  );

  await page.goto('/');
  const fixture = page.getByTestId('fixture');

  await expect(fixture).toHaveAttribute('data-server-rendered', 'true');
  await expect(fixture).toHaveAttribute('data-client-ready', 'true');
  await expect(page.getByTestId('status')).toHaveText('Client ready');
  await expectComputedStyle(page, integrationCases[0]);
  const firstNavigation = await navigationIdentity(page);
  expect(firstNavigation).not.toBe('');

  const widget = page.getByTestId('widget');
  expect(await widgetState(widget)).toBe(0);
  await page.getByTestId('increment').click();
  await expectWidgetState(widget, 1);

  await page.reload();
  await expect(page.getByTestId('fixture')).toHaveAttribute(
    'data-client-ready',
    'true'
  );
  expect(await navigationIdentity(page)).not.toBe(firstNavigation);
  expect(browserErrors.messages).toEqual([]);
  expect(browserErrors.resourceErrors).toEqual([]);
});

test('records failed resources with request details', async ({
  page,
  browserErrors,
}) => {
  await page.goto('/');
  await page.route('**/missing-integration-resource.css', (route) =>
    route.abort('failed')
  );
  await page.evaluate(() =>
    fetch('/missing-integration-resource.css').catch(() => undefined)
  );

  await expect
    .poll(() => browserErrors.resourceErrors)
    .toContainEqual(
      expect.stringContaining('/missing-integration-resource.css')
    );
});
