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
});
