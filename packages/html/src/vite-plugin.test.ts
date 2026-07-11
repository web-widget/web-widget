import { describe, test, expect } from 'vitest';
import {
  findTaggedTemplates,
  compressStaticParts,
  compressWhitespace,
  htmlCompress,
} from './vite-plugin';

// ---------------------------------------------------------------------------
// compressWhitespace
// ---------------------------------------------------------------------------

describe('compressWhitespace', () => {
  test('collapses consecutive whitespace', () => {
    expect(compressWhitespace('a    b\n\tc')).toBe('a b c');
  });

  test('removes whitespace between tags', () => {
    expect(compressWhitespace('<div>\n  <span></span>\n</div>')).toBe(
      '<div><span></span></div>'
    );
  });

  test('preserves single spaces in text content', () => {
    expect(compressWhitespace('Hello World')).toBe('Hello World');
  });

  test('handles empty string', () => {
    expect(compressWhitespace('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// compressStaticParts
// ---------------------------------------------------------------------------

describe('compressStaticParts', () => {
  test('compresses multi-line template', () => {
    const parts = ['\n  <div>\n    <span>text</span>\n  </div>\n'];
    expect(compressStaticParts(parts)).toEqual([
      '<div><span>text</span></div>',
    ]);
  });

  test('compresses parts around interpolation', () => {
    const parts = ['\n  <ul>\n    ', '\n  </ul>\n'];
    expect(compressStaticParts(parts)).toEqual(['<ul> ', ' </ul>']);
  });

  test('trims first and last parts only', () => {
    const parts = ['  <div>  ', '  </div>  '];
    const result = compressStaticParts(parts);
    // First part: trimStart applied → '<div> '
    // Last part: trimEnd applied → ' </div>'
    expect(result).toEqual(['<div> ', ' </div>']);
  });

  test('preserves single space between text and interpolation', () => {
    const parts = ['Hello ', '!'];
    expect(compressStaticParts(parts)).toEqual(['Hello ', '!']);
  });

  test('preserves <pre> content', () => {
    const parts = ['<pre>\n  line1\n  line2\n</pre>'];
    expect(compressStaticParts(parts)).toEqual([
      '<pre>\n  line1\n  line2\n</pre>',
    ]);
  });

  test('preserves <textarea> content', () => {
    const parts = ['<textarea>\n  text\n</textarea>'];
    expect(compressStaticParts(parts)).toEqual([
      '<textarea>\n  text\n</textarea>',
    ]);
  });

  test('preserves <script> content', () => {
    const parts = ['<script>\n  const x = 1;\n</script>'];
    expect(compressStaticParts(parts)).toEqual([
      '<script>\n  const x = 1;\n</script>',
    ]);
  });

  test('preserves <style> content', () => {
    const parts = ['<style>\n  .a { color: red; }\n</style>'];
    expect(compressStaticParts(parts)).toEqual([
      '<style>\n  .a { color: red; }\n</style>',
    ]);
  });

  test('compresses before and after sensitive tag', () => {
    const parts = ['\n  <div>\n    <pre>\n  keep\n</pre>\n  </div>\n'];
    expect(compressStaticParts(parts)).toEqual([
      '<div><pre>\n  keep\n</pre></div>',
    ]);
  });

  test('handles sensitive tag spanning multiple parts', () => {
    const parts = ['<pre>', '\n  code\n', '</pre>'];
    expect(compressStaticParts(parts)).toEqual([
      '<pre>',
      '\n  code\n',
      '</pre>',
    ]);
  });

  test('handles mixed sensitive and normal content', () => {
    const parts = [
      '\n <div>\n  <style>\n.a { }\n</style>\n  <span>hi</span>\n </div>\n',
    ];
    expect(compressStaticParts(parts)).toEqual([
      '<div><style>\n.a { }\n</style><span>hi</span></div>',
    ]);
  });

  test('empty parts', () => {
    expect(compressStaticParts(['', ''])).toEqual(['', '']);
  });
});

// ---------------------------------------------------------------------------
// findTaggedTemplates
// ---------------------------------------------------------------------------

describe('findTaggedTemplates', () => {
  test('finds simple html template', () => {
    const code = 'const x = html`<div></div>`;';
    const results = findTaggedTemplates(code, new Set(['html']));
    expect(results).toHaveLength(1);
    expect(results[0].statics).toEqual([
      { start: 15, end: 26, text: '<div></div>' },
    ]);
  });

  test('finds template with interpolation', () => {
    const code = 'html`<div>${x}</div>`';
    const results = findTaggedTemplates(code, new Set(['html']));
    expect(results).toHaveLength(1);
    expect(results[0].statics).toEqual([
      { start: 5, end: 10, text: '<div>' },
      { start: 14, end: 20, text: '</div>' },
    ]);
  });

  test('finds multiple templates', () => {
    const code = 'const a = html`<div>`; const b = html`<span>`;';
    const results = findTaggedTemplates(code, new Set(['html']));
    expect(results).toHaveLength(2);
  });

  test('finds nested templates', () => {
    const code = 'html`<div>${html`<span></span>`}</div>`';
    const results = findTaggedTemplates(code, new Set(['html']));
    expect(results).toHaveLength(2);
    // Outer template
    expect(results[0].statics).toHaveLength(2);
    expect(results[0].statics[0].text).toBe('<div>');
    expect(results[0].statics[1].text).toBe('</div>');
    // Inner template
    expect(results[1].statics).toHaveLength(1);
    expect(results[1].statics[0].text).toBe('<span></span>');
  });

  test('does not match html inside strings', () => {
    const code = "const str = 'html`<div>`'; const x = html`<span>`;";
    const results = findTaggedTemplates(code, new Set(['html']));
    expect(results).toHaveLength(1);
    expect(results[0].statics[0].text).toBe('<span>');
  });

  test('does not match html inside comments', () => {
    const code = '// html`<div>`\nconst x = html`<span>`;';
    const results = findTaggedTemplates(code, new Set(['html']));
    expect(results).toHaveLength(1);
    expect(results[0].statics[0].text).toBe('<span>');
  });

  test('does not match html inside block comments', () => {
    const code = '/* html`<div>` */\nconst x = html`<span>`;';
    const results = findTaggedTemplates(code, new Set(['html']));
    expect(results).toHaveLength(1);
    expect(results[0].statics[0].text).toBe('<span>');
  });

  test('does not match property access', () => {
    const code = 'obj.html`<div>`;';
    const results = findTaggedTemplates(code, new Set(['html']));
    expect(results).toHaveLength(0);
  });

  test('does not match partial identifiers', () => {
    const code = 'myhtml`<div>`;';
    const results = findTaggedTemplates(code, new Set(['html']));
    expect(results).toHaveLength(0);
  });

  test('does not match untagged template literals', () => {
    const code = 'const x = `<div>html`;</div>`;';
    const results = findTaggedTemplates(code, new Set(['html']));
    expect(results).toHaveLength(0);
  });

  test('handles escaped backticks', () => {
    const code = 'html`<div>\\`text\\`</div>`';
    const results = findTaggedTemplates(code, new Set(['html']));
    expect(results).toHaveLength(1);
    expect(results[0].statics[0].text).toBe('<div>\\`text\\`</div>');
  });

  test('handles interpolation with nested braces', () => {
    const code = 'html`<div>${obj.method({ a: 1 })}</div>`';
    const results = findTaggedTemplates(code, new Set(['html']));
    expect(results).toHaveLength(1);
    expect(results[0].statics).toHaveLength(2);
    expect(results[0].statics[0].text).toBe('<div>');
    expect(results[0].statics[1].text).toBe('</div>');
  });

  test('handles custom tag names', () => {
    const code = 'h`<div></div>`;';
    const results = findTaggedTemplates(code, new Set(['h']));
    expect(results).toHaveLength(1);
  });

  test('handles whitespace between tag and backtick', () => {
    const code = 'html `<div></div>`';
    const results = findTaggedTemplates(code, new Set(['html']));
    expect(results).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// htmlCompress (plugin transform)
// ---------------------------------------------------------------------------

describe('htmlCompress plugin', () => {
  function transform(code: string, id = 'test.ts'): string | null {
    const plugin = htmlCompress();
    const result = (plugin.transform as Function).call(
      { environment: { name: 'client' } },
      code,
      id
    );
    return result ? (result as { code: string }).code : null;
  }

  test('compresses simple template', () => {
    const code = 'const x = html`\n  <div>\n    text\n  </div>\n`;';
    expect(transform(code)).toBe('const x = html`<div> text </div>`;');
  });

  test('compresses template with interpolation', () => {
    const code = 'const x = html`\n  <ul>\n    ${items}\n  </ul>\n`;';
    expect(transform(code)).toBe('const x = html`<ul> ${items} </ul>`;');
  });

  test('compresses nested templates', () => {
    const code =
      'html`\n <div>\n  ${html`\n    <span>\n      text\n    </span>\n  `}\n </div>\n`';
    expect(transform(code)).toBe(
      'html`<div> ${html`<span> text </span>`} </div>`'
    );
  });

  test('preserves <pre> tags', () => {
    const code = 'html`<pre>\n  line1\n  line2\n</pre>`';
    // No whitespace to compress outside <pre>, so plugin returns null
    expect(transform(code)).toBeNull();
  });

  test('returns null for non-JS files', () => {
    expect(transform('html`<div>`', 'test.css')).toBeNull();
  });

  test('returns null when no html tag', () => {
    expect(transform('const x = 1;')).toBeNull();
  });

  test('returns null when no whitespace to compress', () => {
    const code = 'html`<div></div>`';
    expect(transform(code)).toBeNull();
  });

  test('does not affect non-html tagged templates', () => {
    const code = 'css`\n  .foo {\n    color: red;\n  }\n`';
    expect(transform(code)).toBeNull();
  });

  test('handles real-world layout template', () => {
    const code = `const layout = (title, content) => html\`
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>\${title}</title>
    </head>
    <body>
      \${content}
    </body>
  </html>
\`;`;

    const result = transform(code);
    expect(result).toContain('<!DOCTYPE html><html lang="en">');
    expect(result).toContain('<head><meta charset="utf-8" /><title>');
    expect(result).toContain('</title></head><body>');
    expect(result).toContain('</body></html>');
  });

  test('handles custom tag names', () => {
    const plugin = htmlCompress({ tags: ['h'] });
    const code = 'h`\n  <div>\n  </div>\n`';
    const result = (plugin.transform as Function).call(
      { environment: { name: 'client' } },
      code,
      'test.ts'
    );
    expect((result as { code: string }).code).toBe('h`<div></div>`');
  });
});
