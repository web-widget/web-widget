import type { RouteMap } from '@/types';

type RoutemapEntry = {
  module: string;
  pathname?: string;
  status?: number;
};

function signatureForEntries(
  entries: RoutemapEntry[] | undefined,
  mode: 'pathname' | 'status'
): string[] {
  if (!entries?.length) {
    return [];
  }

  return entries
    .map((entry) =>
      mode === 'status'
        ? `${entry.status ?? ''}:${entry.module}`
        : `${entry.pathname ?? ''}:${entry.module}`
    )
    .sort();
}

function layoutModule(layout: RouteMap['layout']): string {
  return layout?.module ?? '';
}

/**
 * Returns true when route matching structure changes (paths, modules, layout).
 * Content-only edits to existing route files do not change the routemap JSON.
 */
export function isStructuralRoutemapChange(
  previous: RouteMap | undefined,
  next: RouteMap
): boolean {
  if (!previous) {
    return false;
  }

  if (layoutModule(previous.layout) !== layoutModule(next.layout)) {
    return true;
  }

  const sections: Array<{
    previous: RoutemapEntry[] | undefined;
    next: RoutemapEntry[] | undefined;
    mode: 'pathname' | 'status';
  }> = [
    { previous: previous.routes, next: next.routes, mode: 'pathname' },
    {
      previous: previous.middlewares,
      next: next.middlewares,
      mode: 'pathname',
    },
    { previous: previous.actions, next: next.actions, mode: 'pathname' },
    { previous: previous.fallbacks, next: next.fallbacks, mode: 'status' },
  ];

  for (const { previous: prevEntries, next: nextEntries, mode } of sections) {
    const prevSignature = signatureForEntries(prevEntries, mode).join('\0');
    const nextSignature = signatureForEntries(nextEntries, mode).join('\0');
    if (prevSignature !== nextSignature) {
      return true;
    }
  }

  return false;
}
