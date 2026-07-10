import { describe, expect, test } from '@jest/globals';
import { createAliasGenerator, createCachedAliasGenerator } from './alias';

describe('createAliasGenerator', () => {
  test('returns unique names for every call', () => {
    const alias = createAliasGenerator();
    expect(alias('container')).toBe('__$container0$__');
    expect(alias('container')).toBe('__$container1$__');
    expect(alias('render')).toBe('__$render2$__');
  });

  test('different generators produce independent sequences', () => {
    const a = createAliasGenerator();
    const b = createAliasGenerator();
    expect(a('x')).toBe('__$x0$__');
    expect(b('x')).toBe('__$x0$__');
    expect(a('x')).toBe('__$x1$__');
  });
});

describe('createCachedAliasGenerator', () => {
  test('same input maps to same output', () => {
    const alias = createCachedAliasGenerator();
    expect(alias('default')).toBe('__$default0$__');
    expect(alias('default')).toBe('__$default0$__');
    expect(alias('render')).toBe('__$render1$__');
    expect(alias('render')).toBe('__$render1$__');
  });

  test('different generators produce independent sequences', () => {
    const a = createCachedAliasGenerator();
    const b = createCachedAliasGenerator();
    expect(a('x')).toBe('__$x0$__');
    expect(b('x')).toBe('__$x0$__');
    expect(a('y')).toBe('__$y1$__');
  });
});
