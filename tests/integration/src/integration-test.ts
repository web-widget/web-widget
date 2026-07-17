import { expect, test as base } from '@playwright/test';
import {
  installBrowserErrorProbe,
  type BrowserErrorProbe,
} from './browser-errors';

export const test = base.extend<{ browserErrors: BrowserErrorProbe }>({
  browserErrors: async ({ page }, use, testInfo) => {
    const probe = installBrowserErrorProbe(page);
    await use(probe);
    await testInfo.attach('browser-console.log', {
      body: Buffer.from(
        [...probe.messages, ...probe.resourceErrors].join('\n')
      ),
      contentType: 'text/plain',
    });
  },
});

export { expect };
