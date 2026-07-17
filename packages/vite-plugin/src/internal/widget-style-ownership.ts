import type { WidgetRenderTarget } from '@/types';

export type WidgetStyleOwner = 'boundary' | 'document';

/** Identify the rendering boundary that owns a widget module's styles. */
export function getWidgetStyleOwner(
  renderTarget: WidgetRenderTarget = 'light'
): WidgetStyleOwner {
  return renderTarget === 'shadow' ? 'boundary' : 'document';
}
