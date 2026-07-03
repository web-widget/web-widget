import { isPathInsideRoot, isPathPrefix } from './path';

describe('isPathInsideRoot', () => {
  test('accepts nested paths with mixed separators on Windows', () => {
    const root = 'C:\\project';
    const target = 'C:/project/routes/page@route.tsx';
    expect(isPathInsideRoot(root, target)).toBe(true);
  });

  test('rejects paths outside root', () => {
    expect(isPathInsideRoot('C:\\project', 'C:\\other\\page.tsx')).toBe(false);
  });
});

describe('isPathPrefix', () => {
  test('matches child paths regardless of separator style', () => {
    expect(
      isPathPrefix('C:\\project\\routes', 'C:/project/routes/page@route.tsx')
    ).toBe(true);
    expect(isPathPrefix('/project/routes', '/project/routes-extra')).toBe(
      false
    );
  });
});
