import { HTMLWebWidgetElement } from './element';
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
