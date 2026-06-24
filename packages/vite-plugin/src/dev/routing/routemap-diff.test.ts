import { describe, expect, it } from '@jest/globals';
import { isStructuralRoutemapChange } from './routemap-diff';
import type { RouteMap } from '@/types';

describe('isStructuralRoutemapChange', () => {
  const base: RouteMap = {
    routes: [{ module: './routes/index@route.tsx', pathname: '/' }],
    middlewares: [],
    actions: [],
    fallbacks: [],
    layout: { module: './routes/layout@layout.tsx' },
  };

  it('returns false when there is no previous routemap', () => {
    expect(isStructuralRoutemapChange(undefined, base)).toBe(false);
  });

  it('returns false for identical routemaps', () => {
    expect(isStructuralRoutemapChange(base, structuredClone(base))).toBe(false);
  });

  it('detects added routes', () => {
    const next: RouteMap = {
      ...base,
      routes: [
        ...(base.routes ?? []),
        { module: './routes/about@route.tsx', pathname: '/about' },
      ],
    };

    expect(isStructuralRoutemapChange(base, next)).toBe(true);
  });

  it('detects module path changes for the same pathname', () => {
    const next: RouteMap = {
      ...base,
      routes: [{ module: './routes/home@route.tsx', pathname: '/' }],
    };

    expect(isStructuralRoutemapChange(base, next)).toBe(true);
  });

  it('detects layout module changes', () => {
    const next: RouteMap = {
      ...base,
      layout: { module: './routes/root@layout.tsx' },
    };

    expect(isStructuralRoutemapChange(base, next)).toBe(true);
  });
});
