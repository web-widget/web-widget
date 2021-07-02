/* global window, customElements, HTMLWebWidgetElement */

// eslint-disable-next-line max-classes-per-file
export class HTMLWebWidgetImportElement extends HTMLWebWidgetElement {
  get as() {
    return this.getAttribute('as') || '';
  }

  set as(value) {
    this.setAttribute('as', value);
  }

  connectedCallback() {
    const { as, application, csp, debug, sandboxed, src, text } = this;
    const parser = this[HTMLWebWidgetElement.PARSER];

    customElements.define(
      as,
      class extends HTMLWebWidgetElement {
        constructor() {
          super();

          this[HTMLWebWidgetElement.CONFIG] = {
            [HTMLWebWidgetElement.PARSER]: parser,
            application,
            csp,
            debug,
            sandboxed,
            src,
            text
          };
        }
      }
    );
  }

  // eslint-disable-next-line class-methods-use-this
  disconnectedCallback() {}

  // eslint-disable-next-line class-methods-use-this
  attributeChangedCallback() {}

  // eslint-disable-next-line class-methods-use-this
  adoptedCallback() {}
}

window.HTMLWebWidgetImportElement = HTMLWebWidgetImportElement;
customElements.define('web-widget.import', HTMLWebWidgetImportElement);
