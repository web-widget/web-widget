import type { Meta } from '@web-widget/helpers';

export interface ResolvedWidgetStyle {
  id: string;
  content?: string;
  href?: string;
  integrity?: string;
  media?: string;
}

const devStyleRoots = new Map<string, Set<WeakRef<ShadowRoot>>>();
const devStyleRefsByRoot = new WeakMap<
  ShadowRoot,
  Map<string, WeakRef<ShadowRoot>>
>();
const observedDevStyleSources = new WeakSet<HTMLStyleElement>();
let devHeadObserver: MutationObserver | undefined;

function getBoundaryStyleElements(
  root: ShadowRoot
): Array<HTMLStyleElement | HTMLLinkElement> {
  return Array.from(root.children).filter(
    (element): element is HTMLStyleElement | HTMLLinkElement =>
      (element.localName === 'style' || element.localName === 'link') &&
      element.hasAttribute('data-web-widget-style')
  );
}

function updateRegisteredDevStyle(id: string, content: string) {
  const refs = devStyleRoots.get(id);
  if (!refs) return false;

  let updated = false;
  for (const ref of refs) {
    const root = ref.deref();
    if (!root) {
      refs.delete(ref);
      continue;
    }
    for (const element of getBoundaryStyleElements(root)) {
      if (element.localName !== 'style') continue;
      if (element.getAttribute('data-web-widget-style') === id) {
        element.textContent = content;
        updated = true;
      }
    }
  }
  if (refs.size === 0) devStyleRoots.delete(id);
  return updated;
}

function adoptDevStyleSource(source: HTMLStyleElement) {
  const id = source.getAttribute('data-vite-dev-id');
  if (!id || !devStyleRoots.has(id)) return;

  if (!observedDevStyleSources.has(source)) {
    observedDevStyleSources.add(source);
    new MutationObserver(() => {
      updateRegisteredDevStyle(id, source.textContent ?? '');
    }).observe(source, { childList: true, characterData: true, subtree: true });
  }
  updateRegisteredDevStyle(id, source.textContent ?? '');
  source.remove();
}

function ensureDevStyleObserver() {
  if (
    devHeadObserver ||
    typeof document === 'undefined' ||
    typeof MutationObserver === 'undefined'
  ) {
    return;
  }
  devHeadObserver = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (
          node instanceof HTMLStyleElement &&
          node.hasAttribute('data-vite-dev-id')
        ) {
          adoptDevStyleSource(node);
        }
      }
    }
  });
  devHeadObserver.observe(document.head, { childList: true });
}

function registerDevStyleRoot(root: ShadowRoot, ids: readonly string[]) {
  const previous = devStyleRefsByRoot.get(root) ?? new Map();
  const nextIds = new Set(ids);
  for (const [id, ref] of previous) {
    if (!nextIds.has(id)) {
      devStyleRoots.get(id)?.delete(ref);
      previous.delete(id);
    }
  }
  for (const id of nextIds) {
    if (previous.has(id)) continue;
    const ref = new WeakRef(root);
    previous.set(id, ref);
    const roots = devStyleRoots.get(id) ?? new Set();
    roots.add(ref);
    devStyleRoots.set(id, roots);
  }
  devStyleRefsByRoot.set(root, previous);
  ensureDevStyleObserver();
  for (const source of document.head.querySelectorAll<HTMLStyleElement>(
    'style[data-vite-dev-id]'
  )) {
    adoptDevStyleSource(source);
  }
}

function rebaseURL(url: string, importer: string): string {
  if (/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(url) || !importer) return url;
  if (importer.startsWith('/')) {
    const placeholder = 'web-widget:';
    return new URL(url, placeholder + importer).href.replace(placeholder, '');
  }
  return new URL(url, importer).href;
}

/**
 * Resolve the stylesheet fields in widget metadata for a rendering boundary.
 */
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

function setOptionalAttribute(
  element: Element,
  name: string,
  value: string | undefined
) {
  if (value) {
    element.setAttribute(name, value);
  } else {
    element.removeAttribute(name);
  }
}

/** Install or update widget-owned styles without replacing the ShadowRoot. */
export function installWidgetStyles(
  root: ShadowRoot,
  styles: readonly ResolvedWidgetStyle[],
  before: Node | null
) {
  const styleIds = new Set(styles.map((style) => style.id));
  const preserved = getBoundaryStyleElements(root).filter((element) => {
    const id = element.getAttribute('data-web-widget-style');
    return id !== null && !styleIds.has(id);
  });
  const insertionPoint = preserved[0] ?? before;
  const existing = new Map<string, HTMLStyleElement | HTMLLinkElement>();
  for (const element of getBoundaryStyleElements(root)) {
    const id = element.getAttribute('data-web-widget-style');
    if (id) existing.set(id, element);
  }

  for (const descriptor of styles) {
    const expectedName = descriptor.href ? 'LINK' : 'STYLE';
    let element = existing.get(descriptor.id);
    if (element?.tagName !== expectedName) {
      const replacement = descriptor.href
        ? document.createElement('link')
        : document.createElement('style');
      replacement.setAttribute('data-web-widget-style', descriptor.id);
      if (element) {
        element.replaceWith(replacement);
      } else {
        root.insertBefore(replacement, insertionPoint);
      }
      element = replacement;
    }

    if (element instanceof HTMLLinkElement) {
      element.rel = 'stylesheet';
      element.href = descriptor.href!;
      setOptionalAttribute(element, 'integrity', descriptor.integrity);
      setOptionalAttribute(element, 'media', descriptor.media);
    } else {
      // An undefined content value transfers style ownership by id only.
      // Preserve SSR CSS until the dev runtime supplies its current content.
      if (descriptor.content !== undefined) {
        element.textContent = descriptor.content;
      }
      setOptionalAttribute(element, 'media', descriptor.media);
    }
  }

  registerDevStyleRoot(
    root,
    styles.filter((style) => !style.href).map((style) => style.id)
  );
}
