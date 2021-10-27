/* global window, customElements, HTMLWebWidgetElement, URL */
/* eslint-disable max-classes-per-file */

export class HTMLWebWidgetImportElement extends HTMLWebWidgetElement {
  get as() {
    return this.getAttribute('as') || '';
  }

  set as(value) {
    this.setAttribute('as', value);
  }

  get from() {
    const value = this.getAttribute('from');
    return value === null ? '' : new URL(value, this.baseURI).href;
  }

  set from(value) {
    this.setAttribute('from', value);
  }

  connectedCallback() {
    if (!this.as || !this.from) {
      return;
    }

    const importElement = this;
    const nameMap = {
      src: 'from'
    };
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
              'src',
              'text',
              'type',
              'createDependencies',
              'createLoader',
              'createSandbox'
            ].reduce((accumulator, name) => {
              if (typeof importElement[name] !== 'undefined') {
                accumulator[name] = {
                  writable: false,
                  enumerable: false,
                  value: importElement[nameMap[name] || name] || null
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
