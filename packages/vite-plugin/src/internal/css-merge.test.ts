import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { processCssLinks } from './css-merge';

describe('processCssLinks', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-css-merge-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  async function writeCss(
    relativePath: string,
    content: string
  ): Promise<string> {
    const filePath = path.join(tmpDir, relativePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  test('inlines CSS below threshold into styleMap', async () => {
    const cssContent = '.foo { color: red; }';
    await writeCss('assets/small.css', cssContent);

    const href = '/assets/small.css';
    const { linkMap, styleMap } = await processCssLinks({
      linkMap: {
        'routes/page.tsx': [{ rel: 'stylesheet', href }],
      },
      base: '/',
      clientOutDir: tmpDir,
      assetsDir: 'assets',
      cssConfig: { inlineStrategy: 'auto', inlineThreshold: 8192 },
    });

    expect(linkMap['routes/page.tsx']).toEqual([]);
    // lightningcss minifies; check for presence of the rule.
    expect(styleMap['routes/page.tsx']).toContain('color:red');
  });

  test('merges CSS above threshold into single external file', async () => {
    const bigCss = '.big { color: blue; }'.repeat(50);
    await writeCss('assets/big.css', bigCss);

    const href = '/assets/big.css';
    const { linkMap, styleMap } = await processCssLinks({
      linkMap: {
        'routes/page.tsx': [{ rel: 'stylesheet', href }],
      },
      base: '/',
      clientOutDir: tmpDir,
      assetsDir: 'assets',
      cssConfig: { inlineStrategy: 'auto', inlineThreshold: 100 },
    });

    // No inline style — CSS exceeded threshold.
    expect(styleMap['routes/page.tsx']).toBeUndefined();

    // Single CSS file kept as-is (no merging benefit for one file).
    expect(linkMap['routes/page.tsx']).toHaveLength(1);
    expect(linkMap['routes/page.tsx'][0].rel).toBe('stylesheet');
    expect(linkMap['routes/page.tsx'][0].href).toBe(href);
  });

  test('merges multiple CSS files into one when above threshold', async () => {
    const bigCss1 = '.a { color: red; }'.repeat(50);
    const bigCss2 = '.b { color: blue; }'.repeat(50);
    await writeCss('assets/a.css', bigCss1);
    await writeCss('assets/b.css', bigCss2);

    const { linkMap, styleMap } = await processCssLinks({
      linkMap: {
        'routes/page.tsx': [
          { rel: 'stylesheet', href: '/assets/a.css' },
          { rel: 'stylesheet', href: '/assets/b.css' },
        ],
      },
      base: '/',
      clientOutDir: tmpDir,
      assetsDir: 'assets',
      cssConfig: { inlineStrategy: 'auto', inlineThreshold: 100 },
    });

    expect(styleMap['routes/page.tsx']).toBeUndefined();

    // Both CSS files merged into one link.
    expect(linkMap['routes/page.tsx']).toHaveLength(1);
    expect(linkMap['routes/page.tsx'][0].rel).toBe('stylesheet');
    expect(linkMap['routes/page.tsx'][0].href).toMatch(
      /\/assets\/css-[0-9a-f]{8}\.css$/
    );

    // Merged file exists on disk.
    const mergedHref = linkMap['routes/page.tsx'][0].href!;
    const mergedPath = path.join(tmpDir, mergedHref.slice(1));
    const mergedContent = await fs.readFile(mergedPath, 'utf-8');
    expect(mergedContent).toContain('color:red');
    // lightningcss may shorten color values (blue → #00f).
    expect(mergedContent).toContain('.b');
  });

  test('always strategy inlines regardless of size', async () => {
    const bigCss = '.big { color: blue; }'.repeat(100);
    await writeCss('assets/big.css', bigCss);

    const { linkMap, styleMap } = await processCssLinks({
      linkMap: {
        'routes/page.tsx': [{ rel: 'stylesheet', href: '/assets/big.css' }],
      },
      base: '/',
      clientOutDir: tmpDir,
      assetsDir: 'assets',
      cssConfig: { inlineStrategy: 'always', inlineThreshold: 0 },
    });

    expect(linkMap['routes/page.tsx']).toEqual([]);
    // lightningcss reformats/optimizes; check for selector presence.
    expect(styleMap['routes/page.tsx']).toContain('.big');
  });

  test('never strategy merges multiple CSS files regardless of size', async () => {
    await writeCss('assets/a.css', '.a { color: red; }');
    await writeCss('assets/b.css', '.b { color: blue; }');

    const { linkMap, styleMap } = await processCssLinks({
      linkMap: {
        'routes/page.tsx': [
          { rel: 'stylesheet', href: '/assets/a.css' },
          { rel: 'stylesheet', href: '/assets/b.css' },
        ],
      },
      base: '/',
      clientOutDir: tmpDir,
      assetsDir: 'assets',
      cssConfig: { inlineStrategy: 'never', inlineThreshold: 999999 },
    });

    expect(styleMap['routes/page.tsx']).toBeUndefined();
    expect(linkMap['routes/page.tsx']).toHaveLength(1);
    expect(linkMap['routes/page.tsx'][0].href).toMatch(
      /\/assets\/css-[0-9a-f]{8}\.css$/
    );
  });

  test('preserves non-CSS links (modulepreload, etc.)', async () => {
    const cssContent = '.foo { color: red; }';
    await writeCss('assets/small.css', cssContent);

    const { linkMap, styleMap } = await processCssLinks({
      linkMap: {
        'routes/page.tsx': [
          { rel: 'stylesheet', href: '/assets/small.css' },
          { rel: 'modulepreload', href: '/assets/chunk.js' },
        ],
      },
      base: '/',
      clientOutDir: tmpDir,
      assetsDir: 'assets',
      cssConfig: { inlineStrategy: 'auto', inlineThreshold: 8192 },
    });

    // CSS inlined, non-CSS link preserved.
    expect(linkMap['routes/page.tsx']).toEqual([
      { rel: 'modulepreload', href: '/assets/chunk.js' },
    ]);
    // lightningcss minifies; check for presence of the rule.
    expect(styleMap['routes/page.tsx']).toContain('color:red');
  });

  test('rebases relative url() references in inlined CSS', async () => {
    const cssContent = '.bg { background: url(./image.png); }';
    await writeCss('assets/sub/style.css', cssContent);
    await writeCss('assets/sub/image.png', 'fake-png');

    const { styleMap } = await processCssLinks({
      linkMap: {
        'routes/page.tsx': [
          { rel: 'stylesheet', href: '/assets/sub/style.css' },
        ],
      },
      base: '/',
      clientOutDir: tmpDir,
      assetsDir: 'assets',
      cssConfig: { inlineStrategy: 'always', inlineThreshold: 0 },
    });

    const inlined = styleMap['routes/page.tsx']!;
    expect(inlined).toContain('/assets/sub/image.png');
    expect(inlined).not.toContain('./image.png');
  });

  test('keeps absolute url() references unchanged', async () => {
    const cssContent =
      '.a { background: url(https://example.com/img.png); } .b { background: url(/abs/path.png); } .c { background: url(data:image/png;base64,abc); }';
    await writeCss('assets/style.css', cssContent);

    const { styleMap } = await processCssLinks({
      linkMap: {
        'routes/page.tsx': [{ rel: 'stylesheet', href: '/assets/style.css' }],
      },
      base: '/',
      clientOutDir: tmpDir,
      assetsDir: 'assets',
      cssConfig: { inlineStrategy: 'always', inlineThreshold: 0 },
    });

    const inlined = styleMap['routes/page.tsx']!;
    expect(inlined).toContain('https://example.com/img.png');
    expect(inlined).toContain('/abs/path.png');
    expect(inlined).toContain('data:image/png;base64,abc');
  });

  test('handles entries with no CSS links', async () => {
    const { linkMap, styleMap } = await processCssLinks({
      linkMap: {
        'routes/page.tsx': [{ rel: 'modulepreload', href: '/assets/chunk.js' }],
      },
      base: '/',
      clientOutDir: tmpDir,
      assetsDir: 'assets',
      cssConfig: { inlineStrategy: 'auto', inlineThreshold: 8192 },
    });

    expect(linkMap['routes/page.tsx']).toEqual([
      { rel: 'modulepreload', href: '/assets/chunk.js' },
    ]);
    expect(styleMap['routes/page.tsx']).toBeUndefined();
  });

  test('skips external CSS hrefs (not in client output)', async () => {
    const { linkMap, styleMap } = await processCssLinks({
      linkMap: {
        'routes/page.tsx': [
          { rel: 'stylesheet', href: 'https://cdn.example.com/style.css' },
        ],
      },
      base: '/',
      clientOutDir: tmpDir,
      assetsDir: 'assets',
      cssConfig: { inlineStrategy: 'always', inlineThreshold: 0 },
    });

    // External link preserved, not inlined.
    expect(linkMap['routes/page.tsx']).toEqual([
      { rel: 'stylesheet', href: 'https://cdn.example.com/style.css' },
    ]);
    expect(styleMap['routes/page.tsx']).toBeUndefined();
  });
});
