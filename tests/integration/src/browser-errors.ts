import type { Page } from '@playwright/test';

export interface BrowserErrorProbe {
  messages: string[];
  resourceErrors: string[];
}

export function installBrowserErrorProbe(page: Page): BrowserErrorProbe {
  const probe: BrowserErrorProbe = { messages: [], resourceErrors: [] };
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      probe.messages.push(`[console:${message.type()}] ${message.text()}`);
    }
  });
  page.on('pageerror', (error) =>
    probe.messages.push(`[pageerror] ${error.stack ?? error.message}`)
  );
  page.on('requestfailed', (request) => {
    probe.resourceErrors.push(
      `${request.method()} ${request.url()}: ${request.failure()?.errorText ?? 'failed'}`
    );
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      probe.resourceErrors.push(
        `${response.request().method()} ${response.url()}: ${response.status()}`
      );
    }
  });
  return probe;
}
