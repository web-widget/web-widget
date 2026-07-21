import type { Meta } from '@web-widget/helpers';

export interface ResolvedWidgetStyle {
  id: string;
  content?: string;
  href?: string;
  integrity?: string;
  media?: string;
}

function rebaseURL(url: string, importer: string): string {
  if (/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(url) || !importer) return url;
  if (importer.startsWith('/')) {
    const placeholder = 'web-widget:';
    return new URL(url, placeholder + importer).href.replace(placeholder, '');
  }
  return new URL(url, importer).href;
}

/** Resolve stylesheet metadata into rendering-boundary descriptors. */
export function resolveWidgetStyles(
  meta: Meta | null | undefined,
  importer: string
): ResolvedWidgetStyle[] {
  const resolved: ResolvedWidgetStyle[] = [];

  let linkIndex = 0;
  for (const descriptor of meta?.link ?? []) {
    if (descriptor.rel !== 'stylesheet' || !descriptor.href) continue;
    const href = rebaseURL(descriptor.href, importer);
    const id = descriptor.id ?? `meta:link:${linkIndex++}:${href}`;
    resolved.push({
      id,
      href,
      integrity: descriptor.integrity,
      media: descriptor.media,
    });
  }

  for (const [index, descriptor] of (meta?.style ?? []).entries()) {
    const id = descriptor.id ?? `meta:inline:${index}:${importer}`;
    resolved.push({
      id,
      content: descriptor.content ?? '',
      media: descriptor.media,
    });
  }

  return resolved;
}
