import { expect, test } from '../src/integration-test';
import { integrationCases, validateCases } from '../src/cases';

test('accepts the complete case registry', () => {
  expect(() => validateCases(integrationCases)).not.toThrow();
});

test('reports a dimension value removed from the registry', () => {
  const withoutShared = integrationCases.filter(
    (entry) => entry.owner !== 'shared'
  );
  expect(() => validateCases(withoutShared)).toThrow(
    'Integration case coverage missing owner: shared'
  );
});

test('reports duplicate case ids', () => {
  expect(() =>
    validateCases([...integrationCases, integrationCases[0]])
  ).toThrow('Duplicate integration case id: C01');
});
