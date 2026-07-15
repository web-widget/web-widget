import { describe, expect, test } from '@jest/globals';
import { adapterScopePrefix, scopePrefix } from './adapter-scope';

describe('scopePrefix', () => {
  test('matches files under any configured directory', () => {
    const pattern = new RegExp(
      `^${scopePrefix(['src/vue2', 'src/(legacy)'], '/project')}[^?]*\\.vue$`
    );

    expect(pattern.test('/project/src/vue2/App.vue')).toBe(true);
    expect(pattern.test('/project/src/(legacy)/App.vue')).toBe(true);
    expect(pattern.test('/project/src/vue3/App.vue')).toBe(false);
    expect(pattern.test('/project/src/vue2-other/App.vue')).toBe(false);
  });

  test.each([undefined, []])(
    'does not restrict an empty scope: %p',
    (scope) => {
      expect(scopePrefix(scope, '/project')).toBe('');
    }
  );
});

describe('adapterScopePrefix', () => {
  it('uses the adapter scope when present', () => {
    const pattern = new RegExp(
      `^${adapterScopePrefix(['routes/solid'], ['routes/preact'], '/project')}[^?]*\\.tsx$`
    );

    expect(pattern.test('/project/routes/solid/page@route.tsx')).toBe(true);
    expect(pattern.test('/project/routes/preact/page@route.tsx')).toBe(false);
  });

  it('excludes scoped adapters from an unscoped fallback', () => {
    const pattern = new RegExp(
      `^${adapterScopePrefix(undefined, ['routes/solid', 'routes/preact'], '/project')}[^?]*\\.tsx$`
    );

    expect(pattern.test('/project/routes/react/page@route.tsx')).toBe(true);
    expect(pattern.test('/project/routes/solid/page@route.tsx')).toBe(false);
    expect(pattern.test('/project/routes/preact/page@route.tsx')).toBe(false);
  });
});
