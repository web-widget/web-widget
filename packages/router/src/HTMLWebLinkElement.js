/* eslint-disable no-restricted-globals */
/* global customElements, HTMLAnchorElement */
import { navigate } from './navigate.js';

const STATE = Symbol('state');

export class HTMLWebLinkElement extends HTMLAnchorElement {
  get state() {
    if (!this[STATE]) {
      const dataAttr = this.getAttribute('state');

      if (dataAttr) {
        try {
          this[STATE] = JSON.parse(dataAttr);
        } catch (error) {
          this[STATE] = {};
        }
      }
    }

    return this[STATE];
  }

  get replace() {
    return this.hasAttribute('replace');
  }

  set state(value) {
    if (typeof value === 'object') {
      this[STATE] = value;
    }
  }

  set replace(value) {
    if (value) {
      this.setAttribute('replace', '');
    } else {
      this.removeAttribute('replace');
    }
  }

  static get observedAttributes() {
    return ['state'];
  }

  connectedCallback() {
    this.addEventListener('click', event => {
      const to = this.getAttribute('href');
      navigate(to, {
        replace: this.replace,
        state: this.state
      });
      event.preventDefault();
    });
  }

  attributeChangedCallback(name) {
    if (name === 'state') {
      delete this[STATE];
    }
  }
}

customElements.define('web-link', HTMLWebLinkElement, { extends: 'a' });
