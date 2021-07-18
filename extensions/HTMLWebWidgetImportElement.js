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
        createConfig() {
          return Object.defineProperties(
            this,
            [
              'application',
              'csp',
              'debug',
              'sandboxed',
              'src',
              'text',
              'type',
              HTMLWebWidgetElement.PARSER
            ].reduce((accumulator, name) => {
              accumulator[name] = {
                value: importElement[name]
              };
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
