import { describe, test, expect } from 'vitest';
import fetch from './fetch';
import { registerSnapshotTests } from './register-snapshot-tests';

describe('Should match snapshot', () => {
  registerSnapshotTests({
    test,
    expect,
    fetch,
  });
});
