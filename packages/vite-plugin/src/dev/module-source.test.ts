import path from 'node:path';
import { describe, expect, test } from '@jest/globals';
import {
  DEV_MODULE_SOURCE_HEADER,
  encodeModuleSource,
  resolveModuleSourcePath,
} from './module-source';

describe('module-source', () => {
  test('encodeModuleSource converts routemap paths to canonical form', () => {
    expect(encodeModuleSource('./routes/index@route.tsx')).toBe(
      '/routes/index@route.tsx'
    );
    expect(encodeModuleSource('/routes/index@route.tsx')).toBe(
      '/routes/index@route.tsx'
    );
  });

  test('resolveModuleSourcePath resolves against project root', () => {
    expect(resolveModuleSourcePath('/routes/index@route.tsx', '/project')).toBe(
      path.resolve('/project', 'routes/index@route.tsx')
    );
  });

  test('resolveModuleSourcePath resolves against Windows project root', () => {
    expect(
      resolveModuleSourcePath('/routes/index@route.tsx', 'C:\\project')
    ).toBe(path.win32.resolve('C:\\project', 'routes/index@route.tsx'));
  });

  test('DEV_MODULE_SOURCE_HEADER is stable', () => {
    expect(DEV_MODULE_SOURCE_HEADER).toBe('x-module-source');
  });
});
