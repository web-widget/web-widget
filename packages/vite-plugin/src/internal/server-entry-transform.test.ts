import { describe, expect, test } from '@jest/globals';
import {
  assembleServerEntryTransform,
  buildDevServerEntryMeta,
  SERVER_ENTRY_PLACEHOLDER,
} from './server-entry-transform';

describe('server-entry-transform', () => {
  test('assembleServerEntryTransform injects manifest and dev meta', () => {
    const entry = '/project/entry.server.ts';
    const result = assembleServerEntryTransform({
      code: `console.log(${SERVER_ENTRY_PLACEHOLDER});`,
      id: entry,
      entryId: entry,
      dev: true,
      manifestCode: '__import_meta_framework__.manifest = {};',
      metaCode: buildDevServerEntryMeta(
        '__import_meta_framework__',
        'entry.client.ts'
      ),
    });

    expect(result?.code).toContain('__import_meta_framework__.manifest = {}');
    expect(result?.code).toContain('"src": "entry.client.ts"');
    expect(result?.code).not.toContain('import.meta.hot.accept');
    expect(result?.code).not.toContain(SERVER_ENTRY_PLACEHOLDER);
  });

  test('returns null for non-entry modules', () => {
    expect(
      assembleServerEntryTransform({
        code: `console.log(${SERVER_ENTRY_PLACEHOLDER});`,
        id: '/project/other.ts',
        entryId: '/project/entry.server.ts',
        dev: true,
        manifestCode: '',
        metaCode: '',
      })
    ).toBeNull();
  });
});
