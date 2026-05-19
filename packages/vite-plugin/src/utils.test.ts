import { init, parse } from 'es-module-lexer';
import {
  canonicalModuleKey,
  importsToImportNames,
  normalizeFilterId,
  stripModuleIdQuery,
  toManifestFilterKey,
  unwrapViteId,
} from './utils';

describe('importsToImportNames', () => {
  const codes: [code: string, names: [name: string, alias?: string][]][] = [
    ["import * as moduleName from 'module'", [['*', 'moduleName']]],
    ["import moduleName from 'module'", [['default', 'moduleName']]],
    ["import { exportName } from 'module'", [['exportName']]],
    [
      "import { exportName1, exportName2 } from 'module'",
      [['exportName1'], ['exportName2']],
    ],
    ["import { exportName as alias } from 'module'", [['exportName', 'alias']]],
    [
      "import defaultExport, { exportName } from 'module'",
      [['default', 'defaultExport'], ['exportName']],
    ],
    [
      "import defaultExport, { exportName1, exportName2 } from 'module'",
      [['default', 'defaultExport'], ['exportName1'], ['exportName2']],
    ],
    [
      "import defaultExport, { exportName1, exportName2 as alias } from 'module'",
      [['default', 'defaultExport'], ['exportName1'], ['exportName2', 'alias']],
    ],
    [
      "import defaultExport, * as moduleName from 'module'",
      [
        ['default', 'defaultExport'],
        ['*', 'moduleName'],
      ],
    ],
    ["import 'module'", []],
    ["import('module')", [['*']]],
    ["import('module').then(({ default, exportName }) => {})", [['*']]],
  ];

  test.each(codes)('parse: %p', async (code, names) => {
    await init;
    const [imports] = parse(code);
    const result = importsToImportNames(imports, code);
    expect(result).toEqual(names);
  });
});

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
