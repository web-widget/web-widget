import { describe, expect, it } from '@jest/globals';
import {
  shouldApplyRoutemapUpdate,
  shouldClientFullReload,
} from './routemap-update';

describe('shouldApplyRoutemapUpdate', () => {
  const json = '{"routes":[]}\n';

  it('always applies the first scan', () => {
    expect(shouldApplyRoutemapUpdate(json, undefined, false)).toBe(true);
  });

  it('skips when JSON is unchanged and filesystem is clean', () => {
    expect(shouldApplyRoutemapUpdate(json, json, false)).toBe(false);
  });

  it('applies when JSON is unchanged but filesystem changed', () => {
    expect(shouldApplyRoutemapUpdate(json, json, true)).toBe(true);
  });

  it('applies when JSON changed', () => {
    expect(shouldApplyRoutemapUpdate('{"routes":[1]}\n', json, false)).toBe(
      true
    );
  });
});

describe('shouldClientFullReload', () => {
  it('reloads on structural routemap changes', () => {
    expect(shouldClientFullReload(true, false)).toBe(true);
  });

  it('reloads when filesystem changed even if routemap JSON is identical', () => {
    expect(shouldClientFullReload(false, true)).toBe(true);
  });

  it('skips reload when neither structural nor filesystem changes', () => {
    expect(shouldClientFullReload(false, false)).toBe(false);
  });
});
