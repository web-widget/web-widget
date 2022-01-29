/* global document, customElements, HTMLElement */
export class HTMLWebRouteElement extends HTMLElement {
  get element() {
    return this.getAttribute('element');
  }

  set element(value) {
    this.setAttribute('element', value);
  }

  get path() {
    const baseElement = document.head.querySelector('base');
    const baseUrl = (baseElement && baseElement.getAttribute('href')) || '/';
    return baseUrl + this.getAttribute('path');
  }

  set path(value) {
    this.setAttribute('path', value);
  }
}

customElements.define('web-route', HTMLWebRouteElement);
