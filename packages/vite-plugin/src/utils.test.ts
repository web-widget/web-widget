import { init, parse } from 'es-module-lexer';
import { importsToImportNames } from './utils';

describe('importsToImportNames', () => {
  const codes: [code: string, names: [name: string, alias?: string][]][] = [
    ["import * as moduleName from 'module'", [['*', 'moduleName']]],
    // ["import moduleName from 'module'", [['default', 'moduleName']]],
    ["import { exportName } from 'module'", [['exportName']]],
    [
      "import { exportName1, exportName2 } from 'module'",
      [['exportName1'], ['exportName2']],
    ],
    ["import { exportName as alias } from 'module'", [['exportName', 'alias']]],
    // [
    //   "import defaultExport, { exportName } from 'module'",
    //   [['default', 'defaultExport'], ['exportName']],
    // ],
    // [
    //   "import defaultExport, { exportName1, exportName2 } from 'module'",
    //   [['default', 'defaultExport'], ['exportName1'], ['exportName2']],
    // ],
    // [
    //   "import defaultExport, * as moduleName from 'module'",
    //   [
    //     ['default', 'defaultExport'],
    //     ['*', 'moduleName'],
    //   ],
    // ],
    ["import 'module'", []],
  ];

  test.each(codes)('parse: %p', async (code, names) => {
    await init;
    const [imports] = parse(code);
    const result = importsToImportNames(imports, code);
    expect(result).toEqual(names);
  });
});
