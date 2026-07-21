import {
  CSS_MODULE_RE,
  canonicalModuleKey,
  normalizeFilterId,
  stripModuleIdQuery,
  toManifestFilterKey,
  unwrapViteId,
} from './module-id';

describe('CSS_MODULE_RE', () => {
  test.each([
    '/src/button.module.css',
    '/src/button.module.scss?direct',
    '/src/Button.vue?vue&type=style&lang.module.less',
  ])('matches CSS Module request %p', (id) => {
    expect(CSS_MODULE_RE.test(id)).toBe(true);
  });

  test.each(['/src/button.css', '/src/button.module.ts'])(
    'does not match non-CSS Module request %p',
    (id) => {
      expect(CSS_MODULE_RE.test(id)).toBe(false);
    }
  );
});

describe('unwrapViteId', () => {
  test('strips /@id/ prefix', () => {
    expect(unwrapViteId('/@id//src/foo.ts')).toBe('/src/foo.ts');
    expect(unwrapViteId('/src/foo.ts')).toBe('/src/foo.ts');
  });
});

describe('stripModuleIdQuery', () => {
  test('removes query and hash', () => {
    expect(stripModuleIdQuery('/a.vue?t=1')).toBe('/a.vue');
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
      '/routes/react-import-widgets/ImportWidgets@widget.tsx?import',
      '/routes/react-import-widgets/ImportWidgets@widget.tsx',
    ],
    [
      '/routes/react-import-widgets/ImportWidgets@widget.tsx?t=123',
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
    [
      '/routes/(vue2)/Counter@widget.vue?vue&type=style&index=0&scoped=4029556e&lang.css&import',
      '/routes/(vue2)/Counter@widget.vue?vue&type=style&index=0&scoped=4029556e&lang.css',
    ],
  ];

  test.each(cases)('normalize id: %p', (id, expected) => {
    expect(normalizeFilterId(id)).toBe(expected);
  });
});
