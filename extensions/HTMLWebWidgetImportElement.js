/* global window, customElements, HTMLWebWidgetElement */
/* eslint-disable max-classes-per-file */

export class HTMLWebWidgetImportElement extends HTMLWebWidgetElement {
  get as() {
    return this.getAttribute('as') || '';
  }

  set as(value) {
    this.setAttribute('as', value);
  }

  connectedCallback() {
    const importElement = this;
    customElements.define(
      this.as,
      class extends HTMLWebWidgetElement {
        constructor() {
          super();
          Object.defineProperties(
            this,
            [
              'application',
              'csp',
              'debug',
              'sandboxed',
              'src',
              'text',
              'type',
              'loader',
              HTMLWebWidgetElement.PARSER
            ].reduce((accumulator, name) => {
              if (typeof importElement[name] !== 'undefined') {
                accumulator[name] = {
                  writable: false,
                  enumerable: false,
                  value: importElement[name]
                };
              }
              return accumulator;
            }, {})
          );
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
