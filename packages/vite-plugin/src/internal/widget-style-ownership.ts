import type { WidgetRoot } from '@/types';

export type WidgetStyleOwner = 'boundary' | 'document';

/** Identify the rendering boundary that owns a widget module's styles. */
export function getWidgetStyleOwner(
  root: WidgetRoot = 'light'
): WidgetStyleOwner {
  return root === 'shadow' ? 'boundary' : 'document';
}
