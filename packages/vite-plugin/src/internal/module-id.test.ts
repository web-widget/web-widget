import {
  canonicalModuleKey,
  normalizeFilterId,
  stripModuleIdQuery,
  toManifestFilterKey,
  unwrapViteId,
} from './module-id';

describe('unwrapViteId', () => {
  test('strips /@id/ prefix', () => {
    expect(unwrapViteId('/@id//src/foo.ts')).toBe('/src/foo.ts');
    expect(unwrapViteId('/src/foo.ts')).toBe('/src/foo.ts');
  });
});

describe('stripModuleIdQuery', () => {
  test('removes query and hash', () => {
    expect(stripModuleIdQuery('/a.vue?as=jsx&t=1')).toBe('/a.vue');
    expect(stripModuleIdQuery('/a.vue#frag')).toBe('/a.vue');
    expect(stripModuleIdQuery('/a.vue?vue&type=style')).toBe('/a.vue');
  });
});

describe('canonicalModuleKey', () => {
  test('unwraps and strips query', () => {
    expect(canonicalModuleKey('/@id//src/Bar@widget.tsx?t=1')).toBe(
      '/src/Bar@widget.tsx'
    );
  });
});

describe('toManifestFilterKey', () => {
  test('returns path relative to root', () => {
    const root = '/project';
    expect(
      toManifestFilterKey('/project/routes/Foo@widget.tsx?t=1', root)
    ).toBe('routes/Foo@widget.tsx');
  });
});

describe('normalizeFilterId', () => {
  const cases: [id: string, expected: string][] = [
    [
      '/routes/react-import-widgets/ImportWidgets@widget.tsx',
      '/routes/react-import-widgets/ImportWidgets@widget.tsx',
    ],
    [
      '/routes/react-import-widgets/ImportWidgets@widget.tsx?as=jsx',
      '/routes/react-import-widgets/ImportWidgets@widget.tsx',
    ],
    [
      '/routes/react-import-widgets/ImportWidgets@widget.tsx?t=123',
      '/routes/react-import-widgets/ImportWidgets@widget.tsx',
    ],
    [
      '/routes/react-import-widgets/ImportWidgets@widget.tsx?v=abc&t=123',
      '/routes/react-import-widgets/ImportWidgets@widget.tsx',
    ],
    [
      '/routes/react-import-widgets/ImportWidgets@widget.tsx?as=jsx&t=123',
      '/routes/react-import-widgets/ImportWidgets@widget.tsx',
    ],
    [
      '/routes/react-import-widgets/ImportWidgets@widget.tsx?import',
      '/routes/react-import-widgets/ImportWidgets@widget.tsx',
    ],
    [
      '/routes/react-import-widgets/ImportWidgets@widget.tsx?import&t=123',
      '/routes/react-import-widgets/ImportWidgets@widget.tsx',
    ],
    [
      '/routes/(vue2)/Counter@widget.vue?vue&type=style&index=0&scoped=4029556e&lang.css',
      '/routes/(vue2)/Counter@widget.vue?vue&type=style&index=0&scoped=4029556e&lang.css',
    ],
    [
      '/routes/(vue2)/Counter@widget.vue?vue&type=style&index=0&scoped=4029556e&lang.css&t=123',
      '/routes/(vue2)/Counter@widget.vue?vue&type=style&index=0&scoped=4029556e&lang.css',
    ],
  ];

  test.each(cases)('normalize id: %p', (id, expected) => {
    expect(normalizeFilterId(id)).toBe(expected);
  });
});
