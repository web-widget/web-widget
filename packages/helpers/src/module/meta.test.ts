import type { Meta } from '@web-widget/schema';
import { mergeMeta, rebaseMeta, renderMetaToString } from './meta';

describe('mergeMeta', () => {
  test('Should return the new object', () => {
    const defaults = {
      meta: [],
    };
    const overrides = {
      meta: [],
    };
    const result = mergeMeta(defaults, overrides);
    expect(result).not.toBe(defaults);
    expect(result).not.toBe(overrides);
    expect(result.meta).not.toBe(defaults.meta);
    expect(result.meta).not.toBe(overrides.meta);
  });

  test('Should cover content', () => {
    const defaults = {
      title: 'a',
    };
    const overrides = {
      title: 'b',
    };
    const result = mergeMeta(defaults, overrides);
    expect(result).toEqual({
      title: 'b',
    });
  });

  test('Should be inserted at the end of the array', () => {
    const defaults = {
      link: [{ rel: 'a', href: '/a' }],
    };
    const overrides = {
      link: [{ rel: 'b', href: '/b' }],
    };
    const result = mergeMeta(defaults, overrides);
    expect(result).toEqual({
      link: [...defaults.link, ...overrides.link],
    });
  });

  test('should override the same meta', () => {
    const defaults = {
      meta: [
        {
          name: 'keywords',
          content: 'a, b',
        },
        {
          property: 'og:title',
          content: 'Introducing our New Site',
        },
        {
          name: 'hello',
          content: 'world',
        },
      ],
    };
    const overrides = {
      meta: [
        {
          name: 'keywords',
          content: 'c, d',
        },
        {
          property: 'og:title',
          content: 'New Site',
        },
        {
          property: 'og:url',
          content: 'http://newsblog.org/news/136756249803614',
        },
      ],
    };
    const result = mergeMeta(defaults, overrides);
    expect(result).toEqual({
      meta: [
        {
          name: 'keywords',
          content: 'c, d',
        },
        {
          property: 'og:title',
          content: 'New Site',
        },
        {
          name: 'hello',
          content: 'world',
        },
        {
          property: 'og:url',
          content: 'http://newsblog.org/news/136756249803614',
        },
      ],
    });
  });
});

describe('rebaseMeta', () => {
  test('Relative paths should be converted to absolute paths', () => {
    const meta = {
      link: [
        { href: 'a.css' },
        { href: './b.css' },
        { href: '../c.css' },
        { href: '/d.css' },
      ],
      script: [
        { src: 'a.js' },
        { src: './b.js' },
        { src: '../c.js' },
        { src: '/d.js' },
      ],
    };

    expect(rebaseMeta(meta, 'https://cdn.com/assets/')).toEqual({
      link: [
        { href: 'https://cdn.com/assets/a.css' },
        { href: 'https://cdn.com/assets/b.css' },
        { href: 'https://cdn.com/c.css' },
        { href: '/d.css' },
      ],
      script: [
        { src: 'https://cdn.com/assets/a.js' },
        { src: 'https://cdn.com/assets/b.js' },
        { src: 'https://cdn.com/c.js' },
        { src: '/d.js' },
      ],
    });

    expect(rebaseMeta(meta, '/assets/')).toEqual({
      link: [
        { href: '/assets/a.css' },
        { href: '/assets/b.css' },
        { href: '/c.css' },
        { href: '/d.css' },
      ],
      script: [
        { src: '/assets/a.js' },
        { src: '/assets/b.js' },
        { src: '/c.js' },
        { src: '/d.js' },
      ],
    });
  });
});

describe('renderMetaToString', () => {
  test('Should render meta tags', () => {
    const meta = {
      title: 'test',
      meta: [
        {
          name: 'test',
          content: 'test',
        },
        {
          [`"`]: `"`,
        },
      ],
    };
    expect(renderMetaToString(meta)).toEqual(
      `<title >test</title><meta name="test" content="test" /><meta &quot;="&quot;" />`
    );
  });

  test('Should render link tags', () => {
    const meta = {
      link: [
        {
          rel: 'stylesheet',
          href: 'a.css',
        },
        {
          rel: 'stylesheet',
          href: 'b.css',
        },
      ],
    };
    expect(renderMetaToString(meta)).toEqual(
      `<link rel="stylesheet" href="a.css" /><link rel="stylesheet" href="b.css" />`
    );
  });

  test('Should render script tags', () => {
    const meta = {
      script: [
        {
          src: 'a.js',
        },
        {
          src: 'b.js',
        },
      ],
    };
    expect(renderMetaToString(meta)).toEqual(
      `<script src="a.js"></script><script src="b.js"></script>`
    );
  });

  test('Should render style tags', () => {
    const meta = {
      style: [
        {
          content: 'a {}',
        },
        {
          content: 'b {}',
        },
      ],
    };
    expect(renderMetaToString(meta)).toEqual(
      `<style >a {}</style><style >b {}</style>`
    );
  });

  test('Should render importmap tags', () => {
    const meta = {
      script: [
        {
          type: 'importmap',
          content: '{}',
        },
      ],
    };
    expect(renderMetaToString(meta)).toEqual(
      `<script type="importmap">{}</script>`
    );
  });

  test('Should be sorted by importance', () => {
    const meta = {
      lang: 'en',
      meta: [
        {
          name: 'keywords',
          content: 'c, d',
        },
        {
          property: 'og:title',
          content: 'New Site',
        },
        {
          property: 'og:url',
          content: 'http://newsblog.org/news/136756249803614',
        },
        {
          name: 'server',
          content: '@web-widget/web-router',
        },
        {
          name: 'hello',
          content: 'world',
        },
        {
          charset: 'utf-8',
        },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1.0',
        },
      ],
      base: {
        href: 'https://google.com/',
      },
      link: [
        {
          type: 'application/json',
          href: 'https://google.com/test.json',
        },
      ],
      script: [
        {
          id: 'state:web-router',
          type: 'application/json',
          content: '{"pathname":"/meta","params":{},"body":{}}',
        },
        {
          type: 'importmap',
          content: '{}',
        },
      ],
      style: [
        {
          content: 'a {}',
        },
      ],
      title: '😄New title!',
      description: 'HTML Meta Data Example',
    };
    expect(renderMetaToString(meta)).toEqual(
      `<meta charset="utf-8" />` +
        `<meta name="viewport" content="width=device-width, initial-scale=1.0" />` +
        `<title >😄New title!</title>` +
        `<meta name="description" content="HTML Meta Data Example" />` +
        `<meta name="keywords" content="c, d" />` +
        `<meta property="og:title" content="New Site" />` +
        `<meta property="og:url" content="http://newsblog.org/news/136756249803614" />` +
        `<meta name="server" content="@web-widget/web-router" />` +
        `<meta name="hello" content="world" />` +
        `<base href="https://google.com/" />` +
        `<script type="importmap">{}</script>` +
        `<link type="application/json" href="https://google.com/test.json" />` +
        `<style >a {}</style>` +
        `<script id="state:web-router" type="application/json">{"pathname":"/meta","params":{},"body":{}}</script>`
    );
  });

  test('Content should be escaped', () => {
    const meta = {
      title: `"'&<>`,
      meta: [
        {
          name: 'test',
          content: `"'&<>`,
        },
        {
          [`"'&<>`]: `"'&<>`,
        },
      ],
    };
    expect(renderMetaToString(meta)).toEqual(
      `<title >&quot;&#39;&amp;&lt;&gt;</title><meta name="test" content="&quot;&#39;&amp;&lt;&gt;" />` +
        `<meta &quot;&#39;&amp;&lt;&gt;="&quot;&#39;&amp;&lt;&gt;" />`
    );
  });

  test('Raw text should be processed correctly', () => {
    const meta = {
      style: [
        {
          content: `/*"'&<>*/`,
        },
      ],
      script: [
        {
          content: `/*"'&<>*/`,
        },
      ],
    };
    expect(renderMetaToString(meta)).toEqual(
      `<style >/*"'&<>*/</style><script >/*"'&<>*/</script>`
    );
  });

  test('Should be able to render empty meta', () => {
    expect(renderMetaToString({})).toEqual('');
  });

  test('Rendering unknown tags should throw an exception', () => {
    expect(() => {
      renderMetaToString({
        div: {},
      } as Meta);
    }).toThrowErrorMatchingInlineSnapshot(`"Unknown tag: div"`);

    expect(() => {
      renderMetaToString({
        [`"`]: `"` as any,
      } as Meta);
    }).toThrowErrorMatchingInlineSnapshot(`"Unknown tag: ""`);
  });
});
