import { describe, expect, test } from '@jest/globals';
import { scopePrefix } from './adapter-scope';

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
