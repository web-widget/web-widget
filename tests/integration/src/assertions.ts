import { expect, type Locator, type Page } from '@playwright/test';
import type { IntegrationCase } from './cases';

export async function expectComputedStyle(
  page: Page,
  entry: Pick<IntegrationCase, 'id' | 'selector' | 'expected'>
): Promise<void> {
  const probe = page.locator(entry.selector);
  await expect(probe, `${entry.id} probe must exist`).toHaveCount(1);
  for (const [property, expected] of Object.entries(entry.expected)) {
    await expect
      .poll(
        () =>
          probe.evaluate(
            (element, name) =>
              getComputedStyle(element).getPropertyValue(name).trim(),
            property
          ),
        { message: `${entry.id} computed ${property}` }
      )
      .toBe(expected);
  }
}

export async function navigationIdentity(page: Page): Promise<string> {
  return page.evaluate(() => {
    const id = document.documentElement.dataset.navigationId;
    if (!id) throw new Error('Navigation identity is missing');
    return id;
  });
}

export async function widgetState(host: Locator): Promise<number> {
  const state = await host.getAttribute('data-widget-state');
  if (state === null || !/^\d+$/.test(state))
    throw new Error('Widget state is missing or invalid');
  return Number(state);
}

export async function expectWidgetState(
  host: Locator,
  expected: number
): Promise<void> {
  await expect(host).toHaveAttribute('data-widget-state', String(expected));
}
