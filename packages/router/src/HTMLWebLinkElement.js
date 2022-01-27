/* eslint-disable no-restricted-globals */
/* global window, document, customElements, HTMLAnchorElement */
import { navigate } from './navigate.js';

const STATE = Symbol('state');
const ACTIVE = Symbol('active');

export class HTMLWebLinkElement extends HTMLAnchorElement {
  constructor() {
    super();
    this[ACTIVE] = this[ACTIVE].bind(this);
  }

  get state() {
    if (!this[STATE]) {
      const json = this.getAttribute('state');

      if (json) {
        try {
          this[STATE] = JSON.parse(json);
        } catch (error) {
          this[STATE] = {};
        }
      }
    }

    return this[STATE];
  }

  set state(value) {
    if (typeof value === 'object') {
      this[STATE] = value;
    }
  }

  get replace() {
    return this.hasAttribute('replace');
  }

  set replace(value) {
    if (value) {
      this.setAttribute('replace', '');
    } else {
      this.removeAttribute('replace');
    }
  }

  get active() {
    const to = this.getAttribute('href');
    const active = [...document.querySelectorAll('web-router')].some(
      router => router.match(to) === router.activeRoute
    );
    return active;
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

    window.addEventListener('navigationend', this[ACTIVE]);
    this[ACTIVE]();
  }

  disconnectedCallback() {
    window.removeEventListener('navigationend', this[ACTIVE]);
  }

  [ACTIVE]() {
    if (this.active) {
      this.setAttribute('active', '');
    } else {
      this.removeAttribute('active');
    }
  }

  attributeChangedCallback(name) {
    if (name === 'state') {
      delete this[STATE];
    }
  }
}

customElements.define('web-link', HTMLWebLinkElement, { extends: 'a' });
