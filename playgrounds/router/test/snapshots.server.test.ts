import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
  normalizeProductionBody,
  normalizeProductionHeaders,
} from './normalize-production-snapshot';
import {
  startProductionServer,
  type ProductionServer,
} from './production-server';
import { registerSnapshotTests } from './register-snapshot-tests';

let server: ProductionServer | undefined;

describe('Should match snapshot (production server)', () => {
  beforeAll(async () => {
    server = await startProductionServer();
  }, 120_000);

  afterAll(() => {
    server?.stop();
  });

  registerSnapshotTests({
    test,
    expect,
    fetch: (pathname, options) =>
      fetch(`${server!.origin}${pathname}`, options),
    normalizeHeaders: normalizeProductionHeaders,
    normalizeBody: normalizeProductionBody,
  });

  test('non-progressive React Light DOM SSR omits pending replacements', async () => {
    const response = await fetch(`${server!.origin}/fetching-data`);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('Fetching data');
    expect(html).not.toContain('template id="B:');
    expect(html).not.toContain('div hidden id="S:');
    expect(html).not.toContain('$RC(');
  });
});
