import { HTMLWebWidgetInspectorElement } from './element';

customElements.define('web-widget-inspector', HTMLWebWidgetInspectorElement);

declare global {
  interface HTMLElementTagNameMap {
    'web-widget-inspector': HTMLWebWidgetInspectorElement;
  }
}
