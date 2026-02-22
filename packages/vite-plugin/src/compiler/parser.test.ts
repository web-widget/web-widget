import { extractImportBindings } from './parser';
import { importTestCases } from './__fixtures__/import-test-cases';

describe('extractImportBindings', () => {
  test.each(importTestCases)(
    '%s: %s',
    (description, importStatement, expected) => {
      const result = extractImportBindings(importStatement);
      expect(result).toEqual(expected);
    }
  );
});
