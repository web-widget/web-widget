export const importTestCases: [
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

  // Dynamic imports (should be ignored)
  ['dynamic import', "import('module')", []],
  ['dynamic import with await', "const module = await import('module')", []],

  // Multiple "as" keywords
  [
    'multiple as in alias',
    "import { test as as } from 'module'",
    [['test', 'as']],
  ],
  [
    'as in original name',
    "import { as as alias } from 'module'",
    [['as', 'alias']],
  ],

  // Special characters in names
  [
    'unicode identifiers',
    "import { αβγ, 测试 } from 'module'",
    [['αβγ'], ['测试']],
  ],

  // Namespace import variations
  ['namespace import only', "import * as NS from 'module'", [['*', 'NS']]],
  [
    'default and namespace mixed',
    "import Default, * as NS from 'module'",
    [
      ['default', 'Default'],
      ['*', 'NS'],
    ],
  ],

  // Extreme whitespace cases
  [
    'extreme whitespace',
    "import   {   a   as   b   ,   c   }   from   'module'",
    [['a', 'b'], ['c']],
  ],
  [
    'newlines everywhere',
    `import
    {
    a
    as
    b
    ,
    c
    }
    from
    'module'`,
    [['a', 'b'], ['c']],
  ],

  // Mixed quotes (though parser doesn't need to handle module path)
  ['single quotes', "import { test } from 'module'", [['test']]],
  ['double quotes', 'import { test } from "module"', [['test']]],

  // Complex nested as usage
  [
    'default as with named',
    "import { default as def, other } from 'module'",
    [['default', 'def'], ['other']],
  ],

  // Very long import statements
  [
    'very long import',
    "import { veryLongNamedImport as veryLongAlias, anotherVeryLongNamedImport, yetAnotherLongName as anotherLongAlias } from 'module'",
    [
      ['veryLongNamedImport', 'veryLongAlias'],
      ['anotherVeryLongNamedImport'],
      ['yetAnotherLongName', 'anotherLongAlias'],
    ],
  ],
];
