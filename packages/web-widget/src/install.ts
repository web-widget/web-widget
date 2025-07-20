import {
  HTMLWebWidgetElement,
  HTMLWebWidgetElementAttributes,
} from './element';
import { mountLifecycleCacheLayer } from '@web-widget/lifecycle-cache/client';

function install() {
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
