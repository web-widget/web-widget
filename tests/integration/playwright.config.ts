import { defineConfig, devices } from '@playwright/test';

const production = process.env.TEST_MODE === 'production';
const port = production ? 4174 : 5174;
const extendedBrowsers = process.env.BROWSER_MATRIX === 'extended';

export default defineConfig({
  testDir: './specs',
  testIgnore: production
    ? ['**/infrastructure.spec.ts', '**/mismatch.spec.ts', '**/updates.spec.ts']
    : ['**/production-server.spec.ts'],
  fullyParallel: false,
  retries: 0,
  reporter: 'line',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: production ? 'node scripts/production-server.mjs' : 'pnpm dev',
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
  projects: extendedBrowsers
    ? [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] } },
      ]
    : [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
