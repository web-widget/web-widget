import { LifecycleCache } from './cache';

describe('LifecycleCache', () => {
  interface TestStorage extends Record<string, unknown> {
    key1?: string;
    key2?: string;
    key3?: string;
    key4?: string;
    key5?: string;
  }
  let storage: LifecycleCache<TestStorage>;
  let routeState: TestStorage;

  beforeEach(() => {
    routeState = {};
    storage = new LifecycleCache<TestStorage>(routeState);
  });

  test('should set and get a value', () => {
    storage.set('key1', 'value1');
    expect(storage.get('key1')).toBe('value1');
    expect(routeState.key1).toBe('value1');
  });

  test('should return true if a key exists', () => {
    storage.set('key2', 'value2');
    expect(storage.has('key2')).toBe(true);
    expect('key2' in routeState).toBe(true);
  });

  test('should return false if a key does not exist', () => {
    expect(storage.has('key3')).toBe(false);
    expect('key3' in routeState).toBe(false);
  });

  test('should delete a key', () => {
    storage.set('key4', 'value4');
    expect(storage.delete('key4')).toBe(true);
    expect(storage.has('key4')).toBe(false);
    expect('key4' in routeState).toBe(false);
  });

  test('should return false when deleting a non-existing key', () => {
    expect(storage.delete('key5')).toBe(true);
    expect('key5' in routeState).toBe(false);
  });
});
