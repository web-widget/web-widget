import { describe, expect, test } from '@jest/globals';
import {
  ACTION_MODULE_PATTERN,
  ROUTE_OR_WIDGET_MARKER_AT_END_PATTERN,
  WIDGET_MODULE_PATTERN,
} from './module-conventions';

describe('module conventions', () => {
  test.each(['actions@action.ts', 'actions.action.ts'])(
    'matches action module %s',
    (file) => expect(ACTION_MODULE_PATTERN.test(file)).toBe(true)
  );

  test.each(['Counter@widget.tsx', 'Counter.widget.vue'])(
    'matches widget module %s',
    (file) => expect(WIDGET_MODULE_PATTERN.test(file)).toBe(true)
  );

  test.each(['index@route', 'Counter.widget'])(
    'matches route or widget marker %s',
    (marker) =>
      expect(ROUTE_OR_WIDGET_MARKER_AT_END_PATTERN.test(marker)).toBe(true)
  );

  test.each(['actions-action.ts', 'widget.ts', 'index@middleware'])(
    'rejects unrelated convention %s',
    (file) => {
      expect(ACTION_MODULE_PATTERN.test(file)).toBe(false);
      expect(WIDGET_MODULE_PATTERN.test(file)).toBe(false);
      expect(ROUTE_OR_WIDGET_MARKER_AT_END_PATTERN.test(file)).toBe(false);
    }
  );
});
