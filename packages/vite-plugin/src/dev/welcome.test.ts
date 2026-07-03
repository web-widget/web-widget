import { describe, expect, test } from '@jest/globals';
import { formatDevWelcome } from './welcome';

describe('dev welcome banner', () => {
  test('formatDevWelcome renders logo only', () => {
    const banner = formatDevWelcome();

    expect(banner).toContain(
      ' __      __   _     __      ___    _          _   '
    );
    expect(banner).toContain('|___/');
    expect(banner).not.toContain('routes');
    expect(banner).not.toContain('web-router');
    expect(banner).not.toContain('localhost');
  });
});
