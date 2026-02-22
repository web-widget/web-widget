import { extractImportBindings } from './parser';
import { extractImportBindingsLexical } from './parser-lexical';

describe('extractImportBindings vs extractImportBindingsLexical', () => {
  // Performance test
  test('Performance comparison', () => {
    const complexImport = `import React, { 
      useState as state, 
      useEffect, // effect hook
      /* other hooks */
      useCallback as callback,
      useMemo,
      useRef as ref,
      useContext
    } from 'react'`;

    const iterations = 10000;

    // Original implementation
    const start1 = performance.now();
    for (let i = 0; i < iterations; i++) {
      extractImportBindings(complexImport);
    }
    const end1 = performance.now();
    const originalTime = end1 - start1;

    // Lexical analysis implementation
    const start2 = performance.now();
    for (let i = 0; i < iterations; i++) {
      extractImportBindingsLexical(complexImport);
    }
    const end2 = performance.now();
    const lexicalTime = end2 - start2;

    console.info(
      '\x1b[32m' +
        [
          `Original implementation: ${originalTime.toFixed(2)}ms`,
          `Lexical analysis implementation: ${lexicalTime.toFixed(2)}ms`,
          `Performance comparison: ${(lexicalTime / originalTime).toFixed(2)}x`,
        ].join('\n') +
        '\x1b[0m'
    );

    // No assertion here, just output performance data
    expect(true).toBe(true);
  });
});
