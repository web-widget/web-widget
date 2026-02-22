import { extractImportBindingsLexical } from './parser-lexical';
import { importTestCases } from './__fixtures__/import-test-cases';

describe('extractImportBindingsLexical', () => {
  test.each(importTestCases)(
    '%s: %s',
    (description, importStatement, expected) => {
      const result = extractImportBindingsLexical(importStatement);
      expect(result).toEqual(expected);
    }
  );
});
