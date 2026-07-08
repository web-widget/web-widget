import { describe, expect, it, jest } from '@jest/globals';
import { parseHeadTags } from './parse-head-tags';

describe('parseHeadTags', () => {
  it('returns empty arrays when no head tags are present', () => {
    const result = parseHeadTags(
      '<!doctype html><html><head></head><body></body></html>'
    );
    expect(result).toEqual({ script: [], style: [], link: [], meta: [] });
  });

  it('returns empty arrays when head tag is missing', () => {
    const result = parseHeadTags('<!doctype html><html><body></body></html>');
    expect(result).toEqual({ script: [], style: [], link: [], meta: [] });
  });

  it('parses external script with src', () => {
    const html =
      '<html><head><script type="module" src="/@vite/client"></script></head><body></body></html>';
    const result = parseHeadTags(html);
    expect(result.script).toEqual([{ type: 'module', src: '/@vite/client' }]);
  });

  it('parses inline script with content', () => {
    const html =
      '<html><head><script type="module">import { injectIntoGlobalHook } from "/@react-refresh"</script></head><body></body></html>';
    const result = parseHeadTags(html);
    expect(result.script).toEqual([
      {
        type: 'module',
        content: 'import { injectIntoGlobalHook } from "/@react-refresh"',
      },
    ]);
  });

  it('parses script without type attribute', () => {
    const html =
      '<html><head><script src="/app.js"></script></head><body></body></html>';
    const result = parseHeadTags(html);
    expect(result.script).toEqual([{ type: undefined, src: '/app.js' }]);
  });

  it('parses style tags', () => {
    const html =
      '<html><head><style>body { color: red; }</style></head><body></body></html>';
    const result = parseHeadTags(html);
    expect(result.style).toEqual([{ content: 'body { color: red; }' }]);
  });

  it('skips empty style tags', () => {
    const html = '<html><head><style></style></head><body></body></html>';
    const result = parseHeadTags(html);
    expect(result.style).toEqual([]);
  });

  it('parses link tags with multiple attributes', () => {
    const html =
      '<html><head><link rel="stylesheet" href="/style.css" crossorigin="anonymous"></head><body></body></html>';
    const result = parseHeadTags(html);
    expect(result.link).toEqual([
      { rel: 'stylesheet', href: '/style.css', crossorigin: 'anonymous' },
    ]);
  });

  it('parses self-closing link tags', () => {
    const html =
      '<html><head><link rel="icon" href="/favicon.ico" /></head><body></body></html>';
    const result = parseHeadTags(html);
    expect(result.link).toEqual([{ rel: 'icon', href: '/favicon.ico' }]);
  });

  it('parses meta tags', () => {
    const html =
      '<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head><body></body></html>';
    const result = parseHeadTags(html);
    expect(result.meta).toEqual([
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
    ]);
  });

  it('parses mixed head tags', () => {
    const html =
      '<html><head>' +
      '<meta charset="utf-8" />' +
      '<script type="module" src="/@vite/client"></script>' +
      '<link rel="stylesheet" href="/style.css" />' +
      '<style>body { margin: 0; }</style>' +
      '<script type="module">console.log("preamble")</script>' +
      '</head><body></body></html>';
    const result = parseHeadTags(html);
    expect(result.meta).toEqual([{ charset: 'utf-8' }]);
    expect(result.script).toEqual([
      { type: 'module', src: '/@vite/client' },
      { type: 'module', content: 'console.log("preamble")' },
    ]);
    expect(result.link).toEqual([{ rel: 'stylesheet', href: '/style.css' }]);
    expect(result.style).toEqual([{ content: 'body { margin: 0; }' }]);
  });

  it('ignores tags outside head', () => {
    const html =
      '<html><head></head><body><script src="/body.js"></script></body></html>';
    const result = parseHeadTags(html);
    expect(result.script).toEqual([]);
  });

  it('warns about unsupported tags', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const html =
      '<html><head><base href="/" /><title>Test</title></head><body></body></html>';
    parseHeadTags(html);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        '🚧 @web-widget/vite-plugin: Unsupported <head> tag <base>'
      )
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        '🚧 @web-widget/vite-plugin: Unsupported <head> tag <title>'
      )
    );
    warnSpy.mockRestore();
  });

  it('skips HTML comments', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const html =
      '<html><head><!-- comment --><script src="/app.js"></script></head><body></body></html>';
    const result = parseHeadTags(html);
    expect(result.script).toEqual([{ type: undefined, src: '/app.js' }]);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('handles self-closing script tags', () => {
    const html =
      '<html><head><script type="module" src="/@vite/client" /></head><body></body></html>';
    const result = parseHeadTags(html);
    expect(result.script).toEqual([{ type: 'module', src: '/@vite/client' }]);
  });

  it('handles script with multiline content', () => {
    const html =
      '<html><head><script type="module">\nimport { a } from "b";\na();\n</script></head><body></body></html>';
    const result = parseHeadTags(html);
    expect(result.script).toEqual([
      {
        type: 'module',
        content: 'import { a } from "b";\na();',
      },
    ]);
  });
});
