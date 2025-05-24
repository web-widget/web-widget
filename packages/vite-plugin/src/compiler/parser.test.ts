import { parseImportStatement } from './parser';

describe('parseImportStatement', () => {
  const testCases: [
    description: string,
    importStatement: string,
    expected: [name: string, alias?: string][],
  ][] = [
    // Basic test cases
    ['default import', "import React from 'react'", [['default', 'React']]],
    ['named import', "import { useState } from 'react'", [['useState']]],
    [
      'multiple named imports',
      "import { useState, useEffect } from 'react'",
      [['useState'], ['useEffect']],
    ],
    [
      'named import with alias',
      "import { useState as state } from 'react'",
      [['useState', 'state']],
    ],
    [
      'mixed imports',
      "import React, { useState } from 'react'",
      [['default', 'React'], ['useState']],
    ],
    ['namespace import', "import * as React from 'react'", [['*', 'React']]],
    [
      'mixed default and namespace',
      "import React, * as ReactAll from 'react'",
      [
        ['default', 'React'],
        ['*', 'ReactAll'],
      ],
    ],

    // Edge cases
    ['empty braces', "import { } from 'module'", []],
    ['side effect import', "import 'module'", []],
    ['only spaces in braces', "import {   } from 'module'", []],

    // Complex formats
    [
      'multiline import',
      `import {
      useState,
      useEffect
    } from 'react'`,
      [['useState'], ['useEffect']],
    ],

    [
      'multiline with alias',
      `import {
      useState as state,
      useEffect as effect
    } from 'react'`,
      [
        ['useState', 'state'],
        ['useEffect', 'effect'],
      ],
    ],

    [
      'complex multiline',
      `import React, {
      useState,
      useEffect as effect
    } from 'react'`,
      [['default', 'React'], ['useState'], ['useEffect', 'effect']],
    ],

    // With comments
    [
      'with line comments',
      `import { 
      useState, // state hook
      useEffect // effect hook
    } from 'react'`,
      [['useState'], ['useEffect']],
    ],

    [
      'with block comments',
      `import { 
      useState, /* state hook */
      useEffect /* effect hook */
    } from 'react'`,
      [['useState'], ['useEffect']],
    ],

    [
      'comment before import',
      `// some comment
    import { useState } from 'react'`,
      [['useState']],
    ],

    [
      'comment in import statement',
      `import { useState /* hook */ } from 'react'`,
      [['useState']],
    ],

    // String interference
    ['string with braces', `import { test } from 'module-{name}'`, [['test']]],
    [
      'string with import keyword',
      `import { test } from 'import-module'`,
      [['test']],
    ],
    ['string with as keyword', `import { test } from 'as-module'`, [['test']]],

    // Special identifiers
    [
      'identifiers with numbers',
      "import { useState2, useEffect3 } from 'react'",
      [['useState2'], ['useEffect3']],
    ],
    [
      'identifiers with underscores',
      "import { _private, __internal } from 'module'",
      [['_private'], ['__internal']],
    ],
    [
      'identifiers with dollar signs',
      "import { $jquery, $_private } from 'module'",
      [['$jquery'], ['$_private']],
    ],

    // Complex as usage
    [
      'multiple as aliases',
      "import { a as x, b as y, c as z } from 'module'",
      [
        ['a', 'x'],
        ['b', 'y'],
        ['c', 'z'],
      ],
    ],
    [
      'default with as',
      "import { default as defaultExport } from 'module'",
      [['default', 'defaultExport']],
    ],

    // Whitespace and format variations
    [
      'extra spaces around braces',
      "import  {  useState  ,  useEffect  }  from  'react'",
      [['useState'], ['useEffect']],
    ],
    [
      'no spaces',
      "import{useState,useEffect}from'react'",
      [['useState'], ['useEffect']],
    ],
    [
      'tabs and spaces mixed',
      "import {\tuseState,\n\tuseEffect\n} from 'react'",
      [['useState'], ['useEffect']],
    ],

    // Edge cases - abnormal formats
    [
      'trailing comma',
      "import { useState, useEffect, } from 'react'",
      [['useState'], ['useEffect']],
    ],
    [
      'extra commas',
      "import { useState,, useEffect } from 'react'",
      [['useState'], ['useEffect']],
    ],

    // Complex combination
    [
      'everything combined',
      `import React, { 
      useState as state, 
      useEffect, // effect hook
      /* other hooks */
      useCallback as callback
    } from 'react'`,
      [
        ['default', 'React'],
        ['useState', 'state'],
        ['useEffect'],
        ['useCallback', 'callback'],
      ],
    ],
  ];

  test.each(testCases)('%s: %s', (description, importStatement, expected) => {
    const result = parseImportStatement(importStatement);
    expect(result).toEqual(expected);
  });
});
