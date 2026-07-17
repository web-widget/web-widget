import {
  WEB_WIDGET_PENDING_SLOT_NAME,
  WEB_WIDGET_ROOT_LOCAL_NAME,
} from './constants';
import { WEB_WIDGET_PENDING_LOCAL_NAME } from './types';

export interface ShadowBoundary {
  container: HTMLElement;
  root: ShadowRoot;
}

function directChildren(root: ShadowRoot): Element[] {
  return Array.from(root.children);
}

/** Recover or create the stable DOM boundary passed to framework adapters. */
export function prepareShadowBoundary(
  host: HTMLElement,
  recovering: boolean
): ShadowBoundary {
  let root = host.shadowRoot;
  if (!root) {
    if (recovering) {
      throw new Error(
        'Cannot recover Shadow DOM widget: declarative ShadowRoot is missing.'
      );
    }
    root = host.attachShadow({ mode: 'open' });
  }

  const children = directChildren(root);
  const mountRoots = children.filter(
    (element) => element.localName === WEB_WIDGET_ROOT_LOCAL_NAME
  );
  if (mountRoots.length > 1) {
    throw new Error(
      'Cannot mount Shadow DOM widget: multiple internal mount roots found.'
    );
  }

  let container = mountRoots[0] as HTMLElement | undefined;
  if (!container && recovering) {
    throw new Error(
      'Cannot recover Shadow DOM widget: internal mount root is missing.'
    );
  }
  if (!container) {
    container = document.createElement(WEB_WIDGET_ROOT_LOCAL_NAME);
    container.style.display = 'contents';
    root.appendChild(container);
  }

  const pendingElements = Array.from(host.children).filter(
    (element) =>
      element.localName === WEB_WIDGET_PENDING_LOCAL_NAME &&
      element.getAttribute('slot') === WEB_WIDGET_PENDING_SLOT_NAME
  );
  const hasPendingSlot = children.some(
    (element) =>
      element.localName === 'slot' &&
      element.getAttribute('name') === WEB_WIDGET_PENDING_SLOT_NAME
  );
  if (pendingElements.length > 0 && !hasPendingSlot) {
    const pendingSlot = document.createElement('slot');
    pendingSlot.name = WEB_WIDGET_PENDING_SLOT_NAME;
    root.insertBefore(pendingSlot, container);
  }

  return { container, root };
}
