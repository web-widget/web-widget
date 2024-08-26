import { escapeJson } from './json';

describe('escapeJson', () => {
  test('with angle brackets should escape', () => {
    const evilObj = { evil: '<script></script>' };
    expect(escapeJson(JSON.stringify(evilObj))).toBe(
      '{"evil":"\\u003cscript\\u003e\\u003c/script\\u003e"}'
    );
  });

  test('with angle brackets should parse back', () => {
    const evilObj = { evil: '<script></script>' };
    expect(JSON.parse(escapeJson(JSON.stringify(evilObj)))).toEqual(evilObj);
  });

  test('with ampersands should escape', () => {
    const evilObj = { evil: '&' };
    expect(escapeJson(JSON.stringify(evilObj))).toBe('{"evil":"\\u0026"}');
  });

  test('with ampersands should parse back', () => {
    const evilObj = { evil: '&' };
    expect(JSON.parse(escapeJson(JSON.stringify(evilObj)))).toEqual(evilObj);
  });

  test('with "LINE SEPARATOR" and "PARAGRAPH SEPARATOR" should escape', () => {
    const evilObj = { evil: '\u2028\u2029' };
    expect(escapeJson(JSON.stringify(evilObj))).toBe(
      '{"evil":"\\u2028\\u2029"}'
    );
  });

  test('with "LINE SEPARATOR" and "PARAGRAPH SEPARATOR" should parse back', () => {
    const evilObj = { evil: '\u2028\u2029' };
    expect(JSON.parse(escapeJson(JSON.stringify(evilObj)))).toEqual(evilObj);
  });
});
