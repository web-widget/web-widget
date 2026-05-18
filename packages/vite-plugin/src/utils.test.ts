import { init, parse } from 'es-module-lexer';
import { importsToImportNames, normalizeFilterId } from './utils';

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
      '/routes/(vue2)/Counter@widget.vue?vue=&type=style&index=0&scoped=4029556e&lang.css=',
    ],
    [
      '/routes/(vue2)/Counter@widget.vue?vue&type=style&index=0&scoped=4029556e&lang.css&t=123',
      '/routes/(vue2)/Counter@widget.vue?vue=&type=style&index=0&scoped=4029556e&lang.css=',
    ],
  ];

  test.each(cases)('normalize id: %p', (id, expected) => {
    expect(normalizeFilterId(id)).toBe(expected);
  });
});
