import { mountLifecycleCacheLayer } from '@web-widget/lifecycle-cache/client';
import type { HTMLWebWidgetElementAttributes } from './web-widget';
import { HTMLWebWidgetElement } from './web-widget';
import { attachDeclarativeShadowRoots } from '../shadow/polyfill';
import { queueMicrotask } from '../platform/queue-microtask';

function install() {
  attachDeclarativeShadowRoots();
  Object.assign(window, {
    HTMLWebWidgetElement,
  });
  customElements.define('web-widget', HTMLWebWidgetElement);
}

mountLifecycleCacheLayer(() => {
  queueMicrotask(install);
});

declare global {
  interface Window {
    HTMLWebWidgetElement: typeof HTMLWebWidgetElement;
  }
  interface HTMLElementTagNameMap {
    'web-widget': HTMLWebWidgetElement;
  }
  namespace JSX {
    interface IntrinsicElements {
      'web-widget': HTMLWebWidgetElementAttributes;
    }
  }
}
